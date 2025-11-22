/**
 * Filesystem MCP Client
 * Provides safe access to Unity project files for the AI assistant
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { watch, FSWatcher } from 'chokidar'

export class FilesystemMCPClient {
  private allowedPaths: Set<string> = new Set()
  private watchers: Map<string, FSWatcher> = new Map()
  private fileChangeCallbacks: Map<string, (path: string, event: string) => void> = new Map()

  constructor(allowedPaths?: string[]) {
    if (allowedPaths) {
      allowedPaths.forEach((p) => this.allowedPaths.add(path.resolve(p)))
    }
  }

  /**
   * Add allowed path for file access
   */
  addAllowedPath(dirPath: string): void {
    this.allowedPaths.add(path.resolve(dirPath))
  }

  /**
   * Check if path is allowed
   */
  private isPathAllowed(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath)

    for (const allowedPath of this.allowedPaths) {
      if (resolvedPath.startsWith(allowedPath)) {
        return true
      }
    }

    return false
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`Access denied: ${filePath} is not in allowed paths`)
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`Access denied: ${filePath} is not in allowed paths`)
    }

    try {
      await fs.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      console.error('Failed to write file:', error)
      throw error
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string, options?: { recursive?: boolean; filter?: string }): Promise<string[]> {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error(`Access denied: ${dirPath} is not in allowed paths`)
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      let files: string[] = []

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          if (options?.recursive) {
            const subFiles = await this.listDirectory(fullPath, options)
            files = files.concat(subFiles)
          }
        } else {
          if (!options?.filter || entry.name.match(options.filter)) {
            files.push(fullPath)
          }
        }
      }

      return files
    } catch (error) {
      console.error('Failed to list directory:', error)
      throw error
    }
  }

  /**
   * Find files matching pattern
   */
  async findFiles(dirPath: string, pattern: RegExp): Promise<string[]> {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error(`Access denied: ${dirPath} is not in allowed paths`)
    }

    const files = await this.listDirectory(dirPath, { recursive: true })
    return files.filter((file) => pattern.test(file))
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<{
    size: number
    created: Date
    modified: Date
    isDirectory: boolean
  }> {
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`Access denied: ${filePath} is not in allowed paths`)
    }

    try {
      const stats = await fs.stat(filePath)
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
      }
    } catch (error) {
      console.error('Failed to get file stats:', error)
      throw error
    }
  }

  /**
   * Watch directory for changes
   */
  watchDirectory(
    dirPath: string,
    callback: (path: string, event: 'add' | 'change' | 'unlink') => void,
  ): string {
    if (!this.isPathAllowed(dirPath)) {
      throw new Error(`Access denied: ${dirPath} is not in allowed paths`)
    }

    const watcherId = `watcher-${Date.now()}`

    const watcher = watch(dirPath, {
      persistent: true,
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
    })

    watcher
      .on('add', (path) => callback(path, 'add'))
      .on('change', (path) => callback(path, 'change'))
      .on('unlink', (path) => callback(path, 'unlink'))

    this.watchers.set(watcherId, watcher)
    this.fileChangeCallbacks.set(watcherId, callback)

    return watcherId
  }

  /**
   * Stop watching directory
   */
  async stopWatching(watcherId: string): Promise<void> {
    const watcher = this.watchers.get(watcherId)
    if (watcher) {
      await watcher.close()
      this.watchers.delete(watcherId)
      this.fileChangeCallbacks.delete(watcherId)
    }
  }

  /**
   * Get all Unity C# scripts in directory
   */
  async getUnityScripts(dirPath: string): Promise<
    Array<{
      path: string
      name: string
      content: string
      size: number
      modified: Date
    }>
  > {
    const scriptFiles = await this.findFiles(dirPath, /\.cs$/)

    const scripts = await Promise.all(
      scriptFiles.map(async (filePath) => {
        const content = await this.readFile(filePath)
        const stats = await this.getFileStats(filePath)

        return {
          path: filePath,
          name: path.basename(filePath),
          content,
          size: stats.size,
          modified: stats.modified,
        }
      }),
    )

    return scripts
  }

  /**
   * Get Unity scenes
   */
  async getUnityScenes(dirPath: string): Promise<string[]> {
    return await this.findFiles(dirPath, /\.unity$/)
  }

  /**
   * Get Unity prefabs
   */
  async getUnityPrefabs(dirPath: string): Promise<string[]> {
    return await this.findFiles(dirPath, /\.prefab$/)
  }

  /**
   * Read Unity project manifest
   */
  async readProjectManifest(projectPath: string): Promise<any> {
    const manifestPath = path.join(projectPath, 'Packages', 'manifest.json')

    if (!this.isPathAllowed(manifestPath)) {
      throw new Error(`Access denied: ${manifestPath} is not in allowed paths`)
    }

    try {
      const content = await this.readFile(manifestPath)
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read project manifest:', error)
      throw error
    }
  }

  /**
   * Read Unity project settings
   */
  async readProjectSettings(projectPath: string): Promise<{
    version: string
    renderPipeline?: string
  }> {
    const versionPath = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt')

    if (!this.isPathAllowed(versionPath)) {
      throw new Error(`Access denied: ${versionPath} is not in allowed paths`)
    }

    try {
      const content = await this.readFile(versionPath)
      const versionMatch = content.match(/m_EditorVersion: (.+)/)
      const version = versionMatch ? versionMatch[1].trim() : 'unknown'

      return {
        version,
      }
    } catch (error) {
      console.error('Failed to read project settings:', error)
      throw error
    }
  }

  /**
   * Clean up all watchers
   */
  async cleanup(): Promise<void> {
    for (const [watcherId] of this.watchers) {
      await this.stopWatching(watcherId)
    }
  }
}

// Singleton instance
let filesystemMCPClient: FilesystemMCPClient | null = null

export const getFilesystemMCPClient = (allowedPaths?: string[]): FilesystemMCPClient => {
  if (!filesystemMCPClient) {
    filesystemMCPClient = new FilesystemMCPClient(allowedPaths)
  }
  return filesystemMCPClient
}
