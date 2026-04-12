import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({
    hasSlack: !!process.env.SLACK_WEBHOOK_URL,
    slackStart: process.env.SLACK_WEBHOOK_URL?.substring(0, 30) || 'NOT FOUND'
  })
}