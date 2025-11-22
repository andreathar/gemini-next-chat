/**
 * Code Style Analyzer
 * Learns user's coding patterns and style preferences using ML
 */

import { getFilesystemMCPClient } from '../mcp/filesystem-mcp-client'

export class CodeStyleAnalyzer {
  private filesystemClient: ReturnType<typeof getFilesystemMCPClient>

  constructor() {
    this.filesystemClient = getFilesystemMCPClient()
  }

  /**
   * Analyze all scripts in a Unity project to learn coding patterns
   */
  async analyzeProject(projectPath: string): Promise<CodeStyleProfile> {
    console.log(`🔍 Analyzing code style for project: ${projectPath}`)

    this.filesystemClient.addAllowedPath(projectPath)

    const scriptsPath = `${projectPath}/Assets/Scripts`
    const scripts = await this.filesystemClient.getUnityScripts(scriptsPath)

    const patterns: CodePattern[] = []

    // Analyze naming conventions
    const namingPatterns = this.analyzeNaming(scripts.map((s) => s.content))
    patterns.push(...namingPatterns)

    // Analyze formatting
    const formattingPatterns = this.analyzeFormatting(scripts.map((s) => s.content))
    patterns.push(...formattingPatterns)

    // Analyze architecture patterns
    const architecturePatterns = this.analyzeArchitecture(scripts.map((s) => s.content))
    patterns.push(...architecturePatterns)

    // Analyze component usage
    const componentPatterns = this.analyzeComponents(scripts.map((s) => s.content))
    patterns.push(...componentPatterns)

    const profile: CodeStyleProfile = {
      patterns,
      lastAnalyzed: Date.now(),
      fileCount: scripts.length,
      confidence: this.calculateConfidence(patterns, scripts.length),
    }

    console.log(`✅ Analysis complete: ${patterns.length} patterns detected`)

    return profile
  }

