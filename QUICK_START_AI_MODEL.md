# Quick Start: AI Model Setup

## Prerequisites

- Chrome browser (latest version recommended)
- DeskAgent extension installed
- Internet connection (for first-time model download)

## Step-by-Step Guide

### 1. Reload the Extension

After updating the code, reload the extension:

1. Open `chrome://extensions/`
2. Find **DeskAgent**
3. Click the **Reload** button (🔄)

### 2. Open Config Page

1. Click the **DeskAgent** extension icon in toolbar
2. Click the **⚙️ Settings** icon in the popup
3. OR right-click the extension icon → "Options"

This opens the config/settings page in a new tab.

### 3. Load the AI Model

1. In the config page, go to the **Settings** tab
2. Scroll to "NLP Model Settings"
3. Click **"Load NLP Model"** button

**What to expect:**
- Button becomes disabled
- Status shows "Creating AI Worker..."
- Then "Loading Granite 4.0 model..."
- Progress updates show file loading percentage
- After 1-5 minutes (first time): "Model loaded successfully on webgpu"

**First time download:** The Granite 4.0 model is about 100MB. Subsequent loads are instant as the browser caches the model.

### 4. Verify Model is Loaded

**Check Service Worker Console:**
1. Go to `chrome://extensions/`
2. Find **DeskAgent**
3. Click "Service Worker" link
4. Look for: `✅ AI model ready in config page on webgpu`

**Check Config Page Console:**
1. In the config page tab, press `F12` to open DevTools
2. Look for:
   ```
   ✅ Web Worker created successfully
   ✅ [AI Worker] Transformers.js library loaded successfully
   ✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
   ```

### 5. Test NLP Commands

1. Click the **DeskAgent** extension icon to open popup
2. Make sure you have some scripts loaded (upload JSON scripts if needed)
3. Type a natural language command, for example:
   - `search for john in whatsapp`
   - `read messages from alice`
   - `open calculator`
4. Press Enter

**What to expect:**
- Popup shows: "🤖 Processing command..."
- Background routes to config page for AI processing
- AI matches your command to a script
- Popup shows: "Did you mean this script?" with an "Execute Now" button
- Parameters are automatically extracted (e.g., "john" → `searchText1`)

### 6. Execute the Script

1. Review the matched script and parameters
2. Click **"Execute Now"**
3. Script runs with the extracted parameters
4. Variables like `{{searchText1}}` are replaced with extracted values

## Troubleshooting

### Issue: "Worker not ready, queuing message"

**Cause:** Web Worker is still initializing

**Solution:** Wait a few seconds and try again. The message will be processed when ready.

---

### Issue: "AI Worker not initialized. Please load the model first"

**Cause:** Model hasn't been loaded yet

**Solution:**
1. Open config page (right-click extension → Options)
2. Go to Settings tab
3. Click "Load NLP Model"

---

### Issue: Model loading fails with error

**Possible causes:**
- No internet connection
- HuggingFace CDN unreachable
- Browser storage full

**Solutions:**
1. Check your internet connection
2. Try reloading the extension
3. Clear browser cache and try again
4. Check browser console for specific error message

---

### Issue: Commands use text matching instead of AI

**Symptom:** Service worker console shows "⚠️ AI model not loaded. Using fallback text matching"

**Cause:** Model not loaded or config page closed

**Solution:**
1. Open config page
2. Load the model
3. **Keep the config page tab open** (can minimize but don't close)

---

### Issue: Model loads on "wasm" instead of "webgpu"

**Info:** This is normal if WebGPU is not available. Model will work but be slower.

**To enable WebGPU:**
1. Open `chrome://flags/`
2. Search for "WebGPU"
3. Enable "WebGPU Developer Features"
4. Restart Chrome
5. Reload model in config page

---

## Important Notes

### Model Persistence

- Model stays loaded as long as config page tab is open
- If you close the config page, the model is unloaded
- You can minimize the config page tab, just don't close it
- To use AI features, either:
  - Keep config page open in background tab
  - OR reload model when needed

### Fallback Behavior

- Extension always works even without AI model
- If model not loaded, uses simple text matching
- Text matching looks for keyword matches in script titles/descriptions
- AI model provides better matching and parameter extraction

### First-Time Setup

- First model load takes 1-5 minutes (downloads ~100MB)
- Subsequent loads are instant (browser cache)
- Model files cached at: Browser Cache → HuggingFace Models
- To clear cache: Chrome Settings → Privacy → Clear Browsing Data → Cached Files

## Example Workflow

1. **Morning:** Open Chrome → Open config page → Click "Load Model"
2. **Throughout day:** Use DeskAgent popup to run automation with natural language
3. **Config page stays open:** Keep in background tab (don't close)
4. **Next day:** Model may need to be reloaded if browser restarted

## Testing the Setup

### Test 1: Variable Substitution (No AI needed)

1. Create a script with `{{variableName}}` in steps
2. Execute script via popup with parameters: `{ "variableName": "TestValue" }`
3. Verify the variable gets replaced in execution

### Test 2: AI Model Loading

1. Open config page → Settings tab
2. Click "Load NLP Model"
3. Wait for success message
4. Check both service worker and config page consoles for success logs

### Test 3: NLP Command Processing

1. Have WhatsApp script loaded
2. In popup, type: "search for testuser in whatsapp"
3. Should match WhatsApp script
4. Should extract "testuser" as `searchText1` parameter
5. Click "Execute Now" to run

### Test 4: Debugger Persistence

1. Execute any script
2. After script completes, check target tab
3. Debugger bar should still be visible
4. Service worker console should show: "🔗 Keeping debugger attached"

## Summary

The AI model loading has been moved to the config page to work around Service Worker limitations. This provides:

- ✅ Full Web Worker support
- ✅ No CSP issues
- ✅ User-controlled loading with clear UI feedback
- ✅ Graceful fallback to text matching if model not loaded
- ✅ Better parameter extraction from natural language

Just remember to **keep the config page tab open** while using AI features!
