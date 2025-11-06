# Testing Checklist for New Features

## Quick Fix: CSP Error

### ✅ Fix Applied
Updated `manifest.json` to allow WebAssembly:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
}
```

### 🔄 Next Steps
1. **Reload extension**: `chrome://extensions/` → Click reload icon
2. **Test model loading**: Follow checklist below

---

## Feature 1: Script Parameterization ✅

### Test Steps

1. **Open WhatsappReadMsg-Fixed.json**
   - Verify `parameters` object exists
   - Verify `{{searchText1}}` and `{{searchText2}}` in steps

2. **Run script with default parameters**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'EXECUTE_SCRIPT',
     scriptId: 'whatsapp-script'
   });
   ```

3. **Check console for**
   ```
   📝 Script variables: { searchText1: "R94", searchText2: "Rustambagh" }
   🔄 Substituting {{searchText1}} with "R94"
   🔄 Substituting {{searchText2}} with "Rustambagh"
   ```

4. **Run with custom parameters**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'EXECUTE_SCRIPT',
     scriptId: 'whatsapp-script',
     parameters: {
       searchText1: "Test1",
       searchText2: "Test2"
     }
   });
   ```

5. **Verify substitution**
   ```
   🔄 Substituting {{searchText1}} with "Test1"
   🔄 Substituting {{searchText2}} with "Test2"
   ```

### ✅ Success Criteria
- [ ] Default parameters loaded from script
- [ ] Runtime parameters override defaults
- [ ] Console shows substitution logs
- [ ] Script executes with correct values

---

## Feature 2: AI Model Loading ⚠️ (Needs Testing)

### Prerequisites
- ✅ CSP updated in manifest.json
- ✅ Extension reloaded

### Test Steps

#### A. Model Loading (First Time - 10-20 seconds)

1. **Open service worker console**
   - `chrome://extensions/` → DeskAgent → "service worker"

2. **Load model**
   ```javascript
   chrome.runtime.sendMessage({ type: 'LOAD_NLP_MODEL' });
   ```

3. **Watch for success messages**
   ```
   🚀 Loading NLP model for text generation...
   📦 Model: Xenova/distilgpt2
   📥 Loading config.json: 100%
   📥 Loading tokenizer.json: 100%
   📥 Loading onnx/decoder_model_merged_quantized.onnx: 100%
   ✅ Loaded onnx/decoder_model_merged_quantized.onnx
   ✅ NLP model loaded successfully
   🔥 Testing model...
   ✅ Model test complete
   ```

4. **❌ Should NOT see**
   ```
   ❌ wasm streaming compile failed
   ❌ falling back to ArrayBuffer instantiation
   ❌ failed to asynchronously prepare wasm
   ❌ no available backend found
   ```

#### B. Model Usage

1. **Test command processing**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'PROCESS_NLP_COMMAND',
     command: 'Search for John in WhatsApp'
   }, (response) => {
     console.log('Result:', response);
   });
   ```

2. **Expected response**
   ```javascript
   {
     matched: true,
     script: { title: "WhatsappReadMsg - Fixed", ... },
     parameters: { searchText2: "John" },
     confidence: 0.7,
     reasoning: "Matched based on command analysis"
   }
   ```

#### C. Model Persistence (After 30s)

1. **Wait 35 seconds** (service worker may restart)

2. **Use model again**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'PROCESS_NLP_COMMAND',
     command: 'test'
   });
   ```

3. **Verify**: Should reload quickly (from cache)

### ✅ Success Criteria
- [ ] Model loads without CSP errors
- [ ] Model processes commands correctly
- [ ] Model persists in cache between uses
- [ ] Fallback text matching works if model fails

---

## Feature 3: Debugger Persistence ✅

### Test Steps

#### A. Basic Persistence

1. **Attach debugger to WhatsApp**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'ATTACH_DEBUGGER',
     url: 'https://web.whatsapp.com'
   });
   ```

2. **Run a script**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'EXECUTE_SCRIPT',
     scriptId: 'whatsapp-script'
   });
   ```

3. **Check console after completion**
   ```
   ✅ Script execution completed successfully
   🔗 Keeping debugger attached for further interaction
   ```

4. **Verify debugger still attached**
   - Check DevTools indicator on tab
   - Try running another script on same tab

#### B. Auto-Reattachment

