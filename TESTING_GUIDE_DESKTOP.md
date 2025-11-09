# Testing Guide: Universal Intent Classification System

## Step 1: Pull Latest Changes from Repository

### 1.1 Check Current Branch
```bash
cd /path/to/choreograph
git status
```

You should see:
```
On branch claude/update-granite-model-011CUs77jZMCEq5GdBKmC5HN
```

### 1.2 Pull Latest Changes
```bash
# Fetch latest changes from remote
git fetch origin claude/update-granite-model-011CUs77jZMCEq5GdBKmC5HN

# Pull and merge
git pull origin claude/update-granite-model-011CUs77jZMCEq5GdBKmC5HN
```

### 1.3 Verify You Have Latest Commits
```bash
git log --oneline -5
```

You should see these recent commits:
```
61febb2 Implement universal intent classification with production-ready prompt
b3f4744 Add comprehensive intent taxonomy and universal classification prompt
e8b7c68 Add comprehensive prompt design documentation for Granite model
3305706 Document chatbot to AI model integration flow
4b54dcb Move AI worker to popup context with automatic loading
```

---

## Step 2: Build the Extension

### 2.1 Install Dependencies (if not already installed)
```bash
npm install
```

Expected output:
```
added X packages in Ys
```

### 2.2 Build the Webpack Bundle
```bash
npm run build
```

Expected output:
```
> choreograph-ai-extension@1.0.0 build
> webpack --mode production

asset ai-worker.bundled.js 818 KiB [emitted] [minimized] (name: ai-worker)
...
webpack 5.102.1 compiled with 1 warning in ~11s
```

### 2.3 Verify Build Files Exist
```bash
ls -lh scripts/ai-worker.bundled.js
```

Should show: `~818K` file

---

## Step 3: Load Extension in Chrome

### 3.1 Open Chrome Extensions Page

**Method 1:** Type in address bar:
```
chrome://extensions/
```

**Method 2:** Menu → Extensions → Manage Extensions

### 3.2 Enable Developer Mode

1. Toggle **"Developer mode"** switch in top-right corner
2. Should now see: "Load unpacked", "Pack extension", "Update" buttons

### 3.3 Remove Old Version (if exists)

1. Find "Choreograph" extension in the list
2. Click **"Remove"** button
3. Confirm removal

### 3.4 Load New Version

1. Click **"Load unpacked"** button
2. Navigate to your `choreograph` directory
3. Select the **root folder** (the one containing `manifest.json`)
4. Click **"Select Folder"**

### 3.5 Verify Extension Loaded

You should see:
```
Choreograph
AI-powered automation assistant
Version: 1.0.0
ID: [random extension ID]
```

### 3.6 Pin Extension to Toolbar (Optional)

1. Click the puzzle piece icon (Extensions) in Chrome toolbar
2. Find "Choreograph"
3. Click the pin icon to pin it

---

## Step 4: Open and Test the Popup

### 4.1 Open Popup

Click the **Choreograph icon** in Chrome toolbar

### 4.2 Wait for Model to Load

You should see:
1. **Yellow status bar**: "Loading Granite 4.0 AI model..."
2. **Input field**: Disabled/grayed out with placeholder "Loading AI model..."
3. **Progress updates**: "Loading model.onnx: 45%..."

**First Load**: 30-60 seconds (downloading model)
**Subsequent Loads**: 2-5 seconds (loading from cache)

### 4.3 Model Ready

When ready, you'll see:
1. **Green status bar**: "✅ AI model ready (webgpu)" or "(wasm)"
2. **Input field**: Enabled and active
3. **Status bar auto-hides** after 3 seconds

---

## Step 5: Test All Intent Types

### 5.1 Test INFORMATIONAL Intent

**Purpose**: Questions and information requests

#### Test Commands:
```
What is machine learning?
```
**Expected Response:**
- 💡 icon
- AI-generated explanation of machine learning

```
How do I create a strong password?
```
**Expected Response:**
- 💡 icon
- AI-generated password creation tips

