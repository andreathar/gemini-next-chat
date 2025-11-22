/**
 * Unity API Documentation Plugin
 * Searches Unity documentation and provides API references
 */

import type { ToolDefinition } from '@/types/plugin'

const toolDefinition: ToolDefinition = {
  name: 'unityApiDocs',
  description: 'Search Unity documentation for API references, code examples, and best practices',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The Unity API or feature to search for (e.g., "Transform.Translate", "Rigidbody", "NetworkBehaviour")',
      },
      unityVersion: {
        type: 'string',
        description: 'Unity version (e.g., "6.0", "2023.2")',
        default: '6.0',
      },
    },
    required: ['query'],
  },
}

async function handler(params: { query: string; unityVersion?: string }): Promise<any> {
  const { query, unityVersion = '6.0' } = params

  try {
    // Format Unity docs URL
    const versionPath = unityVersion.includes('6') ? '6000.0' : '2023.2'
    const baseUrl = `https://docs.unity3d.com/${versionPath}/Documentation/ScriptReference`

    // Search for API reference
    const searchUrl = `https://docs.unity3d.com/ScriptReference/30_search.html?q=${encodeURIComponent(query)}`

    // Fetch Unity docs
    const response = await fetch(searchUrl)
    const html = await response.text()

    // Extract relevant information (simplified)
    const result = {
      query,
      unityVersion,
      documentation: `Unity ${unityVersion} documentation for: ${query}`,
      url: `${baseUrl}/${query.replace('.', '-')}.html`,
      codeExample: `// Unity API: ${query}\n// Check documentation at: ${baseUrl}`,
      relatedAPIs: [],
    }

    return {
      success: true,
      result,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch Unity documentation: ${error}`,
    }
  }
}

export default {
  id: 'unity-api-docs',
  ...toolDefinition,
  handler,
}
