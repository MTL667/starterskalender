import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isPdfFileName, looksLikePdf } from '@/lib/pdf-mailer'
import { ensurePdfMailDir } from '@/lib/pdf-mail-batch-engine'
import { asUploadedPdfs, type UploadedPdfMeta } from '@/lib/pdf-mail-batch-store'

const MAX_FILES_PER_CHUNK = 10
const MAX_CHUNK_BYTES = 25 * 1024 * 1024
const MAX_FILE_BYTES = 15 * 1024 * 1024

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const batch = await prisma.pdfMailBatch.findUnique({ where: { id } })
  if (!batch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (batch.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot upload to batch in status ${batch.status}` }, { status: 409 })
  }

  const existingItems = await prisma.pdfMailBatchItem.count({ where: { batchId: id } })
  if (existingItems > 0) {
    return NextResponse.json({ error: 'Cannot upload after finalize has started' }, { status: 409 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const startIndex = Math.max(0, parseInt(String(form.get('startIndex') || '0'), 10) || 0)
  const files = form.getAll('pdfs').filter((f): f is File => f instanceof File)

  if (files.length === 0) {
    return NextResponse.json({ error: 'At least one PDF is required in the chunk' }, { status: 400 })
  }
  if (files.length > MAX_FILES_PER_CHUNK) {
    return NextResponse.json(
      { error: `Max ${MAX_FILES_PER_CHUNK} PDFs per chunk` },
      { status: 400 }
    )
  }

  const existing = asUploadedPdfs(batch.uploadedPdfs)
  if (startIndex !== existing.length) {
    return NextResponse.json(
      {
        error: `Unexpected startIndex ${startIndex}; server has ${existing.length} PDFs uploaded`,
        uploadedCount: existing.length,
      },
      { status: 409 }
    )
  }

  let chunkBytes = 0
  const validated: { fileName: string; buf: Buffer }[] = []
  for (const file of files) {
    if (!isPdfFileName(file.name)) {
      return NextResponse.json({ error: `Not a PDF: ${file.name}` }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `PDF too large (max 15MB): ${file.name}` }, { status: 400 })
    }
    chunkBytes += file.size
    if (chunkBytes > MAX_CHUNK_BYTES) {
      return NextResponse.json({ error: 'Chunk exceeds 25MB total' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    if (!looksLikePdf(buf)) {
      return NextResponse.json({ error: `Not a valid PDF file: ${file.name}` }, { status: 400 })
    }
    validated.push({ fileName: file.name, buf })
  }

  const dir = await ensurePdfMailDir(batch.id)
  const added: UploadedPdfMeta[] = []

  for (let i = 0; i < validated.length; i++) {
    const globalIndex = startIndex + i
    const file = validated[i]
    const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = path.join(dir, `${String(globalIndex).padStart(4, '0')}_${safeName}`)
    await fs.writeFile(storagePath, file.buf)
    added.push({ fileName: file.fileName, storagePath })
  }

  const uploadedPdfs = [...existing, ...added]
  await prisma.pdfMailBatch.update({
    where: { id: batch.id },
    data: { uploadedPdfs },
  })

  return NextResponse.json({
    batchId: batch.id,
    uploadedCount: uploadedPdfs.length,
    chunkCount: added.length,
    startIndex,
  })
}
