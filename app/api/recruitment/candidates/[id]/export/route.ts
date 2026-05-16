import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { generateCandidateExport } from '@/lib/recruitment/data-export'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('recruitment:read')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null },
      select: { email: true, firstName: true, vacancy: { select: { entityId: true } } },
    })

    if (!candidate) {
      return NextResponse.json({ error: { message: 'Candidate not found' } }, { status: 404 })
    }

    const entityIds = visibleEntityIds(user, 'recruitment:read')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
    }

    const exportData = await generateCandidateExport(candidateId)
    if (!exportData) {
      return NextResponse.json({ error: { message: 'Export generation failed' } }, { status: 500 })
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    await prisma.dataExportRequest.create({
      data: {
        candidateId,
        token,
        mechanism: 'admin',
        data: exportData as any,
        expiresAt,
      },
    })

    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/public/candidate/export/download?token=${token}`

    await sendEmail({
      to: candidate.email,
      subject: 'Uw gegevensexport is klaar',
      html: `
        <p>Beste ${candidate.firstName},</p>
        <p>Uw gegevensexport is klaar om te downloaden.</p>
        <p><a href="${downloadUrl}">Klik hier om uw gegevens te downloaden</a></p>
        <p>Deze link is 48 uur geldig.</p>
      `,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_DATA_EXPORTED',
      target: candidateId,
      meta: { mechanism: 'admin', exportToken: token },
    })

    return NextResponse.json({ data: { exported: true, expiresAt: expiresAt.toISOString() } })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: err.message } }, { status })
    }
    console.error('Data export error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
