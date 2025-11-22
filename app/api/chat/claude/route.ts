/**
 * Claude Chat API Route
 * Handles streaming responses from Claude API
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getClaudeClient } from '@/lib/claude-client'
import { handleError } from '../../utils'

export const runtime = 'edge'
export const preferredRegion = ['cle1', 'iad1', 'pdx1', 'sfo1', 'sin1', 'syd1', 'hnd1', 'kix1']

const claudeApiKey = process.env.CLAUDE_API_KEY as string

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      messages,
      model = 'claude-sonnet-4-5-20250929',
      maxTokens = 8192,
      temperature = 1,
      systemPrompt,
      tools,
      stream = true,
    } = body

    // Get API key from environment or request
    const apiKey = claudeApiKey || body.apiKey

    if (!apiKey) {
      return handleError('Claude API key is required')
    }

    const client = getClaudeClient(apiKey)

    if (stream) {
      // Create a readable stream for SSE
      const encoder = new TextEncoder()
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of client.streamMessage({
              messages,
              model,
              maxTokens,
              temperature,
              systemPrompt,
              tools,
            })) {
              // Send SSE formatted data
              const data = `data: ${JSON.stringify(chunk)}\n\n`
              controller.enqueue(encoder.encode(data))
            }

            // Send done signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.error(error)
          }
        },
      })

      return new NextResponse(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } else {
      // Non-streaming response
      const response = await client.generateMessage({
        messages,
        model,
        maxTokens,
        temperature,
        systemPrompt,
        tools,
      })

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Claude API Error:', error)
    if (error instanceof Error) {
      return handleError(error.message)
    }
    return handleError('Unknown error occurred')
  }
}
