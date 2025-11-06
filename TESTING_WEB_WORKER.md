# Testing Guide: Web Worker AI Model

## Quick Test (5 minutes)

### Step 1: Reload Extension
```
1. Go to chrome://extensions/
2. Find "DeskAgent"
3. Click the reload icon (↻)
4. Verify no errors
```

### Step 2: Open Popup
```
1. Click DeskAgent extension icon
2. Popup should open (chat interface)
```

### Step 3: Load Model
In the chat, type:
```
load model
```

**Expected Response:**
```
Agent: Loading AI model... This may take a moment.
[Wait 30-60 seconds]
Agent: ✅ AI model loaded successfully!
```

**Check Service Worker Console:**
```
1. Go to chrome://extensions/
2. Click "service worker" under DeskAgent
3. Look for:
   ✅ AI Worker initialized
   🚀 Loading Granite 4.0 model in Web Worker...
   ✅ Granite 4.0 model loaded successfully in Web Worker on webgpu
```

### Step 4: Test NLP Command
In the chat, type:
```
Search for John in WhatsApp
```

**Expected Response:**
```
Agent: Processing your command...
Agent: 📋 Found matching script (80.0% match)
       WhatsappReadMsg - Fixed
       Parameters: {"searchText2":"John"}
       [Execute Now] button
```

### Step 5: Execute Script
Click the **"Execute Now"** button

**Expected Response:**
```
System: Executing script with parameters: {"searchText2":"John"}
Agent: ✅ Script execution started successfully!
```

**Check Service Worker Console:**
```
📝 Script variables: { searchText1: "R94", searchText2: "John" }
🔄 Substituting {{searchText2}} with "John"
```

---

## Detailed Testing

### Test 1: Worker Initialization ✅

**Objective:** Verify Web Worker starts correctly

**Steps:**
1. Reload extension
2. Open service worker console
3. Look for initialization message

**Expected Output:**
```
DeskAgent Background initialized
✅ AI Worker initialized
```

**If Failed:**
- Check `ai-worker.js` exists in `scripts/` folder
- Check `manifest.json` includes `ai-worker.js` in `web_accessible_resources`
- Check browser console for errors

---

### Test 2: Model Loading (First Time) ✅

**Objective:** Verify model downloads and loads

**Steps:**
1. Clear cache: DevTools → Application → Storage → Clear site data
2. Reload extension
3. Open popup
4. Type: `load model`
5. Wait for completion

**Expected Output (Service Worker):**
```
🚀 Loading Granite 4.0 model in Web Worker...
📥 Loading config.json: 100%
📥 Loading tokenizer.json: 100%
📥 Loading onnx/model_q4f16.onnx: 15%
📥 Loading onnx/model_q4f16.onnx: 30%
...
📥 Loading onnx/model_q4f16.onnx: 100%
✅ Granite 4.0 model loaded successfully in Web Worker on webgpu
```

**Timing:**
- First time: 30-60 seconds
- Should complete without errors

**If Failed:**
- Check internet connection
- Check console for specific error
- Verify CSP includes `'wasm-unsafe-eval'`

---

### Test 3: Model Loading (Cached) ✅

**Objective:** Verify model loads quickly from cache

**Steps:**
1. After Test 2, reload extension
2. Type: `load model` again

**Expected Timing:**
- Should complete in 10-20 seconds
- Much faster than first time

**Expected Output:**
```
✅ Granite 4.0 model loaded successfully in Web Worker on webgpu
```

---

### Test 4: NLP Command Processing ✅

**Objective:** Test AI understands commands

**Test Cases:**

#### Case 1: Direct Match
```
Command: "read messages whatsapp"
Expected: Matches "WhatsappReadMsg - Fixed"
Confidence: > 70%
```

#### Case 2: Parameter Extraction
```
Command: "Search for Sarah in WhatsApp"
Expected: Matches "WhatsappReadMsg - Fixed"
Parameters: {"searchText2": "Sarah"}
Confidence: > 70%
```

#### Case 3: Quoted Parameters
```
Command: 'Search for "John Doe" in WhatsApp'
Expected: Matches "WhatsappReadMsg - Fixed"
Parameters: {"searchText2": "John Doe"}
Confidence: > 70%
```

#### Case 4: No Match
```
Command: "book a flight to Paris"
Expected: No matching script found
Fallback message shown
```