```
Explain the difference between HTTP and HTTPS
```
**Expected Response:**
- 💡 icon
- AI-generated comparison explanation

---

### 5.2 Test CONVERSATIONAL Intent

**Purpose**: Greetings, thanks, social interactions

#### Test Commands:
```
Hello!
```
**Expected Response:**
```
💬 Hello! I'm Choreograph AI. How can I help you today?
```

```
Thanks for your help
```
**Expected Response:**
```
💬 You're welcome! Let me know if you need anything else.
```

```
Goodbye
```
**Expected Response:**
```
💬 Goodbye! Feel free to come back anytime.
```

---

### 5.3 Test META Intent

**Purpose**: Help requests, system capabilities

#### Test Commands:
```
What can you do?
```
**Expected Response:**
```
ℹ️ I'm Choreograph AI! I can help you with:

🤖 **Browser Automation**: Navigate websites, click buttons, fill forms
📊 **Data Extraction**: Scrape data from web pages
💬 **Questions**: Answer general questions
⚙️ **Configuration**: Manage scripts and settings

Try commands like:
• "Go to amazon.com"
• "What is machine learning?"
• "Show available scripts"
```

```
Help
```
**Expected Response:**
```
ℹ️ **Choreograph Help**

Available commands:
• "show available scripts" - List all automation scripts
• "show available tasks" - List all workflows
• "model status" - Check AI model status
• Natural language commands for automation

Upload scripts in the settings page to create custom automations!
```

```
model status
```
**Expected Response:**
```
AI Model Status: loaded and ready
```

---

### 5.4 Test EXTRACTION Intent

**Purpose**: Data scraping requests

#### Test Commands:
```
Extract all product prices from this page
```
**Expected Response:**
- 📊 icon
- AI-generated guidance on how to extract prices

```
Get all email addresses from the page
```
**Expected Response:**
- 📊 icon
- AI-generated extraction guidance

```
Scrape the table data
```
**Expected Response:**
- 📊 icon
- AI-generated scraping instructions

---

### 5.5 Test ANALYSIS Intent

**Purpose**: Data analysis requests

#### Test Commands:
```
Calculate the average rating
```
**Expected Response:**
- 📈 icon
- AI-generated explanation of how to calculate averages

```
Analyze sentiment of customer reviews
```
**Expected Response:**
- 📈 icon
- AI-generated sentiment analysis guidance

```
Compare prices across these websites
```
**Expected Response:**
- 📈 icon
- AI-generated comparison methodology

---

### 5.6 Test CONFIGURATION Intent

**Purpose**: Settings and configuration changes

#### Test Commands:
```
Change timeout to 30 seconds
```
**Expected Response:**
```
⚙️ Configuration changes require confirmation. Please use the Settings page to modify system settings.
```

```
Set language to Spanish
```
**Expected Response:**
```
⚙️ Configuration changes require confirmation. Please use the Settings page to modify system settings.
```

---

### 5.7 Test ACTION Intent (Script Matching)

**Purpose**: Browser automation (original functionality)

#### Test Commands:

**Without Scripts:**
```
Go to amazon.com
```
**Expected Response:**
```
I couldn't find a matching script for your command.

Try:
• "show available scripts" to see all scripts
• Upload more scripts in settings
• Rephrase your command
```

**With Scripts** (after uploading automation scripts):
```
Go to amazon.com
```
**Expected Response:**
```
📋 Found matching script (85% match)
Navigate to URL
[Execute Now] button
```

---

## Step 6: Monitor Console for Debugging

### 6.1 Open Browser Console

**While popup is open:**
1. Right-click anywhere in popup
2. Select **"Inspect"**
3. Click **"Console"** tab

### 6.2 Watch for Log Messages

You should see:
```
✅ [AI Worker] Web Worker initialized and ready
✅ AI Worker initialized in popup
🤖 [AI Worker] Loading Granite 4.0 model...
📥 [AI Worker] Loading tokenizer...
📥 [AI Worker] Loading model...
🔥 [AI Worker] Compiling shaders and warming up model...
✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
✅ Granite 4.0 model loaded successfully
```

