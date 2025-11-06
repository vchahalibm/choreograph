# Testing the Offscreen Document Fix

Follow these steps to verify the fix for the "Worker is not defined" error.

## Step 1: Reload the Extension

1. Open `chrome://extensions/`
2. Find **DeskAgent**
3. Click the **Reload** button (🔄)

## Step 2: Check Service Worker Console

1. Still on `chrome://extensions/`
2. Find **DeskAgent**
3. Click **Service Worker** (may say "Inspect views: service worker")
4. Look for this message in the console:

```
✅ Offscreen document created for AI Worker
```

**If you see an error** instead, check that:
- The `offscreen` permission is in manifest.json
- The files `pages/offscreen.html` and `scripts/offscreen-bridge.js` exist

## Step 3: Inspect Offscreen Document

1. On `chrome://extensions/`, find **DeskAgent**
2. Look for **"Inspect views: offscreen page"** or **"offscreen document"**
3. Click it to open the offscreen document console
4. You should see:

```
✅ [Offscreen Bridge] Web Worker created successfully
✅ [Offscreen Bridge] Initialized and listening for messages
✅ [AI Worker] Web Worker initialized and ready
```

**If you don't see "Inspect views: offscreen page":**
- The offscreen document may not have been created yet
- Open the popup to trigger initialization
- Refresh the extensions page

## Step 4: Load the Model

1. Click the **DeskAgent** extension icon to open the popup
2. In the text input at the bottom, type:
   ```
   load model
   ```
3. Press Enter or click the send button

### What to Expect:

#### In the Popup:
You should see a response like:
```
🤖 Processing command...
✅ Model loaded successfully
```

#### In the Offscreen Document Console:
You should see detailed logs like:
```
🚀 [AI Worker] Loading Granite 4.0 model...
📦 [AI Worker] Model: onnx-community/granite-4.0-micro-ONNX-web
🖥️ [AI Worker] WebGPU available: true
📥 [AI Worker] Loading tokenizer...
🔄 [AI Worker] Initiating download: tokenizer.json
📥 [AI Worker] Loading tokenizer.json: 100%
✅ [AI Worker] Loaded tokenizer.json
📥 [AI Worker] Loading model...
🔄 [AI Worker] Initiating download: model.onnx
📥 [AI Worker] Loading model.onnx: 25%
📥 [AI Worker] Loading model.onnx: 50%
📥 [AI Worker] Loading model.onnx: 75%
📥 [AI Worker] Loading model.onnx: 100%
✅ [AI Worker] Loaded model.onnx
🔥 [AI Worker] Compiling shaders and warming up model...
✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
```

**Note:** First-time model loading can take 1-5 minutes depending on your internet speed and device. The model is about 100MB and will be cached by the browser.

## Step 5: Test NLP Command with Parameters

1. Make sure you have a script loaded (e.g., WhatsappReadMsg-Fixed.json)
2. In the popup, type:
   ```
   Search for John in WhatsApp
   ```
3. Press Enter

### What to Expect:

#### In the Popup:
```
🤖 Processing command...

Did you mean this script?
WhatsappReadMsg - Fixed
Confidence: 80%
Parameters: {"searchText1":"John"}

[Execute Now] button
```

#### Test the Parameters:
1. Click **Execute Now**
2. Check the service worker console
3. You should see:
```
📝 Script variables: { searchText1: 'John', searchText2: 'Rustambagh' }
🔄 Substituting {{searchText1}} with "John"
```

## Step 6: Verify Debugger Persistence

1. Execute any script (e.g., WhatsApp script)
2. After script completes, check service worker console:
```
✅ Script execution completed successfully
🔗 Keeping debugger attached for further interaction
```
3. Verify the debugger bar stays visible in the target tab

**To explicitly detach the debugger:**
Pass `detachDebugger: true` parameter when executing the script.

## Common Issues

### Issue 1: "No offscreen page to inspect"

**Cause:** Offscreen document wasn't created
**Solution:**
- Open the popup to trigger initialization
- Check service worker console for errors
- Verify `offscreen` permission is in manifest.json

### Issue 2: Model loading fails with network error

**Cause:** Cannot download model from HuggingFace
**Solution:**
- Check your internet connection
- Try again (files may be downloading)
- Check if HuggingFace CDN is accessible

### Issue 3: "Worker not ready, queuing message"

**Cause:** Web Worker is still initializing
**Solution:**
- This is normal, message will be processed when ready
- Wait a few seconds and try again

### Issue 4: WebGPU not available

**Logs show:**
```
🖥️ [AI Worker] WebGPU available: false
✅ [AI Worker] Granite 4.0 model loaded successfully on wasm
```

**Cause:** Your browser/device doesn't support WebGPU
**Solution:**
- This is OK! Model will use WASM backend (slower but functional)
- To enable WebGPU: Chrome → `chrome://flags/` → Enable "WebGPU Developer Features"

## Success Criteria

✅ All of these should be true:

1. Service worker console shows: `✅ Offscreen document created for AI Worker`
2. Offscreen document console shows: `✅ [AI Worker] Web Worker initialized and ready`
3. Model loads without errors (may take 1-5 minutes first time)
4. NLP commands match scripts with extracted parameters
5. Parameters are substituted in script execution
6. Debugger stays attached after script completion

## Next Steps

If all tests pass:
1. Try executing WhatsApp script with custom parameters
2. Test variable substitution with different values
3. Create new scripts with `{{variables}}`
4. Use the chatbot to search and execute scripts

If any test fails:
1. Check all console logs (service worker AND offscreen document)
2. Verify all files were created correctly
3. Make sure extension was reloaded after changes
4. See [FIXING_WORKER_ERROR.md](./FIXING_WORKER_ERROR.md) for detailed architecture