  /**
   * Analyze naming conventions
   */
  private analyzeNaming(scripts: string[]): CodePattern[] {
    const patterns: CodePattern[] = []

    // Class naming
    const classNames: string[] = []
    scripts.forEach((script) => {
      const matches = script.matchAll(/class\s+(\w+)/g)
      for (const match of matches) {
        classNames.push(match[1])
      }
    })

    if (classNames.length > 0) {
      // Detect PascalCase, camelCase, etc.
      const pascalCase = classNames.filter((name) => /^[A-Z][a-zA-Z0-9]*$/.test(name)).length
      const percentPascal = (pascalCase / classNames.length) * 100

      if (percentPascal > 80) {
        patterns.push({
          type: 'naming',
          pattern: 'PascalCase for classes',
          frequency: pascalCase,
          confidence: percentPascal / 100,
          examples: classNames.slice(0, 3),
        })
      }
    }

    // Method naming
    const methodNames: string[] = []
    scripts.forEach((script) => {
      const matches = script.matchAll(/(?:public|private|protected)\s+\w+\s+(\w+)\s*\(/g)
      for (const match of matches) {
        methodNames.push(match[1])
      }
    })

    if (methodNames.length > 0) {
      const pascalCase = methodNames.filter((name) => /^[A-Z][a-zA-Z0-9]*$/.test(name)).length
      const camelCase = methodNames.filter((name) => /^[a-z][a-zA-Z0-9]*$/.test(name)).length

      if (pascalCase > camelCase) {
        patterns.push({
          type: 'naming',
          pattern: 'PascalCase for methods',
          frequency: pascalCase,
          confidence: pascalCase / methodNames.length,
          examples: methodNames.filter((n) => /^[A-Z]/.test(n)).slice(0, 3),
        })
      } else if (camelCase > pascalCase) {
        patterns.push({
          type: 'naming',
          pattern: 'camelCase for methods',
          frequency: camelCase,
          confidence: camelCase / methodNames.length,
          examples: methodNames.filter((n) => /^[a-z]/.test(n)).slice(0, 3),
        })
      }
    }

    // Variable naming
    const variableNames: string[] = []
    scripts.forEach((script) => {
      const matches = script.matchAll(/(?:private|public|protected)\s+\w+\s+(\w+)\s*[;=]/g)
      for (const match of matches) {
        variableNames.push(match[1])
      }
    })

    if (variableNames.length > 0) {
      const camelCase = variableNames.filter((name) => /^[a-z][a-zA-Z0-9]*$/.test(name)).length
      const underscore = variableNames.filter((name) => /^_[a-z][a-zA-Z0-9]*$/.test(name)).length

      if (underscore > camelCase * 0.5) {
        patterns.push({
          type: 'naming',
          pattern: 'Underscore prefix for private fields',
          frequency: underscore,
          confidence: underscore / variableNames.length,
          examples: variableNames.filter((n) => n.startsWith('_')).slice(0, 3),
        })
      }
    }

    return patterns
  }

  /**
   * Analyze formatting conventions
   */
  private analyzeFormatting(scripts: string[]): CodePattern[] {
    const patterns: CodePattern[] = []

    // Brace style
    let sameLine = 0
    let newLine = 0

    scripts.forEach((script) => {
      const sameLineMatches = script.match(/\)\s*{/g)
      const newLineMatches = script.match(/\)\s*\n\s*{/g)

      if (sameLineMatches) sameLine += sameLineMatches.length
      if (newLineMatches) newLine += newLineMatches.length
    })

    if (sameLine > newLine) {
      patterns.push({
        type: 'formatting',
        pattern: 'Same-line braces',
        frequency: sameLine,
        confidence: sameLine / (sameLine + newLine),
        examples: ['method() {', 'if (condition) {'],
      })
    } else if (newLine > sameLine) {
      patterns.push({
        type: 'formatting',
        pattern: 'New-line braces',
        frequency: newLine,
        confidence: newLine / (sameLine + newLine),
        examples: ['method()\\n{', 'if (condition)\\n{'],
      })
    }

    // Indentation
    const indentationSizes: number[] = []
    scripts.forEach((script) => {
      const lines = script.split('\n')
      lines.forEach((line) => {
        const leadingSpaces = line.match(/^(\s+)/)
        if (leadingSpaces) {
          indentationSizes.push(leadingSpaces[1].length)
        }
      })
    })

    if (indentationSizes.length > 0) {
      const mostCommon = this.findMostCommon(indentationSizes)
      patterns.push({
        type: 'formatting',
        pattern: `${mostCommon}-space indentation`,
        frequency: indentationSizes.filter((s) => s === mostCommon).length,
        confidence: 0.9,
        examples: [`${' '.repeat(mostCommon)}code`],
      })
    }

    return patterns
  }

  /**
   * Analyze architecture patterns
   */
  private analyzeArchitecture(scripts: string[]): CodePattern[] {
    const patterns: CodePattern[] = []

    // Design patterns
    const designPatterns = {
      Singleton: /private static \w+ instance/i,
      Observer: /event\s+\w+/i,
      Factory: /Create\w+\(/i,
      'Object Pooling': /ObjectPool|Pool\w+/i,
      'State Machine': /enum\s+\w*State|State\s+currentState/i,
      Command: /interface\s+I\w*Command|class\s+\w*Command/i,
    }

    for (const [patternName, regex] of Object.entries(designPatterns)) {
      let frequency = 0
      const examples: string[] = []

      scripts.forEach((script) => {
        const matches = script.match(regex)
        if (matches) {
          frequency++
          if (examples.length < 3) {
            examples.push(matches[0])
          }
        }
      })

      if (frequency > 0) {
        patterns.push({
          type: 'architecture',
          pattern: patternName,
          frequency,
          confidence: Math.min(frequency / scripts.length, 1),
          examples,
        })
      }
    }

    return patterns
  }

  /**
   * Analyze common Unity components
   */
  private analyzeComponents(scripts: string[]): CodePattern[] {
    const patterns: CodePattern[] = []

    const commonComponents = [
      'MonoBehaviour',
      'ScriptableObject',
      'NetworkBehaviour',
      'Rigidbody',
      'Collider',
      'Transform',
      'Animator',
    ]

    const componentUsage: Map<string, number> = new Map()

    scripts.forEach((script) => {
      commonComponents.forEach((component) => {
        const regex = new RegExp(`\\b${component}\\b`, 'g')
        const matches = script.match(regex)
        if (matches) {
          componentUsage.set(component, (componentUsage.get(component) || 0) + matches.length)
        }
      })
    })

    componentUsage.forEach((frequency, component) => {
      if (frequency > 2) {
        patterns.push({
          type: 'component',
          pattern: `${component} usage`,
          frequency,
          confidence: Math.min(frequency / (scripts.length * 2), 1),
          examples: [component],
        })
      }
    })

    return patterns
  }

  /**
   * Apply learned style to generated code
   */
  applyStyle(code: string, styleProfile: CodeStyleProfile): string {
    let styledCode = code

    // Apply naming conventions
    const namingPatterns = styleProfile.patterns.filter((p) => p.type === 'naming')
    namingPatterns.forEach((pattern) => {
      if (pattern.pattern.includes('underscore prefix')) {
        // Add underscore to private fields
        styledCode = styledCode.replace(
          /private\s+(\w+)\s+([a-z]\w+)/g,
          (match, type, name) => `private ${type} _${name}`,
        )
      }
    })

    // Apply formatting
    const formattingPatterns = styleProfile.patterns.filter((p) => p.type === 'formatting')
    formattingPatterns.forEach((pattern) => {
      if (pattern.pattern.includes('new-line braces')) {
        // Convert to new-line braces
        styledCode = styledCode.replace(/\)\s*{/g, ')\n{')
      } else if (pattern.pattern.includes('same-line braces')) {
        // Convert to same-line braces
        styledCode = styledCode.replace(/\)\s*\n\s*{/g, ') {')
      }

      if (pattern.pattern.includes('indentation')) {
        const spaces = parseInt(pattern.pattern.match(/\d+/)?.[0] || '4')
        // Re-indent code
        styledCode = this.reindent(styledCode, spaces)
      }
    })

    return styledCode
  }

  /**
   * Re-indent code with specified number of spaces
   */
  private reindent(code: string, spaces: number): string {
    const lines = code.split('\n')
    let indentLevel = 0
    const indentedLines: string[] = []

    lines.forEach((line) => {
      const trimmed = line.trim()

      if (trimmed.endsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1)
      }

      const indent = ' '.repeat(indentLevel * spaces)
      indentedLines.push(indent + trimmed)

      if (trimmed.endsWith('{')) {
        indentLevel++
      }
    })

    return indentedLines.join('\n')
  }

  /**
   * Calculate confidence score for style profile
   */
  private calculateConfidence(patterns: CodePattern[], fileCount: number): number {
    if (patterns.length === 0) return 0

    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0)
    const avgConfidence = totalConfidence / patterns.length

    // Adjust based on file count (more files = higher confidence)
    const fileCountFactor = Math.min(fileCount / 10, 1)

    return avgConfidence * fileCountFactor
  }

  /**
   * Find most common value in array
   */
  private findMostCommon(arr: number[]): number {
    const frequency: Map<number, number> = new Map()
    let maxFreq = 0
    let mostCommon = 0

    arr.forEach((value) => {
      const freq = (frequency.get(value) || 0) + 1
      frequency.set(value, freq)

      if (freq > maxFreq) {
        maxFreq = freq
        mostCommon = value
      }
    })

    return mostCommon
  }
}

// Singleton instance
let codeStyleAnalyzer: CodeStyleAnalyzer | null = null

export const getCodeStyleAnalyzer = (): CodeStyleAnalyzer => {
  if (!codeStyleAnalyzer) {
    codeStyleAnalyzer = new CodeStyleAnalyzer()
  }
  return codeStyleAnalyzer
}
