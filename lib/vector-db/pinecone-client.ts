/**
 * Pinecone Vector Database Client
 * Handles embeddings storage and semantic search for Unity knowledge base
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { GoogleGenerativeAI } from '@xiangfa/generative-ai'

export class PineconeVectorDB {
  private pinecone: Pinecone
  private indexName: string
  private geminiClient: GoogleGenerativeAI
  private embeddingModel: string = 'text-embedding-004'

  constructor(config?: {
    apiKey?: string
    indexName?: string
    geminiApiKey?: string
  }) {
    const apiKey = config?.apiKey || process.env.PINECONE_API_KEY || ''
    const geminiApiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY || ''

    if (!apiKey) {
      throw new Error('Pinecone API key is required')
    }

    if (!geminiApiKey) {
      throw new Error('Gemini API key is required for embeddings')
    }

    this.indexName = config?.indexName || process.env.PINECONE_INDEX_NAME || 'unity-knowledge-base'
    this.pinecone = new Pinecone({ apiKey })
    this.geminiClient = new GoogleGenerativeAI(geminiApiKey)
  }

  /**
   * Generate embedding using Gemini
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.geminiClient.getGenerativeModel({ model: this.embeddingModel })
      const result = await model.embedContent(text)
      return result.embedding.values
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      throw error
    }
  }

  /**
   * Initialize Pinecone index
   */
  async initializeIndex(dimension: number = 768): Promise<void> {
    try {
      const indexes = await this.pinecone.listIndexes()
      const indexExists = indexes.indexes?.some((idx) => idx.name === this.indexName)

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`)
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        })
        console.log('✅ Pinecone index created successfully')
      } else {
        console.log('✅ Pinecone index already exists')
      }
    } catch (error) {
      console.error('Failed to initialize index:', error)
      throw error
    }
  }

  /**
   * Store document with embedding
   */
  async storeDocument(document: {
    id: string
    content: string
    metadata: VectorMetadata
  }): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(document.content)
      const index = this.pinecone.index(this.indexName)

      await index.upsert([
        {
          id: document.id,
          values: embedding,
          metadata: {
            content: document.content,
            ...document.metadata,
          } as any,
        },
      ])

      console.log(`✅ Stored document: ${document.id}`)
    } catch (error) {
      console.error('Failed to store document:', error)
      throw error
    }
  }

  /**
   * Store multiple documents in batch
   */
  async storeBatch(
    documents: Array<{
      id: string
      content: string
      metadata: VectorMetadata
    }>,
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)

      // Generate embeddings for all documents
      const vectors = await Promise.all(
        documents.map(async (doc) => {
          const embedding = await this.generateEmbedding(doc.content)
          return {
            id: doc.id,
            values: embedding,
            metadata: {
              content: doc.content,
              ...doc.metadata,
            } as any,
          }
        }),
      )

      // Upsert in batches of 100
      const batchSize = 100
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize)
        await index.upsert(batch)
        console.log(`✅ Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`)
      }
    } catch (error) {
      console.error('Failed to store batch:', error)
      throw error
    }
  }

  /**
   * Semantic search
   */
  async search(query: string, options?: {
    topK?: number
    filter?: Record<string, any>
    minScore?: number
  }): Promise<SemanticSearchResult[]> {
    try {
      const topK = options?.topK || 5
      const minScore = options?.minScore || 0.7

      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query)

      // Search Pinecone
      const index = this.pinecone.index(this.indexName)
      const results = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: options?.filter,
      })

      // Transform results
      const searchResults: SemanticSearchResult[] = results.matches
        .filter((match) => match.score && match.score >= minScore)
        .map((match) => {
          const metadata = match.metadata as any
          const score = match.score || 0

          return {
            document: {
              id: match.id,
              content: metadata.content || '',
              embedding: match.values || [],
              metadata: metadata as VectorMetadata,
            },
            score,
            relevance: score > 0.85 ? 'high' : score > 0.75 ? 'medium' : 'low',
          }
        })

      return searchResults
    } catch (error) {
      console.error('Search failed:', error)
      throw error
    }
  }

  /**
   * Search with project filter
   */
  async searchInProject(
    query: string,
    projectId: string,
    options?: {
      topK?: number
      fileType?: string
    },
  ): Promise<SemanticSearchResult[]> {
    const filter: Record<string, any> = { projectId }

    if (options?.fileType) {
      filter.fileType = options.fileType
    }

    return await this.search(query, {
      topK: options?.topK,
      filter,
    })
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      await index.deleteOne(id)
      console.log(`✅ Deleted document: ${id}`)
    } catch (error) {
      console.error('Failed to delete document:', error)
      throw error
    }
  }

  /**
   * Delete all documents for a project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      await index.deleteMany({ projectId })
      console.log(`✅ Deleted all documents for project: ${projectId}`)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{
    totalVectors: number
    dimension: number
  }> {
    try {
      const index = this.pinecone.index(this.indexName)
      const stats = await index.describeIndexStats()

      return {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || 0,
      }
    } catch (error) {
      console.error('Failed to get stats:', error)
      throw error
    }
  }

  /**
   * Update document metadata
   */
  async updateMetadata(id: string, metadata: Partial<VectorMetadata>): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)

      // Fetch existing document
      const existing = await index.fetch([id])
      const existingDoc = existing.records[id]

      if (!existingDoc) {
        throw new Error(`Document ${id} not found`)
      }

      // Update with new metadata
      await index.update({
        id,
        metadata: {
          ...existingDoc.metadata,
          ...metadata,
        } as any,
      })

      console.log(`✅ Updated metadata for: ${id}`)
    } catch (error) {
      console.error('Failed to update metadata:', error)
      throw error
    }
  }
}

// Singleton instance
let pineconeClient: PineconeVectorDB | null = null

export const getPineconeClient = (config?: {
  apiKey?: string
  indexName?: string
  geminiApiKey?: string
}): PineconeVectorDB => {
  if (!pineconeClient) {
    pineconeClient = new PineconeVectorDB(config)
  }
  return pineconeClient
}
