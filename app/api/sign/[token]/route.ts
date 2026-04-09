import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPreviewUrl, isDocsGraphConfigured, uploadDocument } from '@/lib/graph-teams'
import { eventBus } from '@/lib/events'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname, basename } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const document = await prisma.starterDocument.findUnique({
      where: { signingToken: token },
      include: {
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entity: { select: { name: true, colorHex: true } },
          },
        },
        prerequisite: { select: { id: true, title: true, status: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 })
    }

    if (document.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Dit document is geannuleerd' }, { status: 410 })
    }

    let previewUrl: string | null = null
    if (isDocsGraphConfigured() && document.teamsDriveId && document.teamsItemId) {
      try {
        previewUrl = await getPreviewUrl(document.teamsDriveId, document.teamsItemId)
      } catch {
        // Preview not available
      }
    }

    return NextResponse.json({
      id: document.id,
      title: document.title,
      status: document.status,
      signingMethod: document.signingMethod,
      fileName: document.fileName,
      dueDate: document.dueDate,
      signedAt: document.signedAt,
      signedByName: document.signedByName,
      signatureFields: document.signatureFields,
      previewUrl,
      prerequisite: document.prerequisite,
      starter: document.starter
        ? {
            firstName: document.starter.firstName,
            lastName: document.starter.lastName,
            entityName: document.starter.entity?.name,
            entityColor: document.starter.entity?.colorHex,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching signing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { signerName } = body

    if (!signerName || typeof signerName !== 'string' || signerName.trim().length < 2) {
      return NextResponse.json({ error: 'Naam is verplicht (min. 2 tekens)' }, { status: 400 })
    }

    const document = await prisma.starterDocument.findUnique({
      where: { signingToken: token },
      include: {
        starter: {
          select: {
            id: true,
            entityId: true,
            firstName: true,
            lastName: true,
            startDate: true,
            entity: { select: { name: true } },
          },
        },
        prerequisite: { select: { id: true, status: true } },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 })
    }

    if (document.status === 'SIGNED') {
      return NextResponse.json({ error: 'Dit document is al ondertekend' }, { status: 400 })
    }

    if (document.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Dit document is geannuleerd' }, { status: 410 })
    }

    if (document.prerequisite && document.prerequisite.status !== 'SIGNED') {
      return NextResponse.json(
        { error: 'Een vereist document moet eerst ondertekend worden' },
        { status: 400 }
      )
    }

    if (document.signingMethod === 'QES') {
      return NextResponse.json(
        { error: 'QES ondertekening via Itsme is nog niet beschikbaar' },
        { status: 501 }
      )
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const now = new Date()
    const { signatures } = body
    const fields = (document.signatureFields as any[]) || []

    // Embed signatures into PDF if fields exist
    let signedLocalPath: string | null = null
    if (document.localFilePath && fields.length > 0 && signatures) {
      try {
        const originalPath = join(process.cwd(), 'data', document.localFilePath)
        if (existsSync(originalPath)) {
          const pdfBytes = await readFile(originalPath)
          const pdfDoc = await PDFDocument.load(pdfBytes)
          const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
          const pages = pdfDoc.getPages()

          const dateStr = now.toLocaleDateString('nl-BE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })
          const timeStr = now.toLocaleTimeString('nl-BE', {
            hour: '2-digit', minute: '2-digit',
          })

          for (const field of fields) {
            const sigDataUrl = signatures[field.id]
            if (!sigDataUrl) continue

            const page = pages[field.page - 1]
            if (!page) continue

            const { height: pageHeight } = page.getSize()

            // Embed signature image
            const base64Data = sigDataUrl.split(',')[1]
            const imgBytes = Buffer.from(base64Data, 'base64')
            const isPng = sigDataUrl.startsWith('data:image/png')
            const sigImage = isPng
              ? await pdfDoc.embedPng(imgBytes)
              : await pdfDoc.embedJpg(imgBytes)

            const sigDims = sigImage.scale(1)
            const fitWidth = field.width
            const fitHeight = field.height - 14
            const sigScale = Math.min(fitWidth / sigDims.width, fitHeight / sigDims.height)

            const pdfY = pageHeight - field.y - field.height

            page.drawImage(sigImage, {
              x: field.x + (fitWidth - sigDims.width * sigScale) / 2,
              y: pdfY + 14 + (fitHeight - sigDims.height * sigScale) / 2,
              width: sigDims.width * sigScale,
              height: sigDims.height * sigScale,
            })

            // Date + name below signature
            page.drawText(`${signerName.trim()} — ${dateStr} ${timeStr}`, {
              x: field.x + 2,
              y: pdfY + 2,
              size: 7,
              font: helvetica,
              color: rgb(0.3, 0.3, 0.3),
            })
          }

          const signedPdfBytes = await pdfDoc.save()

          // Save signed PDF locally
          const dir = dirname(join(process.cwd(), 'data', document.localFilePath))
          const origName = basename(document.localFilePath, '.pdf')
            .replace(/-signed$/, '')
          const signedFileName = `${origName}-signed.pdf`
          signedLocalPath = document.localFilePath.replace(
            basename(document.localFilePath),
            signedFileName
          )
          await mkdir(dir, { recursive: true })
          await writeFile(join(process.cwd(), 'data', signedLocalPath), signedPdfBytes)

          // Upload signed PDF to Teams
          if (isDocsGraphConfigured() && document.starter?.entity) {
            const year = document.starter.startDate
              ? new Date(document.starter.startDate).getFullYear()
              : now.getFullYear()

            try {
              const result = await uploadDocument(
                document.starter.entity.name,
                year,
                document.starter.lastName,
                document.starter.firstName,
                signedFileName,
                Buffer.from(signedPdfBytes)
              )

              await prisma.starterDocument.update({
                where: { id: document.id },
                data: { signedTeamsItemId: result.itemId },
              })
            } catch (teamsErr) {
              console.error('Failed to upload signed PDF to Teams:', teamsErr)
            }
          }
        }
      } catch (embedErr) {
        console.error('Failed to embed signatures in PDF:', embedErr)
      }
    }

    const updateData: any = {
      status: 'SIGNED',
      signedAt: now,
      signedByIp: ip,
      signedByName: signerName.trim(),
    }

    if (signedLocalPath) {
      const signedFileName = basename(signedLocalPath)
      updateData.localFilePath = signedLocalPath
      updateData.fileName = signedFileName
    }

    const updated = await prisma.starterDocument.update({
      where: { id: document.id },
      data: updateData,
    })

    if (document.taskId) {
      await prisma.task.update({
        where: { id: document.taskId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          completionNotes: `Document "${document.title}" digitaal ondertekend (SES) via signing link`,
        },
      })
    }

    if (document.starter) {
      eventBus.emit({
        type: 'task:completed',
        entityId: document.starter.entityId || '*',
        payload: {
          starterId: document.starter.id,
          documentId: document.id,
          action: 'document_signed_external',
        },
      })
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      signedAt: updated.signedAt,
      signedByName: updated.signedByName,
    })
  } catch (error) {
    console.error('Error signing document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
