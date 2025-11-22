# 🚀 Quick Start Guide - Unity AI Assistant

## ✅ You've Successfully Installed!

All dependencies are ready. Now follow these steps to get your Unity AI Assistant running.

---

## 📝 **STEP 1: Configure Environment Variables**

I've created `.env.local` for you. **Edit it now** and add:

### **Required API Keys:**

1. **Gemini API Key** (you already have this)
   - Paste your existing key into `GEMINI_API_KEY=`

2. **Claude API Key** (NEW - get it here: https://console.anthropic.com/)
   - Sign up (free $5 credit to start)
   - Go to API Keys section
   - Create new key
   - Paste into `CLAUDE_API_KEY=`

3. **Pinecone API Key** (NEW - get it here: https://app.pinecone.io/)
   - Sign up for FREE tier (100K vectors)
   - Go to API Keys
   - Copy default key
   - Paste into `PINECONE_API_KEY=`

   **OR** skip Pinecone and use local vector DB:
   ```env
   USE_LOCAL_VECTOR_DB=true
   ```

### **Unity Project Paths:**

Add your Unity project paths (Windows format):
```env
UNITY_PROJECT_PATHS=C:/Projects/MyUnityGame,C:/Projects/AnotherGame
```

### **Your Name (Optional but recommended):**
```env
USER_PROFILE_NAME=YourName
```

---

## 🎮 **STEP 2: Set Up Unity MCP Server** (Optional but Powerful!)

This lets the AI control Unity Editor directly. **Highly recommended!**

### **Option A: Quick Start (IvanMurzak/Unity-MCP)**

Open a **new terminal** and run:

```bash
# Download Unity MCP
git clone https://github.com/IvanMurzak/Unity-MCP
cd Unity-MCP/Server

# Install and start
npm install
npm start
```

Server will run on `http://localhost:8080` ✅

### **Option B: Alternative (CoplayDev/unity-mcp)**

```bash
git clone https://github.com/CoplayDev/unity-mcp
cd unity-mcp
npm install
npm start
```

### **In Unity Editor:**

1. Copy the `UnityMcpPlugin` folder from the MCP repo to your Unity project's `Assets/` folder
2. Open Unity
3. Go to **Tools → Unity MCP → Settings**
4. Set Server URL: `http://localhost:8080`
5. Click **Connect**

✅ You should see "Connected to Unity MCP Server" in console

### **Skip MCP for Now?**

You can skip this and still use 95% of features. Just set:
```env
ENABLE_MCP_INTEGRATION=false
```

---

## 🧪 **STEP 3: Test the Web Version**

Start the development server:

```bash
pnpm dev
```

Open: http://localhost:3000

### **First-Time Setup:**

1. You'll see the normal Gemini Next Chat interface
2. Go to Settings (gear icon)
3. Enter your API keys if you haven't already
4. Try a test query:
   ```
   "Hello! Can you help me with Unity development?"
   ```

### **Test Claude Integration:**

Try a complex coding query:
```
"Explain the difference between Update() and FixedUpdate() in Unity and when to use each"
```

The AI should give you a detailed, accurate response using Claude's superior reasoning.

---

## 📊 **STEP 4: Index Your First Unity Project**

This is where the magic happens! 🎩✨

### **Option A: Via API** (Fastest)

Open a new terminal:

```bash
curl -X POST http://localhost:3000/api/unity/index \
  -H "Content-Type: application/json" \
  -d "{\"projectPath\": \"C:/Projects/MyUnityGame\"}"
```

**Windows PowerShell alternative:**
```powershell
$body = @{
    projectPath = "C:/Projects/MyUnityGame"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/unity/index" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### **What Happens:**

- Scans all C# scripts in `Assets/Scripts`
- Extracts classes, methods, namespaces
- Generates embeddings
- Stores in Pinecone (or local vector DB)
- **Time**: ~2-5 minutes for medium project (100-500 scripts)

### **Watch Progress:**

Check the terminal running `pnpm dev` for logs like:
```
🔍 Starting indexing for project: MyUnityGame
📝 Indexing C# scripts...
✅ Stored document: PlayerController.cs
✅ Indexing complete: 243/245 files, 0 errors
```

---

## 🎯 **STEP 5: Try Unity-Specific Queries**

Now test the RAG system with your indexed project:

### **Code Understanding:**
```
"Explain how my player movement system works"
```
→ AI retrieves your actual PlayerController.cs and explains it!

### **Code Generation:**
```
"Create a NetworkBehaviour script for enemy AI with pathfinding"
```
→ AI generates code matching YOUR coding style!

### **Debugging:**
```
"My characters are falling through the floor. What could be wrong?"
```
→ AI searches your project for collider/rigidbody issues

### **Optimization:**
```
"How can I optimize my game for RTX 3060 with 6GB VRAM?"
```
→ AI gives hardware-specific recommendations

---

## 🖥️ **STEP 6: Build Windows Desktop App** (Optional)

Want a standalone .exe with all the Unity AI features?

### **Install Tauri Prerequisites:**

1. **Install Rust** (if not already installed):
   - Download from: https://www.rust-lang.org/tools/install
   - Run installer
   - Restart terminal

2. **Verify Rust installation:**
```bash
rustc --version
cargo --version
```

### **Build the Desktop App:**

```bash
pnpm tauri build
```

This will:
- Build the Next.js frontend
- Compile the Tauri backend
- Create Windows installer

**Output location:**
```
src-tauri/target/release/bundle/msi/gemini-next-chat_1.10.7_x64_en-US.msi
```

**Install time:** ~10-20 minutes (first build is slower)

### **Install the App:**

1. Double-click the `.msi` file
2. Follow installer
3. Launch from Start Menu
4. Your Unity AI Assistant is now a desktop app! 🎉

---

## 📱 **What Works Where?**

| Feature | Web App | Desktop App |
|---------|---------|-------------|
| Gemini Chat | ✅ | ✅ |
| Claude Chat | ✅ | ✅ |
| Vector Search (Pinecone) | ✅ | ✅ |
| RAG System | ✅ | ✅ |
| Code Style Learning | ✅ | ✅ |
| Unity MCP Integration | ✅ | ✅ |
| Project Indexing | ✅ | ✅ |
| File Watching | ⚠️ Limited | ✅ Better |
| System Tray | ❌ | ✅ |
| Offline Mode | ❌ | ✅ (for UI) |

---

## 🎉 **You're Ready!**

### **Quick Test Checklist:**

- [ ] Web app running on localhost:3000
- [ ] API keys configured in .env.local
- [ ] Unity project indexed
- [ ] Test query returns results with context
- [ ] (Optional) Unity MCP server connected
- [ ] (Optional) Desktop app built and installed

### **Common First Questions:**

**Q: Do I need both Gemini AND Claude?**
A: No! You can use just Gemini. Claude is optional but recommended for complex code tasks.

**Q: Do I need Pinecone?**
A: No! Set `USE_LOCAL_VECTOR_DB=true` to use local storage (slower but free).

**Q: Do I need Unity MCP?**
A: No! It's optional. You'll still get RAG, code generation, and learning without it.

**Q: How much does this cost?**
A:
- Gemini: Free tier available
- Claude: $5 free credit, then ~$3 per million tokens
- Pinecone: FREE tier (100K vectors)
- Total for hobby use: **~$0-10/month**

---

## 🆘 **Troubleshooting**

### **"Cannot find module '@anthropic-ai/sdk'"**
```bash
pnpm install
```

### **"Pinecone index not found"**
The app will auto-create it on first indexing. Or:
```env
USE_LOCAL_VECTOR_DB=true
```

### **"Unity MCP connection failed"**
1. Check server is running: `http://localhost:8080`
2. Check Unity plugin is imported
3. Check firewall allows localhost:8080

### **"Indexing takes too long"**
- First indexing is slower (generates embeddings)
- Subsequent updates are fast (only changed files)
- For huge projects (1000+ scripts), consider indexing in batches

---

## 📚 **Next Steps**

1. **Read Full Documentation**: `UNITY_AI_ASSISTANT_SETUP.md`
2. **Explore Features**: `UNITY_FEATURES.md`
3. **Customize**: Update user profile, add more projects
4. **Share**: Show off your AI assistant to your team!

---

## 💡 **Pro Tips**

1. **Index your project overnight** the first time if it's huge
2. **Use specific queries** - "Create" vs "Explain" vs "Debug"
3. **Give feedback** - The AI learns from your corrections
4. **Save error solutions** - They'll be remembered for next time
5. **Try both models** - Gemini for speed, Claude for complexity

---

**You now have the most powerful Unity AI assistant! Happy coding! 🚀🎮**

Need help? Check the docs or ask your AI assistant! 😉
