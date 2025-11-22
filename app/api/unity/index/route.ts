/**
 * Unity Project Indexing API
 * Triggers indexing of Unity projects for the RAG system
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getUnityIndexer } from '@/lib/indexing/unity-indexer'
import { handleError } from '../../utils'

export const runtime = 'nodejs' // Need Node.js runtime for filesystem access
export const maxDuration = 300 // 5 minutes max

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectPath, action = 'index' } = body

    if (!projectPath) {
      return handleError('Project path is required')
    }

    const indexer = getUnityIndexer()

    if (action === 'index') {
      // Full project indexing
      console.log(`Starting indexing for project: ${projectPath}`)

      const result = await indexer.indexProject(projectPath)

      return NextResponse.json({
        success: true,
        message: 'Project indexed successfully',
        result: {
          totalFiles: result.totalFiles,
          indexed: result.indexed,
          errors: result.errors,
          projectPath,
        },
      })
    } else if (action === 'watch') {
      // Start watching for changes
      const watcherId = await indexer.watchProject(projectPath, (filePath) => {
        console.log(`File changed: ${filePath}`)
        // Optionally notify via WebSocket
      })

      return NextResponse.json({
        success: true,
        message: 'Started watching project',
        watcherId,
        projectPath,
      })
    } else if (action === 'stop-watch') {
      // Stop watching
      const { watcherId } = body

      if (!watcherId) {
        return handleError('Watch ID is required')
      }

      await indexer.stopWatching(watcherId)

      return NextResponse.json({
        success: true,
        message: 'Stopped watching project',
      })
    } else {
      return handleError(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Unity indexing error:', error)
    if (error instanceof Error) {
      return handleError(error.message)
    }
    return handleError('Unknown error occurred')
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get indexing status
    // This could check Pinecone for stats

    return NextResponse.json({
      success: true,
      message: 'Indexing API is ready',
      endpoints: {
        index: 'POST /api/unity/index with { projectPath, action: "index" }',
        watch: 'POST /api/unity/index with { projectPath, action: "watch" }',
        stopWatch: 'POST /api/unity/index with { watcherId, action: "stop-watch" }',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    if (error instanceof Error) {
      return handleError(error.message)
    }
    return handleError('Unknown error occurred')
  }
}
