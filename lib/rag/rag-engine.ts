/**
 * RAG (Retrieval-Augmented Generation) Engine
 * Enhances AI responses with relevant context from vector database
 */

import { getPineconeClient } from '../vector-db/pinecone-client'
import type { PineconeVectorDB } from '../vector-db/pinecone-client'

export class RAGEngine {
  private vectorDB: PineconeVectorDB

  constructor(vectorDB?: PineconeVectorDB) {
    this.vectorDB = vectorDB || getPineconeClient()
  }

  /**
   * Analyze query intent
   */
  private analyzeQueryIntent(query: string): {
    type: 'code-generation' | 'explanation' | 'debugging' | 'optimization' | 'general'
    keywords: string[]
    unitySpecific: boolean
  } {
    const lowerQuery = query.toLowerCase()

    // Detect query type
    let type: 'code-generation' | 'explanation' | 'debugging' | 'optimization' | 'general' = 'general'

    if (
      lowerQuery.includes('create') ||
      lowerQuery.includes('implement') ||
      lowerQuery.includes('generate') ||
      lowerQuery.includes('write')
    ) {
      type = 'code-generation'
    } else if (
      lowerQuery.includes('explain') ||
      lowerQuery.includes('what is') ||
      lowerQuery.includes('how does') ||
      lowerQuery.includes('why')
    ) {
      type = 'explanation'
    } else if (
      lowerQuery.includes('error') ||
      lowerQuery.includes('bug') ||
      lowerQuery.includes('fix') ||
      lowerQuery.includes('debug') ||
      lowerQuery.includes('not working')
    ) {
      type = 'debugging'
    } else if (
      lowerQuery.includes('optimize') ||
      lowerQuery.includes('performance') ||
      lowerQuery.includes('faster') ||
      lowerQuery.includes('improve')
    ) {
      type = 'optimization'
    }

    // Extract keywords
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'])
    const words = query.split(/\s+/)
    const keywords = words.filter((word) => !stopWords.has(word.toLowerCase()) && word.length > 2)

    // Check if Unity-specific
    const unityKeywords = [
      'unity',
      'gameobject',
      'monobehaviour',
      'transform',
      'rigidbody',
      'collider',
      'prefab',
      'scene',
      'awake',
      'start',
      'update',
      'fixedupdate',
      'networkbehaviour',
      'rpc',
      'serializefield',
    ]
    const unitySpecific = unityKeywords.some((keyword) => lowerQuery.includes(keyword))

    return {
      type,
      keywords,
      unitySpecific,
    }
  }

  /**
   * Retrieve relevant documents from vector database
   */
  private async retrieveRelevantDocs(
    query: string,
    projectContext?: UnityProject,
    options?: {
      topK?: number
      fileType?: string
    },
  ): Promise<SemanticSearchResult[]> {
    const topK = options?.topK || 5

    if (projectContext) {
      // Search within specific project
      return await this.vectorDB.searchInProject(query, projectContext.id, {
        topK,
        fileType: options?.fileType,
      })
    } else {
      // Global search
      return await this.vectorDB.search(query, {
        topK,
        filter: options?.fileType ? { fileType: options.fileType } : undefined,
      })
    }
  }

  /**
   * Build enhanced context for AI
   */
  private buildEnhancedContext(
    query: string,
    retrievedDocs: SemanticSearchResult[],
    projectContext?: UnityProject,
    userProfile?: UserProfile,
  ): string {
    let context = ''

    // Add user profile info
    if (userProfile) {
      context += `USER PROFILE:\n`
      context += `- Experience: ${userProfile.experience}\n`
      context += `- Unity Version: ${userProfile.unityVersion}\n`
      context += `- Hardware: ${userProfile.hardware.gpu.model} (${userProfile.hardware.gpu.vram}GB VRAM)\n`
      context += `- Preferred Style: ${JSON.stringify(userProfile.codeStyle.architecturePreferences)}\n\n`
    }

    // Add project context
    if (projectContext) {
      context += `PROJECT CONTEXT:\n`
      context += `- Project: ${projectContext.name}\n`
      context += `- Unity Version: ${projectContext.unityVersion}\n`
      context += `- Render Pipeline: ${projectContext.renderPipeline}\n`
      context += `- Type: ${projectContext.type}\n`
      context += `- Packages: ${projectContext.packages.map((p) => p.name).join(', ')}\n\n`
    }

    // Add retrieved relevant code
    if (retrievedDocs.length > 0) {
      context += `RELEVANT CODE FROM YOUR PROJECT:\n\n`

      retrievedDocs.forEach((result, index) => {
        const doc = result.document
        context += `[${index + 1}] ${doc.metadata.filePath} (relevance: ${result.relevance})\n`
        context += `${doc.content}\n\n`
        context += `---\n\n`
      })
    }

    return context
  }

