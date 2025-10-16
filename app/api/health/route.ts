import { NextResponse } from 'next/server'

// Basic health check endpoint - altijd OK (voor Easypanel)
// Voor gedetailleerde check, gebruik /api/health/ready
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'App is running'
  })
}