1. **Manually detach debugger**
   - Close DevTools on the tab

2. **Check console**
   ```
   ⚠️ Debugger detached from tab 123, reason: canceled_by_user
   🔄 Attempting to reattach debugger to tab 123...
   ✅ Debugger reattached to tab 123
   ```

3. **Verify**: Script execution continues

#### C. Explicit Detachment

1. **Run with detach parameter**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'EXECUTE_SCRIPT',
     scriptId: 'whatsapp-script',
     parameters: {
       detachDebugger: true
     }
   });
   ```

2. **Check console**
   ```
   🔌 Detaching debugger as requested...
   ```

3. **Verify**: Debugger is detached after script

### ✅ Success Criteria
- [ ] Debugger stays attached by default
- [ ] Auto-reattachment works on unexpected detach
- [ ] Explicit detachment works when requested
- [ ] No script interruptions

---

## Integration Test: All Features Together

### Complete Workflow

1. **Load model** (if not already loaded)
   ```javascript
   chrome.runtime.sendMessage({ type: 'LOAD_NLP_MODEL' });
   ```

2. **Use natural language to run parameterized script**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'PROCESS_NLP_COMMAND',
     command: 'Search for "Sarah" in WhatsApp'
   }, (response) => {
     if (response.matched) {
       chrome.runtime.sendMessage({
         type: 'EXECUTE_SCRIPT',
         scriptId: response.script.id,
         parameters: response.parameters
       });
     }
   });
   ```

3. **Watch console for**
   ```
   🤖 Processing command with NLP model: Search for "Sarah" in WhatsApp
   🤖 Model response: 1
   📝 Script variables: { searchText2: "Sarah" }
   🔄 Substituting {{searchText2}} with "Sarah"
   ✅ Script execution completed successfully
   🔗 Keeping debugger attached for further interaction
   ```

### ✅ Success Criteria
- [ ] AI matches script correctly
- [ ] Parameters extracted from command
- [ ] Variables substituted in script
- [ ] Script executes successfully
- [ ] Debugger remains attached

---

## Troubleshooting

### Model Won't Load

**Check:**
1. ✅ CSP updated in manifest.json
2. ✅ Extension reloaded (hard refresh)
3. ✅ Internet connection (downloads ~80 MB)
4. ✅ Chrome version 95+ (for wasm-unsafe-eval)

**Try:**
```javascript
// Check CSP
chrome.runtime.getManifest().content_security_policy

// Should include: 'wasm-unsafe-eval'
```

### Variables Not Substituting

**Check console for:**
- ✅ `📝 Script variables:` - shows parameters loaded
- ✅ `🔄 Substituting` - shows replacements happening
- ❌ `⚠️ Variable {{name}} not found` - parameter missing

**Fix:** Ensure parameter names match exactly (case-sensitive)

### Debugger Detaching

**Check console for:**
- ✅ `🔗 Keeping debugger attached`
- ⚠️ `⚠️ Debugger detached` - shows reason
- ✅ `🔄 Attempting to reattach` - auto-recovery

**Common reasons:**
- `canceled_by_user` - Manual detach
- `target_closed` - Tab closed
- `replaced_with_devtools` - DevTools opened

---

## Success Summary

When all tests pass, you should see:

### Console Output
```
🚀 Loading NLP model for text generation...
✅ NLP model loaded successfully
🤖 Processing command with NLP model: Search for Sarah in WhatsApp
📝 Script variables: { searchText2: "Sarah" }
🔄 Substituting {{searchText2}} with "Sarah"
▶️ Step 1/5: waitForElement
✅ Completed: waitForElement
...
🎉 All steps completed
✅ Script execution completed successfully
🔗 Keeping debugger attached for further interaction
```

### Features Working
- ✅ Variables: Parameterized scripts
- ✅ AI: Natural language commands
- ✅ Persistence: Debugger stays attached
- ✅ Auto-recovery: Reattaches on detach
- ✅ Fallback: Text matching if AI fails

---

## Next Steps After Testing

1. **Document any issues**: Note what didn't work
2. **Test edge cases**: Long scripts, no internet, etc.
3. **User testing**: Have someone else try it
4. **Performance profiling**: Check memory usage
5. **Production readiness**: Review security, errors

---

**Last Updated**: 2025-10-12
**Status**: Ready for testing after CSP fix