When you send a command:
```
🤖 [AI Worker] Processing command: What is machine learning?
📊 [AI Worker] Intent classification: INFORMATIONAL
🤖 [AI Worker] Classification response: {...}
```

### 6.3 Check for Errors

If you see red error messages:
- Copy the full error
- Check if model loaded successfully
- Verify all build files exist

---

## Step 7: Test Different Scenarios

### 7.1 Test Fallback Classification

**Intentionally ambiguous command:**
```
do something
```

**Expected:**
- Should use fallback classification
- Console shows: "⚠️ [AI Worker] Failed to parse JSON response, using fallback"
- May show ACTION intent with no script match

### 7.2 Test Mixed Commands

**Multi-step command:**
```
Go to google.com and search for AI
```

**Expected:**
- Currently treats as ACTION intent
- May match navigation script
- (Multi-intent detection is implemented but requires specific prompt tuning)

### 7.3 Test Model Status

**Check AI model status:**
```
model status
```

**Expected:**
```
AI Model Status: loaded and ready
```

### 7.4 Test Popup Reopening

1. Close popup
2. Reopen popup
3. Observe:
   - Model loads from cache (faster)
   - Status shows "Loading..." then "✅ AI model ready"
   - Previous conversation history may be preserved

---

## Step 8: Performance Testing

### 8.1 Measure Model Load Time

**First Load (no cache):**
1. Open Chrome DevTools Console
2. Clear browser cache: Settings → Privacy → Clear browsing data → Cached images and files
3. Reload extension
4. Open popup
5. Note load time from logs

**Expected:** 30-60 seconds

**Subsequent Loads (cached):**
1. Close popup
2. Reopen popup
3. Note load time

**Expected:** 2-5 seconds

### 8.2 Measure Response Time

**For each intent type:**
1. Type command
2. Press Enter
3. Note time to response in console

**Expected Times:**
- CONVERSATIONAL: <100ms (predefined)
- META: <100ms (built-in)
- INFORMATIONAL: 2-5 seconds (LLM generation)
- ACTION: 2-4 seconds (classification + matching)
- EXTRACTION: 2-5 seconds (LLM generation)
- ANALYSIS: 2-5 seconds (LLM generation)
- CONFIGURATION: <100ms (predefined)

---

## Step 9: Check Storage and Caching

### 9.1 View IndexedDB (Model Cache)

1. Open DevTools (F12)
2. Go to **"Application"** tab
3. Expand **"IndexedDB"** in left sidebar
4. Find **"transformers-cache"** database
5. Check stored model files

**Expected:**
- tokenizer.json (~500 KB)
- model.onnx (~40-80 MB)
- config.json (~5 KB)

### 9.2 View LocalStorage (Chat History)

1. In Application tab
2. Expand **"Local Storage"**
3. Click on extension URL
4. Find **"deskagent_messages"** key
5. View stored conversation history

**Expected:**
- JSON array of message objects
- Last 50 messages preserved

---

## Step 10: Common Issues and Troubleshooting

### Issue 1: Model Not Loading

**Symptoms:**
- Status stuck on "Loading..."
- Console errors about fetch failures

**Solutions:**
```bash
# 1. Check internet connection
ping cdn.huggingface.co

# 2. Clear cache and rebuild
rm -rf node_modules
npm install
npm run build

# 3. Reload extension
# Go to chrome://extensions/ and click "Reload"
```

### Issue 2: Intent Classification Not Working

**Symptoms:**
- All commands treated as ACTION
- No LLM responses

**Solutions:**
1. Check console for JSON parse errors
2. Verify `maxTokens: 250` in popup.js
3. Check model is actually loaded: send "model status" command

### Issue 3: Build Errors

**Symptoms:**
- `npm run build` fails
- Missing files

