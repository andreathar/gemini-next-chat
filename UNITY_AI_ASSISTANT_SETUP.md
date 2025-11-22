# 🎮 Unity AI Assistant - Complete Setup Guide

Welcome to the **World's Best Unity Code Assistant!** This guide will help you set up your personalized AI assistant tailored for Unity 6 game development.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Unity MCP Server Setup](#unity-mcp-server-setup)
5. [Vector Database Setup (Pinecone)](#vector-database-setup)
6. [First-Time Project Indexing](#first-time-project-indexing)
7. [Usage Guide](#usage-guide)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software

- **Node.js** >= 18
- **pnpm** (recommended) or npm
- **Unity Hub** with Unity 6.0+
- **Windows 11** (Your current setup)

### API Keys Needed

1. **Gemini API Key** - Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Claude API Key** - Get from [Anthropic Console](https://console.anthropic.com/)
3. **Pinecone API Key** - Get from [Pinecone](https://app.pinecone.io/) (Free tier available)

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd /path/to/gemini-next-chat
pnpm install
```

This will install all the new dependencies including:
- `@anthropic-ai/sdk` - Claude API
- `@pinecone-database/pinecone` - Vector database
- `@langchain/*` - RAG framework
- `@microsoft/signalr` - Unity MCP connection
- `chokidar` - File watching
- `ts-morph` - Code analysis
- `@tensorflow/tfjs` - ML features

### Step 2: Create Environment File

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

### Step 3: Configure Environment Variables

Edit `.env.local` with your settings:

```env
# ===== GEMINI CONFIGURATION =====
GEMINI_API_KEY=your_gemini_api_key_here

# ===== CLAUDE API CONFIGURATION =====
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_API_BASE_URL=https://api.anthropic.com

# ===== VECTOR DATABASE CONFIGURATION =====
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=unity-knowledge-base

# ===== UNITY PROJECT CONFIGURATION =====
# Comma-separated paths to your Unity projects
UNITY_PROJECT_PATHS=C:/Projects/MyUnityGame,C:/Projects/AnotherGame
UNITY_VERSION=6.0
ENABLE_AUTO_INDEXING=true

# ===== MCP SERVER CONFIGURATION =====
MCP_UNITY_SERVER_URL=http://localhost:8080
MCP_UNITY_SIGNALR_HUB=/unity-hub
ENABLE_MCP_INTEGRATION=true

# ===== PERSONALIZATION & ML =====
ENABLE_PATTERN_LEARNING=true
ENABLE_CODE_STYLE_ANALYSIS=true
USER_PROFILE_NAME=YourName

# ===== HARDWARE OPTIMIZATION =====
GPU_MODEL=RTX_3060
GPU_VRAM_GB=6
CPU_CORES=16
RAM_GB=32
```

---

## 🔌 Unity MCP Server Setup

The Unity MCP server allows the AI to interact directly with your Unity Editor.

### Recommended: IvanMurzak/Unity-MCP

1. **Download Unity MCP Plugin:**

```bash
git clone https://github.com/IvanMurzak/Unity-MCP
cd Unity-MCP
```

2. **Install Node.js Server:**

```bash
cd Server
npm install
npm run build
npm start
```

The server should start on `http://localhost:8080`

3. **Install Unity Plugin:**

- Copy the `UnityMcpPlugin` folder to your Unity project's `Assets` folder
- Unity will automatically compile the plugin

4. **Configure Plugin:**

In Unity:
- Go to **Tools → Unity MCP → Settings**
- Server URL: `http://localhost:8080`
- Hub Path: `/unity-hub`
- Click **Connect**

5. **Verify Connection:**

You should see "✅ Connected to Unity MCP Server" in the console.

### Alternative: CoplayDev/unity-mcp

If you prefer the CoplayDev implementation:

```bash
git clone https://github.com/CoplayDev/unity-mcp
cd unity-mcp
npm install
npm start
```

---

## 🗄️ Vector Database Setup (Pinecone)

### Option A: Cloud Pinecone (Recommended)

1. **Create Free Account:**
   - Go to [Pinecone](https://app.pinecone.io/)
   - Sign up for free tier (100K vectors free)

2. **Create Index:**

```bash
# Or let the app create it automatically on first run
```

The app will auto-create the index named `unity-knowledge-base` with:
- Dimension: 768 (Gemini embeddings)
- Metric: Cosine similarity
- Cloud: AWS
- Region: us-east-1

3. **Get API Key:**
   - Dashboard → API Keys → Create Key
   - Copy to `.env.local`

### Option B: Local Vector DB (Advanced)

If you prefer running locally:

```env
USE_LOCAL_VECTOR_DB=true
```

This uses `hnswlib-node` for local vector search (no API key needed).

---

## 📊 First-Time Project Indexing

### Manual Indexing via API

After setup, index your Unity project:

```bash
# Start the dev server
pnpm dev
```

Then call the indexing API:

```bash
curl -X POST http://localhost:3000/api/unity/index \\
  -H "Content-Type: application/json" \\
  -d '{"projectPath": "C:/Projects/MyUnityGame"}'
```

Or use the UI (once we add it in the next steps).

### What Gets Indexed?

- **C# Scripts:** Full content with metadata (classes, methods, namespaces)
- **Scenes:** Metadata only (name, path)
- **Prefabs:** Metadata only (name, path)
- **Project Settings:** Unity version, packages, render pipeline

### Indexing Progress

The indexer will:
1. Scan all `.cs` files in `Assets/Scripts`
2. Extract code patterns and metadata
3. Generate embeddings via Gemini
4. Store in Pinecone with rich metadata
5. Watch for file changes (auto-reindex)

Expected time: ~2-5 minutes for a medium project (100-500 scripts)

---

## 🚀 Usage Guide

### Starting the Assistant

```bash
pnpm dev
```

Navigate to `http://localhost:3000`

### First-Time Setup Wizard

The UI will guide you through:

1. **User Profile Creation**
   - Name, experience level
   - Unity version preference
   - Hardware specs (auto-detected)

2. **Project Selection**
   - Add Unity project paths
   - Choose active project
   - Start initial indexing

3. **Model Selection**
   - Gemini (fast, multimodal)
   - Claude (best for code reasoning)
   - Auto-switch based on task

### Chatting with Your Unity Assistant

**Example Queries:**

```
"Create a NetworkBehaviour script for player movement with smooth syncing"
→ AI generates code matching YOUR style, optimized for multiplayer

"Why is my PlayerController causing jitter on clients?"
→ AI searches your project, finds similar code, suggests fix

"Optimize this script for RTX 3060 with 6GB VRAM"
→ AI provides GPU-specific optimizations

"Explain how my InventorySystem works"
→ AI retrieves your code from vector DB, explains architecture
```

### Using RAG Context

The assistant automatically:
- **Retrieves** relevant code from your project
- **Augments** the prompt with context
- **Generates** responses tailored to YOUR codebase

You'll see "📚 Using context from your project" when RAG is active.

---

## 🎯 Advanced Features

### 1. Pattern Learning

The AI learns your coding style:

- **Naming conventions** (PascalCase, camelCase, _privateFields)
- **Architecture patterns** (Singleton, Observer, Factory)
- **Formatting preferences** (brace style, indentation)
- **Common components** (NetworkBehaviour, ScriptableObjects)

**Manual Re-analysis:**

```
"Analyze my coding style and update preferences"
```

### 2. Error Learning

When you encounter errors:

```
"I'm getting NullReferenceException in PlayerController.Update()"
```

AI will:
1. Search error history for similar issues
2. Check your project for common causes
3. Suggest fix tailored to your code
4. **Remember solution** for future

### 3. Hardware-Aware Optimization

Your RTX 3060 with 6GB VRAM is configured, so:

```
"Optimize rendering for my GPU"
```

AI suggests:
- Texture compression settings
- Mesh LOD strategies
- Post-processing limits
- Shader optimizations for RTX

### 4. Multimodal Vision (Unity Scenes)

With MCP connected:

```
"Analyze my current scene and suggest improvements"
```

AI will:
1. Capture screenshot via MCP
2. Analyze GameObject hierarchy
3. Detect issues (missing colliders, lighting problems)
4. Suggest fixes

### 5. Workflow Automation

AI detects repetitive tasks:

```
After creating 3 similar NetworkBehaviour scripts:
"💡 I noticed you often create player scripts with these components.
    Want me to create a template?"
```

---

## 🛠️ Troubleshooting

### MCP Connection Failed

**Error:** `❌ Failed to connect to Unity MCP Server`

**Solutions:**
1. Ensure Unity MCP server is running: `npm start` in server directory
2. Check port 8080 is not in use
3. Verify firewall allows localhost:8080
4. In Unity, check MCP plugin is enabled

### Pinecone Index Error

**Error:** `Index 'unity-knowledge-base' not found`

**Solutions:**
1. Run initialization: App will auto-create on first use
2. Manually create via Pinecone dashboard
3. Check API key is correct
4. Verify environment matches (us-east-1-aws)

### Indexing Slow

**Issue:** Indexing takes > 10 minutes

**Solutions:**
1. **Reduce batch size:** Fewer scripts per batch
2. **Filter scripts:** Only index `Assets/Scripts`, not packages
3. **Use local vector DB:** Faster for small projects
4. **Check Gemini API quota:** May be rate limited

### Code Style Not Matching

**Issue:** Generated code doesn't match my style

**Solutions:**
1. Re-analyze project: `"Analyze my coding style"`
2. Check file count: Need 10+ scripts for good confidence
3. Manually set preferences in User Profile settings
4. Provide explicit style in prompt: `"Use PascalCase methods with new-line braces"`

### Out of Memory (Vector DB)

**Issue:** Browser crashes during indexing

**Solutions:**
1. Index in smaller chunks (100 scripts at a time)
2. Use server-side indexing (background job)
3. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

---

## 📚 Additional Resources

- [Unity MCP Integration Guide](https://github.com/IvanMurzak/Unity-MCP)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [Claude API Reference](https://docs.anthropic.com/)
- [Gemini API Docs](https://ai.google.dev/docs)

---

## 🎉 You're Ready!

Your Unity AI Assistant is now configured with:

✅ Dual AI models (Gemini + Claude)
✅ Vector database for your code
✅ RAG-powered context retrieval
✅ Unity Editor integration (MCP)
✅ Pattern learning & personalization
✅ Hardware-specific optimizations
✅ Error history & solutions

**Start creating amazing Unity games with your AI sidekick! 🚀**

---

## 💡 Pro Tips

1. **Index incrementally:** Start with core scripts, expand later
2. **Use specific queries:** "Create" vs "Generate" vs "Explain" trigger different behaviors
3. **Provide context:** Mention your project type ("multiplayer FPS", "mobile puzzle")
4. **Give feedback:** Rate responses to improve learning
5. **Save error solutions:** AI remembers fixes for future

---

## 🆘 Need Help?

- **GitHub Issues:** [github.com/u14app/gemini-next-chat/issues](https://github.com/u14app/gemini-next-chat/issues)
- **Discord:** (Add community link)
- **Documentation:** This file!

Happy coding! 🎮✨