**For Each Case:**
1. Type command in popup
2. Verify match/parameters in response
3. Check service worker console for processing logs

---

### Test 5: Script Execution with Parameters ✅

**Objective:** Verify parameters are passed to script

**Steps:**
1. Type: `Search for TestUser in WhatsApp`
2. AI should match script and extract parameter
3. Click "Execute Now"
4. Check service worker console

**Expected Output:**
```
📝 Script variables: { searchText1: "R94", searchText2: "TestUser" }

▶️ Step 1/13: setViewport
✅ Completed: setViewport

▶️ Step 2/13: waitForElement
✅ Completed: waitForElement

...

▶️ Step 9/13: change
🔄 Substituting {{searchText2}} with "TestUser"
⌨️ Typing "TestUser" into element: div[role='textbox'][contenteditable='true']
✓ DOM typing successful (contenteditable)
✅ Completed: change

...

🎉 All steps completed
✅ Script execution completed successfully
🔗 Keeping debugger attached for further interaction
```

---

### Test 6: Fallback to Text Matching ✅

**Objective:** Verify graceful degradation if AI fails

**Steps:**
1. Don't load model (skip `load model` command)
2. Type: `search whatsapp`
3. Should still work using text matching

**Expected Output:**
```
🤖 Processing command: search whatsapp
⚠️ Model not loaded, loading now...
[If load fails]
⚠️ AI model processing failed, using fallback text matching
⚠️ Using fallback text matching

Found matching script (text-based)
```

---

### Test 7: Multiple Commands in Session ✅

**Objective:** Test model persistence

**Steps:**
1. Load model once
2. Run multiple commands without reloading

**Commands:**
```
1. "search for Alice in WhatsApp"
2. "find Bob in WhatsApp"
3. "WhatsApp search Charlie"
```

**Expected:**
- All should process quickly (1-2 seconds each)
- Model not reloaded between commands
- Parameters extracted correctly each time

---

### Test 8: Popup Parameter Display ✅

**Objective:** Verify parameters shown in UI

**Steps:**
1. Type: `Search for "Jane Doe" in WhatsApp`
2. Look at popup response

**Expected UI:**
```html
📋 Found matching script (80.0% match)
WhatsappReadMsg - Fixed
Updated with current WhatsApp selectors - supports variables: {{searchText1}}, {{searchText2}}
Parameters: {"searchText2":"Jane Doe"}
[Execute Now] button
```

**Verify:**
- Parameters displayed in gray text
- Correct JSON format
- Value matches command

---

### Test 9: Direct Script Execution ✅

**Objective:** Test script execution without NLP

**Steps:**
```javascript
// In service worker console
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-script',
  parameters: {
    searchText1: "Direct1",
    searchText2: "Direct2"
  }
});
```

**Expected Output:**
```
📝 Script variables: { searchText1: "Direct1", searchText2: "Direct2" }
🔄 Substituting {{searchText1}} with "Direct1"
🔄 Substituting {{searchText2}} with "Direct2"
```

---

### Test 10: WebGPU vs WASM ✅

**Objective:** Verify device selection

**Check Service Worker Console:**
```
🖥️ [AI Worker] WebGPU available: true
✅ Granite 4.0 model loaded successfully in Web Worker on webgpu
```

**If WebGPU Available:**
- Inference: 1-2 seconds
- Device: `webgpu`
- Better performance

**If WebGPU Not Available:**
- Inference: 3-5 seconds
- Device: `wasm`
- Still functional

**To Test WASM:**
```javascript
// Disable WebGPU (for testing only)
// In ai-worker.js, temporarily change:
// device: 'wasm'  // Force WASM
```

---

## Regression Tests

### Verify Original Features Still Work ✅

#### Test 1: Variable Substitution (without AI)
```javascript
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-script',
  parameters: {
    searchText1: "Manual1",
    searchText2: "Manual2"
  }
});
```

**Expected:** Variables substituted correctly

#### Test 2: Debugger Persistence
```javascript
// Run any script
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-script'
});
```

**Expected:**
```
✅ Script execution completed successfully
🔗 Keeping debugger attached for further interaction
```

#### Test 3: Default Parameters
```javascript
// Run script without parameters
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-script'
  // No parameters - should use defaults from script
});
```

**Expected:**
```
📝 Script variables: { searchText1: "R94", searchText2: "Rustambagh" }
```