**Solutions:**
```bash
# Clean and rebuild
rm -rf node_modules scripts/ai-worker.bundled.js
npm install
npm run build

# Check for .npmrc file
cat .npmrc
# Should contain: onnxruntime_node_install_cuda=skip
```

### Issue 4: Extension Not Loading

**Symptoms:**
- Error: "Manifest file is missing or unreadable"

**Solutions:**
1. Verify you're selecting the root `choreograph` folder
2. Check `manifest.json` exists and is valid:
```bash
cat manifest.json | head -20
```

### Issue 5: CSP Violations

**Symptoms:**
- Console error: "Content Security Policy directive"
- Model trying to load from CDN

**Solutions:**
1. Verify webpack copied WASM files:
```bash
ls -lh scripts/*.wasm scripts/*.mjs
```

2. Rebuild if files missing:
```bash
npm run build
```

---

## Quick Test Command Sequence

Copy-paste this sequence to test all intents quickly:

```
Hello!
What is machine learning?
What can you do?
Extract all prices
Calculate average
Thanks!
model status
```

---

## Expected Full Test Results

| Command | Intent | Response Type | Icon |
|---------|--------|---------------|------|
| "Hello!" | CONVERSATIONAL | Predefined | 💬 |
| "What is machine learning?" | INFORMATIONAL | LLM-generated | 💡 |
| "What can you do?" | META | Built-in help | ℹ️ |
| "Extract all prices" | EXTRACTION | LLM guidance | 📊 |
| "Calculate average" | ANALYSIS | LLM guidance | 📈 |
| "Thanks!" | CONVERSATIONAL | Predefined | 💬 |
| "model status" | Special command | Status info | - |
| "Go to amazon.com" | ACTION | Script match/no match | 📋 |
| "Change timeout" | CONFIGURATION | Settings guidance | ⚙️ |

---

## Complete Command Reference

### Pull and Build
```bash
# Navigate to project
cd /path/to/choreograph

# Pull latest changes
git fetch origin claude/update-granite-model-011CUs77jZMCEq5GdBKmC5HN
git pull origin claude/update-granite-model-011CUs77jZMCEq5GdBKmC5HN

# Install dependencies (if needed)
npm install

# Build
npm run build

# Verify build
ls -lh scripts/ai-worker.bundled.js
```

### Load Extension
```
1. Open: chrome://extensions/
2. Enable "Developer mode"
3. Remove old version (if exists)
4. Click "Load unpacked"
5. Select choreograph folder
6. Click extension icon in toolbar
7. Wait for model to load
8. Start testing!
```

### Quick Verification
```bash
# Check you have latest code
git log --oneline -1

# Should show:
# 61febb2 Implement universal intent classification with production-ready prompt

# Check build file size
ls -lh scripts/ai-worker.bundled.js

# Should show:
# ~818K ai-worker.bundled.js

# Check WASM files
ls -lh scripts/*.wasm | wc -l

# Should show:
# 2 (two WASM files)
```

---

## Video Demo Script (Optional)

If you want to record a demo:

1. **Open popup** - Show loading status
2. **Test greeting**: "Hello!"
3. **Test question**: "What is artificial intelligence?"
4. **Test help**: "What can you do?"
5. **Test extraction**: "Extract product prices"
6. **Test thanks**: "Thanks!"
7. **Test status**: "model status"
8. **Show console** - Display classification logs
9. **Test action** (if you have scripts): "Go to amazon.com"

---

## Success Criteria

✅ Extension loads without errors
✅ Model loads successfully (green status)
✅ Input enabled after model load
✅ CONVERSATIONAL intent works (greetings)
✅ META intent works (help commands)
✅ INFORMATIONAL intent generates answers
✅ Console shows intent classifications
✅ Different icons for different intents
✅ No CSP violations in console
✅ Responses appear within 5 seconds

---

## Support

If you encounter issues:

1. **Check console** for error messages
2. **Verify build** files exist
3. **Clear cache** and rebuild
4. **Check git** you're on correct branch
5. **Restart Chrome** and reload extension

All 7 intent types should work! 🎉
