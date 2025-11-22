/**
 * Unity MCP Client
 * Connects to Unity Editor via Model Context Protocol (MCP)
 * Uses SignalR for bidirectional communication
 */

import * as signalR from '@microsoft/signalr'

export class UnityMCPClient {
  private connection: signalR.HubConnection | null = null
  private serverUrl: string
  private hubPath: string
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected'
  private callbacks: Map<string, (data: any) => void> = new Map()

  constructor(serverUrl?: string, hubPath?: string) {
    this.serverUrl = serverUrl || process.env.MCP_UNITY_SERVER_URL || 'http://localhost:8080'
    this.hubPath = hubPath || process.env.MCP_UNITY_SIGNALR_HUB || '/unity-hub'
  }

  /**
   * Initialize connection to Unity MCP server
   */
  async connect(): Promise<boolean> {
    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${this.serverUrl}${this.hubPath}`)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build()

      // Set up event handlers
      this.setupEventHandlers()

      // Start connection
      await this.connection.start()
      this.connectionStatus = 'connected'
      console.log('✅ Connected to Unity MCP Server')

      return true
    } catch (error) {
      console.error('❌ Failed to connect to Unity MCP Server:', error)
      this.connectionStatus = 'error'
      return false
    }
  }

  /**
   * Disconnect from Unity MCP server
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop()
      this.connectionStatus = 'disconnected'
      console.log('Disconnected from Unity MCP Server')
    }
  }

  /**
   * Setup event handlers for Unity events
   */
  private setupEventHandlers(): void {
    if (!this.connection) return

    // Handle Unity Editor events
    this.connection.on('UnityEvent', (eventData) => {
      console.log('Unity Event:', eventData)
      const callback = this.callbacks.get('UnityEvent')
      if (callback) callback(eventData)
    })

    // Handle scene changes
    this.connection.on('SceneChanged', (sceneData) => {
      console.log('Scene Changed:', sceneData)
      const callback = this.callbacks.get('SceneChanged')
      if (callback) callback(sceneData)
    })

    // Handle asset changes
    this.connection.on('AssetModified', (assetData) => {
      console.log('Asset Modified:', assetData)
      const callback = this.callbacks.get('AssetModified')
      if (callback) callback(assetData)
    })

    // Handle reconnection
    this.connection.onreconnecting(() => {
      console.log('Reconnecting to Unity MCP Server...')
      this.connectionStatus = 'disconnected'
    })

    this.connection.onreconnected(() => {
      console.log('Reconnected to Unity MCP Server')
      this.connectionStatus = 'connected'
    })

    this.connection.onclose(() => {
      console.log('Connection to Unity MCP Server closed')
      this.connectionStatus = 'disconnected'
    })
  }

  /**
   * Register callback for Unity events
   */
  on(event: string, callback: (data: any) => void): void {
    this.callbacks.set(event, callback)
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'disconnected' | 'error' {
    return this.connectionStatus
  }

  /**
   * Execute Unity MCP command
   */
  async executeCommand(command: UnityMCPCommand): Promise<any> {
    if (!this.connection || this.connectionStatus !== 'connected') {
      throw new Error('Not connected to Unity MCP Server')
    }

    try {
      const result = await this.connection.invoke('ExecuteCommand', command)
      return result
    } catch (error) {
      console.error('Failed to execute Unity command:', error)
      throw error
    }
  }

  // ===== UNITY-SPECIFIC METHODS =====

  /**
   * Create a new GameObject in the active scene
   */
  async createGameObject(params: {
    name: string
    parent?: string
    components?: string[]
  }): Promise<any> {
    return await this.executeCommand({
      action: 'create',
      target: 'gameobject',
      params,
    })
  }

  /**
   * Get scene hierarchy
   */
  async getSceneHierarchy(): Promise<any> {
    return await this.executeCommand({
      action: 'read',
      target: 'scene',
      params: { includeHierarchy: true },
    })
  }

  /**
   * Create a new C# script
   */
  async createScript(params: {
    name: string
    path: string
    template?: 'MonoBehaviour' | 'ScriptableObject' | 'NetworkBehaviour' | 'Custom'
    content?: string
  }): Promise<any> {
    return await this.executeCommand({
      action: 'create',
      target: 'script',
      params,
    })
  }

  /**
   * Read script content
   */
  async readScript(path: string): Promise<string> {
    const result = await this.executeCommand({
      action: 'read',
      target: 'script',
      params: { path },
    })
    return result.content
  }

  /**
   * Update script content
   */
  async updateScript(path: string, content: string): Promise<any> {
    return await this.executeCommand({
      action: 'update',
      target: 'script',
      params: { path, content },
    })
  }

  /**
   * Get project information
   */
  async getProjectInfo(): Promise<{
    name: string
    path: string
    unityVersion: string
    renderPipeline: string
    packages: any[]
  }> {
    return await this.executeCommand({
      action: 'read',
      target: 'asset',
      params: { type: 'project-info' },
    })
  }

  /**
   * Import asset
   */
  async importAsset(params: { path: string; type: string }): Promise<any> {
    return await this.executeCommand({
      action: 'create',
      target: 'asset',
      params,
    })
  }

  /**
   * Get list of all scripts in project
   */
  async listScripts(directory?: string): Promise<string[]> {
    const result = await this.executeCommand({
      action: 'read',
      target: 'asset',
      params: { type: 'scripts', directory },
    })
    return result.scripts
  }

  /**
   * Get list of all scenes
   */
  async listScenes(): Promise<string[]> {
    const result = await this.executeCommand({
      action: 'read',
      target: 'asset',
      params: { type: 'scenes' },
    })
    return result.scenes
  }

  /**
   * Capture screenshot from Scene view
   */
  async captureSceneView(): Promise<string> {
    const result = await this.executeCommand({
      action: 'execute',
      target: 'scene',
      params: { action: 'capture-screenshot' },
    })
    return result.screenshot // Base64 encoded image
  }

  /**
   * Get GameObject details
   */
  async getGameObject(name: string): Promise<any> {
    return await this.executeCommand({
      action: 'read',
      target: 'gameobject',
      params: { name },
    })
  }

  /**
   * Add component to GameObject
   */
  async addComponent(params: { gameObjectName: string; componentType: string }): Promise<any> {
    return await this.executeCommand({
      action: 'create',
      target: 'component',
      params,
    })
  }

  /**
   * Execute Unity Editor menu command
   */
  async executeMenuCommand(menuPath: string): Promise<any> {
    return await this.executeCommand({
      action: 'execute',
      target: 'scene',
      params: { menuCommand: menuPath },
    })
  }

  /**
   * Get Unity Editor state
   */
  async getEditorState(): Promise<{
    isPlaying: boolean
    isPaused: boolean
    activeScene: string
    selectedObjects: string[]
  }> {
    return await this.executeCommand({
      action: 'read',
      target: 'scene',
      params: { type: 'editor-state' },
    })
  }
}

// Singleton instance
let unityMCPClient: UnityMCPClient | null = null

export const getUnityMCPClient = (serverUrl?: string, hubPath?: string): UnityMCPClient => {
  if (!unityMCPClient) {
    unityMCPClient = new UnityMCPClient(serverUrl, hubPath)
  }
  return unityMCPClient
}
