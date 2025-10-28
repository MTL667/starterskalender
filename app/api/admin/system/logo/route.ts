import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

// POST /api/admin/system/logo - Upload logo
export async function POST(request: Request) {
  try {
    const user = await requireAdmin()

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPG, SVG, WebP' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max 2MB' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate filename with timestamp to avoid cache issues
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `logo-${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Save logo URL to database
    const logoUrl = `/uploads/${filename}`
    await prisma.systemSettings.upsert({
      where: { key: 'logo_url' },
      update: {
        value: logoUrl,
        updatedBy: user.id,
      },
      create: {
        key: 'logo_url',
        value: logoUrl,
        updatedBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      logoUrl,
    })
  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/system/logo - Remove logo
export async function DELETE() {
  try {
    await requireAdmin()

    // Remove logo URL from database
    await prisma.systemSettings.update({
      where: { key: 'logo_url' },
      data: {
        value: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing logo:', error)
    return NextResponse.json(
      { error: 'Failed to remove logo' },
      { status: 500 }
    )
  }
}

