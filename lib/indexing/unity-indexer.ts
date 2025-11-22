/**
 * Unity Project Indexing Pipeline
 * Automatically indexes Unity projects for RAG system
 */

import { getFilesystemMCPClient } from '../mcp/filesystem-mcp-client'
import { getPineconeClient } from '../vector-db/pinecone-client'
import { Project } from 'ts-morph'
import * as path from 'path'
import { nanoid } from 'nanoid'

export class UnityProjectIndexer {
  private filesystemClient: ReturnType<typeof getFilesystemMCPClient>
  private vectorDB: ReturnType<typeof getPineconeClient>
  private tsProject: Project

  constructor() {
    this.filesystemClient = getFilesystemMCPClient()
    this.vectorDB = getPineconeClient()
    this.tsProject = new Project()
  }

  /**
   * Index entire Unity project
   */
  async indexProject(projectPath: string): Promise<{
    totalFiles: number
    indexed: number
    errors: number
  }> {
    console.log(`🔍 Starting indexing for project: ${projectPath}`)

    // Add allowed path for filesystem access
    this.filesystemClient.addAllowedPath(projectPath)

    // Get project info
    const projectInfo = await this.getProjectInfo(projectPath)
    console.log(`📦 Project: ${projectInfo.name}, Unity ${projectInfo.version}`)

    let totalFiles = 0
    let indexed = 0
    let errors = 0

    try {
      // Index C# scripts
      const scriptResult = await this.indexScripts(projectPath, projectInfo)
      totalFiles += scriptResult.total
      indexed += scriptResult.indexed
      errors += scriptResult.errors

      // Index scenes (metadata only)
      const sceneResult = await this.indexScenes(projectPath, projectInfo)
      totalFiles += sceneResult.total
      indexed += sceneResult.indexed
      errors += sceneResult.errors

      // Index prefabs (metadata only)
      const prefabResult = await this.indexPrefabs(projectPath, projectInfo)
      totalFiles += prefabResult.total
      indexed += prefabResult.indexed
      errors += prefabResult.errors

      console.log(`✅ Indexing complete: ${indexed}/${totalFiles} files, ${errors} errors`)

      return { totalFiles, indexed, errors }
    } catch (error) {
      console.error('❌ Indexing failed:', error)
      throw error
    }
  }

  /**
   * Get Unity project information
   */
  private async getProjectInfo(
    projectPath: string,
  ): Promise<{
    name: string
    version: string
    path: string
  }> {
    try {
      const settings = await this.filesystemClient.readProjectSettings(projectPath)
      const name = path.basename(projectPath)

      return {
        name,
        version: settings.version,
        path: projectPath,
      }
    } catch (error) {
      console.error('Failed to read project info:', error)
      return {
        name: path.basename(projectPath),
        version: 'unknown',
        path: projectPath,
      }
    }
  }

  /**
   * Index all C# scripts in project
   */
  private async indexScripts(
    projectPath: string,
    projectInfo: { name: string; version: string; path: string },
  ): Promise<{ total: number; indexed: number; errors: number }> {
    console.log('📝 Indexing C# scripts...')

    const scriptsPath = path.join(projectPath, 'Assets', 'Scripts')
    const scripts = await this.filesystemClient.getUnityScripts(scriptsPath)

    let indexed = 0
    let errors = 0

    const documents = []

    for (const script of scripts) {
      try {
        // Parse C# file to extract metadata
        const metadata = await this.parseScript(script.content, script.path)

        // Create chunks for long scripts
        const chunks = this.chunkScript(script.content)

        for (let i = 0; i < chunks.length; i++) {
          documents.push({
            id: `${nanoid()}-${path.basename(script.name)}-chunk-${i}`,
            content: chunks[i],
            metadata: {
              projectId: projectInfo.path,
              projectName: projectInfo.name,
              fileType: 'script' as const,
              filePath: script.path,
              language: 'csharp',
              unityVersion: projectInfo.version,
              className: metadata.className,
              namespace: metadata.namespace,
              methods: metadata.methods,
              dependencies: metadata.dependencies,
              createdAt: Date.now(),
              updatedAt: script.modified.getTime(),
            },
          })
        }

        indexed++
      } catch (error) {
        console.error(`Failed to index ${script.name}:`, error)
        errors++
      }
    }

    // Store in batch
    if (documents.length > 0) {
      await this.vectorDB.storeBatch(documents)
    }

    return { total: scripts.length, indexed, errors }
  }