  /**
   * Main RAG enhancement function
   */
  async enhance(params: {
    query: string
    conversationHistory?: Message[]
    projectContext?: UnityProject
    userProfile?: UserProfile
    options?: {
      topK?: number
      includeHistory?: boolean
    }
  }): Promise<RAGContext> {
    const { query, conversationHistory = [], projectContext, userProfile, options } = params

    // Analyze query
    const intent = this.analyzeQueryIntent(query)

    // Retrieve relevant documents
    const retrievedDocs = await this.retrieveRelevantDocs(query, projectContext, {
      topK: options?.topK || 5,
    })

    // Build enhanced context
    const enhancedContext = this.buildEnhancedContext(query, retrievedDocs, projectContext, userProfile)

    // Build enhanced prompt
    let enhancedPrompt = `${enhancedContext}\n`

    if (intent.unitySpecific) {
      enhancedPrompt += `This is a Unity-specific query. Provide Unity ${projectContext?.unityVersion || '6'} best practices.\n\n`
    }

    if (userProfile?.hardware) {
      enhancedPrompt += `IMPORTANT: Optimize recommendations for ${userProfile.hardware.gpu.model} with ${userProfile.hardware.gpu.vram}GB VRAM.\n\n`
    }

    enhancedPrompt += `USER QUERY:\n${query}\n\n`

    if (intent.type === 'code-generation' && userProfile?.codeStyle) {
      enhancedPrompt += `Generate code matching the user's style:\n`
      enhancedPrompt += `- Naming: ${JSON.stringify(userProfile.codeStyle.namingConventions)}\n`
      enhancedPrompt += `- Formatting: ${userProfile.codeStyle.formatting.bracesStyle} braces\n\n`
    }

    return {
      query,
      retrievedDocuments: retrievedDocs,
      conversationHistory,
      projectContext: projectContext!,
      userProfile: userProfile!,
      enhancedPrompt,
    }
  }

  /**
   * Search for similar code patterns
   */
  async findSimilarCode(
    codeSnippet: string,
    projectContext?: UnityProject,
    topK: number = 3,
  ): Promise<SemanticSearchResult[]> {
    return await this.retrieveRelevantDocs(`Find similar code: ${codeSnippet}`, projectContext, {
      topK,
      fileType: 'script',
    })
  }

  /**
   * Get documentation for Unity API
   */
  async getUnityAPIDocumentation(apiName: string): Promise<SemanticSearchResult[]> {
    return await this.vectorDB.search(`Unity API documentation for ${apiName}`, {
      topK: 3,
      filter: { fileType: 'documentation' },
    })
  }

  /**
   * Find error solutions from history
   */
  async findErrorSolution(
    errorMessage: string,
    userProfile?: UserProfile,
  ): Promise<SemanticSearchResult[]> {
    // First check user's error history
    if (userProfile?.codeStyle.errorHistory) {
      const similarError = userProfile.codeStyle.errorHistory.find((err) =>
        errorMessage.toLowerCase().includes(err.error.toLowerCase()),
      )

      if (similarError) {
        return [
          {
            document: {
              id: 'user-error-history',
              content: similarError.solution,
              embedding: [],
              metadata: {
                projectId: 'user-profile',
                projectName: 'Error History',
                fileType: 'documentation',
                filePath: 'error-history',
                language: 'text',
                unityVersion: userProfile.unityVersion,
                createdAt: similarError.timestamp,
                updatedAt: similarError.timestamp,
              },
            },
            score: 1.0,
            relevance: 'high',
          },
        ]
      }
    }

    // Search vector DB for similar errors
    return await this.vectorDB.search(`Unity error solution: ${errorMessage}`, {
      topK: 3,
      filter: { fileType: 'documentation' },
    })
  }
}

// Singleton instance
let ragEngine: RAGEngine | null = null

export const getRAGEngine = (): RAGEngine => {
  if (!ragEngine) {
    ragEngine = new RAGEngine()
  }
  return ragEngine
}
