# Testing the Granite 4.0 AI Model Online

## Prerequisites

1. **Chrome Browser** (or any Chromium-based browser like Edge, Brave)
2. **Built Extension** - Ensure you've run the build process:
   ```bash
   npm install
   npm run build
   ```

## Step-by-Step Testing Guide

### 1. Load the Extension in Chrome

#### Option A: From Local Directory

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **"Load unpacked"**

4. Select the `/home/user/choreograph` directory (or your local path)

5. The extension should now appear in your extensions list

#### Option B: If You Have a .zip File

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Drag and drop the .zip file onto the page

### 2. Open the Extension Configuration Page

**Method 1: Right-click the extension icon**
- Find the extension icon in Chrome toolbar
- Right-click → **Options**

**Method 2: Direct URL**
```
chrome-extension://<extension-id>/config.html
```
(Replace `<extension-id>` with your extension's ID from chrome://extensions/)

### 3. Load the Granite 4.0 AI Model

1. In the config page, click the **"Settings"** tab

2. Click the **"Load NLP Model"** button

3. **Wait for the model to load** (this may take 1-5 minutes on first load)

4. Watch the console for progress:
   ```
   Opening DevTools:
   - Right-click on page → Inspect
   - Go to Console tab
   ```

### 4. Expected Console Output (Success)

You should see:

```javascript
✅ [AI Worker] Web Worker initialized and ready (Webpack bundled with Granite 4.0 support)
Creating Web Worker for AI model...
✅ Web Worker created successfully
🚀 [AI Worker] Loading Granite 4.0 model...
📦 [AI Worker] Model: onnx-community/granite-4.0-micro-ONNX-web
🖥️ [AI Worker] WebGPU available: true
📥 [AI Worker] Loading tokenizer...
🔄 [AI Worker] Initiating download: tokenizer.json
📥 [AI Worker] Loading tokenizer.json: 100%
✅ [AI Worker] Loaded tokenizer.json
📥 [AI Worker] Loading model...
🔄 [AI Worker] Initiating download: onnx/decoder_model_merged_quantized.onnx
📥 [AI Worker] Loading onnx/decoder_model_merged_quantized.onnx: 15%
📥 [AI Worker] Loading onnx/decoder_model_merged_quantized.onnx: 50%
📥 [AI Worker] Loading onnx/decoder_model_merged_quantized.onnx: 100%
✅ [AI Worker] Loaded onnx/decoder_model_merged_quantized.onnx
🔥 [AI Worker] Compiling shaders and warming up model...
✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
```

### 5. Test Natural Language Processing

Once the model is loaded, test the NLP functionality:

1. Open the extension **popup** (click the extension icon)

2. Try typing a natural language command:
   ```
   "Search for John in WhatsApp"
   "Send message to Alice"
   "Open settings"
   ```

3. The model should match your command to the appropriate script

### 6. Verify WebGPU Support

Check if WebGPU is available in your browser:

1. Navigate to:
   ```
   chrome://gpu
   ```

2. Look for **"WebGPU"** in the list
   - ✅ **Enabled** = Model will use GPU acceleration
   - ❌ **Disabled** = Model will fall back to WASM (slower but still works)

### 7. Check Model Cache

After the first load, the model is cached:

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **IndexedDB** → Look for `transformers-cache`
4. Subsequent loads should be much faster (< 10 seconds)

## Troubleshooting

### Issue: "Failed to load model"

**Check:**
1. Console errors (F12 → Console)
2. Network connectivity
3. Browser cache is not full

**Solution:**
```javascript
// Clear cache in DevTools Console
indexedDB.deleteDatabase('transformers-cache')
// Then reload and try again
```

### Issue: "WebGPU not available"

**Check:**
```
chrome://gpu
```

**Solutions:**
- Update Chrome to latest version
- Enable WebGPU flags if needed:
  ```
  chrome://flags/#enable-unsafe-webgpu
  ```
- Model will automatically fall back to WASM

### Issue: Worker script not found

**Check:**
1. Built files exist:
   ```bash
   ls -lh scripts/ai-worker.bundled.js
   ls -lh scripts/*.wasm
   ```

2. If missing, rebuild:
   ```bash
   npm run build
   ```

### Issue: CORS or CSP errors

**Check:**
- Extension is loaded from chrome://extensions/
- All files are in the correct paths
- manifest.json includes bundled files in web_accessible_resources

## Performance Expectations

### First Load (Cold Start)
- **Download time**: 1-3 minutes (depends on connection)
- **Model size**: ~150MB total
- **Shader compilation**: 10-30 seconds

### Subsequent Loads (Cached)
- **Load time**: 5-10 seconds
- **Ready to use**: Almost instant

### Inference Performance
- **WebGPU**: Very fast (~50-200ms per query)
- **WASM**: Slower (~500ms-2s per query)

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Config page opens successfully
- [ ] "Load NLP Model" button works
- [ ] Model downloads and loads (check console)
- [ ] WebGPU or WASM backend selected
- [ ] Model compiles shaders successfully
- [ ] Natural language commands work
- [ ] Model is cached after first load
- [ ] Subsequent loads are fast

## Advanced Testing

### Test with DevTools Network Tab

1. Open DevTools → Network tab
2. Click "Load NLP Model"
3. Filter by "transformers" or "onnx"
4. Watch files download:
   - tokenizer.json (~500KB)
   - config.json (~2KB)
   - decoder_model_merged_quantized.onnx (~150MB)

### Test Worker Communication

Open Console and run:
```javascript
chrome.runtime.sendMessage({
  type: 'PROCESS_NLP_COMMAND',
  command: 'test command'
}, (response) => {
  console.log('Response:', response);
});
```

## Demo URLs for Testing

Once loaded, try the extension on these sites:
- WhatsApp Web: https://web.whatsapp.com
- Any website where you have automation scripts configured

## Support

If you encounter issues:
1. Check the Console (F12) for error messages
2. Verify build completed successfully: `ls -lh scripts/ai-worker.bundled.js`
3. Ensure Chrome is up to date
4. Try clearing browser cache and reloading extension

---

**Model Info:**
- Name: IBM Granite 4.0 Micro
- ID: `onnx-community/granite-4.0-micro-ONNX-web`
- Size: ~150MB (quantized)
- Device: WebGPU (preferred) or WASM (fallback)
- Quantization: q4f16 (WebGPU) / q4 (WASM)
