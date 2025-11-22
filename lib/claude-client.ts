/**
 * Claude API Client
 * Handles communication with Anthropic's Claude API
 */

import Anthropic from '@anthropic-ai/sdk'

export class ClaudeClient {
  private client: Anthropic
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CLAUDE_API_KEY || ''

    if (!this.apiKey) {
      throw new Error('Claude API key is required')
    }

    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: process.env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com',
    })
  }

  /**
   * Generate a streaming response from Claude
   */
  async *streamMessage(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    model?: string
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
    tools?: any[]
  }) {
    const {
      messages,
      model = 'claude-sonnet-4-5-20250929',
      maxTokens = 8192,
      temperature = 1,
      systemPrompt,
      tools,
    } = params

    try {
      const stream = await this.client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        tools,
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              type: 'text',
              content: event.delta.text,
            }
          }
        } else if (event.type === 'message_delta') {
          if (event.delta.stop_reason) {
            yield {
              type: 'done',
              stopReason: event.delta.stop_reason,
              usage: event.usage,
            }
          }
        }
      }
    } catch (error) {
      console.error('Claude API Error:', error)
      throw error
    }
  }

  /**
   * Generate a non-streaming response from Claude
   */
  async generateMessage(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    model?: string
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
    tools?: any[]
  }) {
    const {
      messages,
      model = 'claude-sonnet-4-5-20250929',
      maxTokens = 8192,
      temperature = 1,
      systemPrompt,
      tools,
    } = params

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        tools,
      })

      return response
    } catch (error) {
      console.error('Claude API Error:', error)
      throw error
    }
  }

  /**
   * Generate embeddings for RAG (using Claude's extended thinking)
   * Note: Claude doesn't have a direct embeddings API, so we'll use text generation
   * to create semantic representations for now. In production, combine with OpenAI embeddings.
   */
  async generateEmbeddingPrompt(text: string): Promise<string> {
    const response = await this.generateMessage({
      messages: [
        {
          role: 'user',
          content: `Analyze this code and provide a semantic summary in 2-3 sentences that captures its purpose, key components, and relationships:\n\n${text}`,
        },
      ],
      model: 'claude-3-5-haiku-20241022', // Use faster model for embeddings
      maxTokens: 200,
    })

    const content = response.content[0]
    return content.type === 'text' ? content.text : ''
  }

  /**
   * Analyze Unity code with Claude's extended thinking
   */
  async analyzeUnityCode(params: {
    code: string
    context: string
    unityVersion: string
    analysisType: 'review' | 'optimization' | 'bug-detection' | 'explanation'
  }) {
    const { code, context, unityVersion, analysisType } = params

    const prompts = {
      review:
        'Review this Unity code and suggest improvements for best practices, performance, and maintainability.',
      optimization: `Analyze this Unity code for performance optimizations specific to Unity ${unityVersion}. Consider GPU usage, memory allocation, and Unity-specific optimizations.`,
      'bug-detection':
        'Identify potential bugs, null reference exceptions, and common Unity pitfalls in this code.',
      explanation:
        'Explain what this Unity code does, how it works, and how it fits into a typical Unity game architecture.',
    }

    const systemPrompt = `You are a Unity ${unityVersion} expert assistant specialized in game development.
You understand C#, Unity's architecture, component system, and best practices for game optimization.
Context: ${context}`

    return await this.generateMessage({
      messages: [
        {
          role: 'user',
          content: `${prompts[analysisType]}\n\n\`\`\`csharp\n${code}\n\`\`\``,
        },
      ],
      systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
    })
  }

  /**
   * Generate Unity-specific code with Claude
   */
  async generateUnityCode(params: {
    prompt: string
    context: string
    unityVersion: string
    userStyle?: CodeStyleProfile
    existingCode?: string
  }) {
    const { prompt, context, unityVersion, userStyle, existingCode } = params

    let systemPrompt = `You are an expert Unity ${unityVersion} game developer. Generate clean, optimized C# code following Unity best practices.`

    if (userStyle) {
      systemPrompt += `\n\nUser's Code Style Preferences:
- Naming: ${JSON.stringify(userStyle.patterns.filter((p) => p.type === 'naming').map((p) => p.pattern))}
- Architecture: ${JSON.stringify(userStyle.patterns.filter((p) => p.type === 'architecture').map((p) => p.pattern))}
Match this style in your generated code.`
    }

    systemPrompt += `\n\nProject Context: ${context}`

    const userMessage = existingCode
      ? `${prompt}\n\nExisting code to modify:\n\`\`\`csharp\n${existingCode}\n\`\`\``
      : prompt

    return await this.generateMessage({
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      temperature: 0.7,
    })
  }
}

// Export singleton instance
export const getClaudeClient = (apiKey?: string) => {
  return new ClaudeClient(apiKey)
}