---

## Performance Tests

### Test 1: Model Loading Time
```
First load (with download): 30-60 seconds
Cached load: 10-20 seconds
```

### Test 2: Command Processing Time
```
With WebGPU: 1-2 seconds
With WASM: 3-5 seconds
Fallback text matching: <100ms
```

### Test 3: Memory Usage
```
Without model: ~50 MB
With model loaded: ~2.5 GB
```

**Check in Chrome Task Manager:**
```
1. Chrome Menu → More Tools → Task Manager
2. Find "Extension: DeskAgent"
3. Check memory usage
```

---

## Error Testing

### Test 1: Worker Crash
```
// In service worker console
// Terminate worker manually
deskAgent.aiWorker.terminate();

// Try to process command
chrome.runtime.sendMessage({
  type: 'PROCESS_NLP_COMMAND',
  command: 'test'
});
```

**Expected:** Falls back to text matching

### Test 2: Network Failure
```
1. Disconnect internet
2. Clear cache
3. Try to load model
```

**Expected:** Error message, falls back to text matching

### Test 3: Invalid Parameters
```javascript
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-script',
  parameters: {
    searchText1: null,  // Invalid
    searchText2: undefined  // Invalid
  }
});
```

**Expected:** Uses default parameters, no crash

---

## Success Criteria

### ✅ All Tests Pass If:

1. **Worker initializes** without errors
2. **Model loads** (first time in 30-60s, cached in 10-20s)
3. **Commands process** correctly with AI
4. **Parameters extracted** from natural language
5. **Parameters displayed** in popup UI
6. **Parameters passed** to script execution
7. **Variables substituted** in script steps
8. **Fallback works** if AI unavailable
9. **Debugger persists** after script execution
10. **No memory leaks** or crashes

---

## Troubleshooting Guide

### Issue: Worker Not Initializing

**Symptom:**
```
❌ Failed to initialize AI Worker
```

**Check:**
1. `scripts/ai-worker.js` exists
2. `manifest.json` includes worker in `web_accessible_resources`
3. Reload extension

### Issue: Model Won't Load

**Symptom:**
```
❌ Error loading model in Web Worker
```

**Check:**
1. Internet connection
2. CSP includes `'wasm-unsafe-eval'`
3. Browser supports WebGPU (or falls back to WASM)
4. Enough disk space (~2.3 GB)

### Issue: No Parameters Extracted

**Symptom:** AI matches script but no parameters shown

**Check:**
1. Command contains parameter value
2. Model is actually loaded (check console)
3. `popup.js` stores `lastMatchedParameters`

### Issue: Parameters Not Substituted

**Symptom:** Script runs but uses default values

**Check:**
1. Service worker console shows parameters received
2. `substituteVariables()` is called
3. Variable names match exactly (case-sensitive)

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Document any specific observations
2. Note performance characteristics
3. Ready for production use
4. Can deploy to Chrome Web Store

### If Some Tests Fail ⚠️
1. Note which tests failed
2. Capture console errors
3. Check file structure
4. Verify all code changes applied
5. Ask for help with specific errors

---

## Reference: Expected Console Output

### Successful Flow
```
[Service Worker Console]
DeskAgent Background initialized
✅ AI Worker initialized
🚀 Loading Granite 4.0 model in Web Worker...
📥 Loading config.json: 100%
📥 Loading tokenizer.json: 100%
📥 Loading onnx/model_q4f16.onnx: 100%
✅ Granite 4.0 model loaded successfully in Web Worker on webgpu

🤖 Processing command: Search for John in WhatsApp
📝 Script variables: { searchText1: "R94", searchText2: "John" }
▶️ Step 1/13: setViewport
✅ Completed: setViewport
...
🎉 All steps completed
✅ Script execution completed successfully
🔗 Keeping debugger attached for further interaction
```

### Failed Flow (Graceful)
```
[Service Worker Console]
DeskAgent Background initialized
❌ Failed to initialize AI Worker: [error]
🤖 Processing command: Search for John in WhatsApp
⚠️ Model not loaded, loading now...
❌ Error loading model in Web Worker: [error]
⚠️ AI model processing failed, using fallback text matching
⚠️ Using fallback text matching
[Continues with text matching]
```

---

**Last Updated**: 2025-10-12
**Status**: Ready for testing
**Estimated Test Time**: 15-30 minutes for full suite
