// Unity-specific types for the AI assistant

declare global {
  // User Profile & Personalization
  interface UserProfile {
    // Personal Information
    name: string
    experience: 'beginner' | 'intermediate' | 'expert'
    unityVersion: string

    // Hardware Configuration
    hardware: {
      os: string
      cpu: string
      ram: string
      gpu: {
        model: string
        vram: number // in GB
      }
    }

    // Learned Code Patterns
    codeStyle: {
      namingConventions: {
        classes: string[]
        methods: string[]
        variables: string[]
        properties: string[]
      }
      formatting: {
        indentation: number
        bracesStyle: 'same-line' | 'new-line'
        usingNewlines: boolean
      }
      architecturePreferences: string[]
      commonComponents: string[]
      errorHistory: Array<{
        error: string
        solution: string
        timestamp: number
        context: string
      }>
    }

    // Unity Projects
    projects: UnityProject[]

    // Interaction Statistics
    stats: {
      totalConversations: number
      commonQueries: string[]
      preferredModel: 'gemini' | 'claude'
      feedbackScores: number[]
      averageFeedback: number
      lastUpdated: number
    }

    // Preferences
    preferences: {
      autoIndexing: boolean
      patternLearning: boolean
      codeStyleAnalysis: boolean
      hardwareOptimization: boolean
    }
  }

  // Unity Project Structure
  interface UnityProject {
    id: string
    name: string
    path: string
    type: 'multiplayer' | 'singleplayer' | 'prototype' | 'mobile' | 'vr' | 'other'
    unityVersion: string
    renderPipeline: 'URP' | 'HDRP' | 'Built-in'

    // Dependencies
    packages: UnityPackage[]
    customPatterns: string[]

    // Project Metadata
    metadata: {
      createdAt: number
      lastIndexed: number
      totalScripts: number
      totalScenes: number
      totalPrefabs: number
      linesOfCode: number
    }

    // Indexing Status
    indexingStatus: {
      isIndexed: boolean
      lastIndexedAt: number
      embeddingsCount: number
      indexingProgress: number
    }
  }

  interface UnityPackage {
    name: string
    version: string
    source: 'registry' | 'git' | 'local' | 'asset-store'
  }

  // MCP Integration Types
  interface MCPConnection {
    id: string
    type: 'unity' | 'filesystem' | 'custom'
    url: string
    status: 'connected' | 'disconnected' | 'error'
    lastPing: number
    capabilities: string[]
  }

  interface MCPTool {
    name: string
    description: string
    parameters: Record<string, any>
    connection: string // MCPConnection id
  }

  interface UnityMCPCommand {
    action: 'create' | 'read' | 'update' | 'delete' | 'execute'
    target: 'asset' | 'scene' | 'gameobject' | 'script' | 'component'
    params: Record<string, any>
  }

  // Vector Database Types
  interface VectorDocument {
    id: string
    content: string
    embedding: number[]
    metadata: VectorMetadata
  }

  interface VectorMetadata {
    projectId: string
    projectName: string
    fileType: 'script' | 'scene' | 'prefab' | 'asset' | 'documentation'
    filePath: string
    language: string
    unityVersion: string

    // Code-specific metadata
    className?: string
    namespace?: string
    methods?: string[]
    dependencies?: string[]

    // Timestamps
    createdAt: number
    updatedAt: number
    lastAccessed?: number

    // Relevance scoring
    accessCount?: number
    importance?: number
  }

  interface SemanticSearchResult {
    document: VectorDocument
    score: number
    relevance: 'high' | 'medium' | 'low'
  }

  // RAG System Types
  interface RAGContext {
    query: string
    retrievedDocuments: SemanticSearchResult[]
    conversationHistory: Message[]
    projectContext: UnityProject
    userProfile: UserProfile
    enhancedPrompt: string
  }

  // Code Analysis Types
  interface CodePattern {
    type: 'naming' | 'architecture' | 'formatting' | 'component'
    pattern: string
    frequency: number
    confidence: number
    examples: string[]
  }

  interface CodeStyleProfile {
    patterns: CodePattern[]
    lastAnalyzed: number
    fileCount: number
    confidence: number
  }

  // Machine Learning Types
  interface MLPrediction {
    type: 'error' | 'suggestion' | 'optimization'
    confidence: number
    prediction: string
    reasoning: string
    suggestions: string[]
  }

  interface TrainingData {
    input: string
    output: string
    feedback: number // -1 to 1
    timestamp: number
    context: Record<string, any>
  }

  // Unity-Specific Plugin Types
  interface UnityPlugin {
    id: string
    name: string
    description: string
    category: 'api' | 'asset-store' | 'netcode' | 'profiler' | 'shader' | 'general'
    enabled: boolean
    config: Record<string, any>
    tools: PluginTool[]
  }

  interface PluginTool {
    name: string
    description: string
    parameters: Record<string, any>
    handler: (params: any) => Promise<any>
  }

  // Settings Extensions
  interface Setting {
    // Existing settings (from original code)
    password: string
    apiKey: string
    apiProxy: string
    model: string
    sttLang: string
    ttsLang: string
    ttsVoice: string
    lang: string
    maxHistoryLength: number
    assistantIndexUrl: string
    topP: number
    topK: number
    temperature: number
    maxOutputTokens: number
    safety: string
    autoStartRecord: boolean
    autoStopRecord: boolean
    isProtected?: boolean
    talkMode?: string
    sidebarState?: string

    // New Unity-specific settings
    claudeApiKey?: string
    claudeModel?: string
    useClaudeForUnity?: boolean

    // Vector DB Settings
    pineconeApiKey?: string
    pineconeEnvironment?: string
    pineconeIndexName?: string
    useLocalVectorDB?: boolean

    // Unity Project Settings
    unityProjectPaths?: string[]
    activeProjectId?: string
    autoIndexing?: boolean

    // MCP Settings
    mcpUnityServerUrl?: string
    enableMCPIntegration?: boolean

    // Personalization Settings
    enablePatternLearning?: boolean
    enableCodeStyleAnalysis?: boolean
    userProfileName?: string

    // Hardware Settings
    gpuModel?: string
    gpuVramGB?: number
    enableHardwareOptimization?: boolean
  }

  // AI Model Types
  interface AIModel {
    id: string
    name: string
    provider: 'gemini' | 'claude'
    contextWindow: number
    maxOutput: number
    supportsVision: boolean
    supportsFunction: boolean
    bestFor: string[]
  }

  // Extended Message Type
  interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: any[]
    metadata?: {
      model?: string
      ragContext?: RAGContext
      predictions?: MLPrediction[]
      codeSnippets?: string[]
      unityReferences?: string[]
    }
    timestamp: number
  }
}

export {}