  /**
   * Parse C# script to extract metadata
   */
  private async parseScript(
    content: string,
    filePath: string,
  ): Promise<{
    className?: string
    namespace?: string
    methods: string[]
    dependencies: string[]
  }> {
    const metadata: {
      className?: string
      namespace?: string
      methods: string[]
      dependencies: string[]
    } = {
      methods: [],
      dependencies: [],
    }

    try {
      // Extract class name
      const classMatch = content.match(/class\s+(\w+)/)
      if (classMatch) {
        metadata.className = classMatch[1]
      }

      // Extract namespace
      const namespaceMatch = content.match(/namespace\s+([\w.]+)/)
      if (namespaceMatch) {
        metadata.namespace = namespaceMatch[1]
      }

      // Extract methods
      const methodMatches = content.matchAll(/(?:public|private|protected)\s+\w+\s+(\w+)\s*\(/g)
      for (const match of methodMatches) {
        metadata.methods.push(match[1])
      }

      // Extract using statements (dependencies)
      const usingMatches = content.matchAll(/using\s+([\w.]+);/g)
      for (const match of usingMatches) {
        metadata.dependencies.push(match[1])
      }
    } catch (error) {
      console.error('Failed to parse script:', error)
    }

    return metadata
  }

  /**
   * Chunk script into smaller pieces for better retrieval
   */
  private chunkScript(content: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = []

    // Split by classes/methods
    const classSections = content.split(/(?=class\s+\w+)/)

    for (const section of classSections) {
      if (section.length <= maxChunkSize) {
        chunks.push(section.trim())
      } else {
        // Split large classes by methods
        const methodSections = section.split(/(?=(?:public|private|protected)\s+\w+\s+\w+\s*\()/)

        let currentChunk = ''
        for (const method of methodSections) {
          if ((currentChunk + method).length <= maxChunkSize) {
            currentChunk += method
          } else {
            if (currentChunk) chunks.push(currentChunk.trim())
            currentChunk = method
          }
        }
        if (currentChunk) chunks.push(currentChunk.trim())
      }
    }

    return chunks.filter((chunk) => chunk.length > 0)
  }

  /**
   * Index Unity scenes
   */
  private async indexScenes(
    projectPath: string,
    projectInfo: { name: string; version: string; path: string },
  ): Promise<{ total: number; indexed: number; errors: number }> {
    console.log('🎬 Indexing scenes...')

    const scenes = await this.filesystemClient.getUnityScenes(projectPath)

    const documents = scenes.map((scenePath) => ({
      id: `${nanoid()}-${path.basename(scenePath)}`,
      content: `Unity scene: ${path.basename(scenePath)}`,
      metadata: {
        projectId: projectInfo.path,
        projectName: projectInfo.name,
        fileType: 'scene' as const,
        filePath: scenePath,
        language: 'unity',
        unityVersion: projectInfo.version,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }))

    if (documents.length > 0) {
      await this.vectorDB.storeBatch(documents)
    }

    return { total: scenes.length, indexed: scenes.length, errors: 0 }
  }

  /**
   * Index Unity prefabs
   */
  private async indexPrefabs(
    projectPath: string,
    projectInfo: { name: string; version: string; path: string },
  ): Promise<{ total: number; indexed: number; errors: number }> {
    console.log('🎭 Indexing prefabs...')

    const prefabs = await this.filesystemClient.getUnityPrefabs(projectPath)

    const documents = prefabs.map((prefabPath) => ({
      id: `${nanoid()}-${path.basename(prefabPath)}`,
      content: `Unity prefab: ${path.basename(prefabPath)}`,
      metadata: {
        projectId: projectInfo.path,
        projectName: projectInfo.name,
        fileType: 'prefab' as const,
        filePath: prefabPath,
        language: 'unity',
        unityVersion: projectInfo.version,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }))

    if (documents.length > 0) {
      await this.vectorDB.storeBatch(documents)
    }

    return { total: prefabs.length, indexed: prefabs.length, errors: 0 }
  }

  /**
   * Watch project for changes and auto-reindex
   */
  async watchProject(projectPath: string, onChange?: (path: string) => void): Promise<string> {
    this.filesystemClient.addAllowedPath(projectPath)

    const watcherId = this.filesystemClient.watchDirectory(projectPath, async (filePath, event) => {
      console.log(`📂 File ${event}: ${filePath}`)

      if (filePath.endsWith('.cs') && event !== 'unlink') {
        // Re-index modified script
        try {
          const content = await this.filesystemClient.readFile(filePath)
          const projectInfo = await this.getProjectInfo(projectPath)
          const metadata = await this.parseScript(content, filePath)

          const chunks = this.chunkScript(content)
          const documents = chunks.map((chunk, i) => ({
            id: `${nanoid()}-${path.basename(filePath)}-chunk-${i}`,
            content: chunk,
            metadata: {
              projectId: projectInfo.path,
              projectName: projectInfo.name,
              fileType: 'script' as const,
              filePath,
              language: 'csharp',
              unityVersion: projectInfo.version,
              className: metadata.className,
              namespace: metadata.namespace,
              methods: metadata.methods,
              dependencies: metadata.dependencies,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          }))

          await this.vectorDB.storeBatch(documents)
          console.log(`✅ Re-indexed: ${filePath}`)

          if (onChange) onChange(filePath)
        } catch (error) {
          console.error(`Failed to re-index ${filePath}:`, error)
        }
      } else if (event === 'unlink') {
        // File deleted - remove from vector DB
        // Note: Need to implement deletion by filePath
        console.log(`🗑️ File deleted: ${filePath}`)
      }
    })

    return watcherId
  }

  /**
   * Stop watching project
   */
  async stopWatching(watcherId: string): Promise<void> {
    await this.filesystemClient.stopWatching(watcherId)
  }
}

// Singleton instance
let unityIndexer: UnityProjectIndexer | null = null

export const getUnityIndexer = (): UnityProjectIndexer => {
  if (!unityIndexer) {
    unityIndexer = new UnityProjectIndexer()
  }
  return unityIndexer
}
