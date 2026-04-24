import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  user_id?: string
  chat_id?: string
  access_token?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: body.messages,
        user_id: body.user_id,
        chat_id: body.chat_id,
        access_token: body.access_token,
      }),
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      response: data.response || '',
      chat_id: data.chat_id || null, // Return the chat_id from the backend
      recommendations: data.recommendations || null,
      analysis: data.analysis || null,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        response:
          'I apologize for the technical difficulty. Please ensure the backend server is running.',
      },
      { status: 500 }
    )
  }
}