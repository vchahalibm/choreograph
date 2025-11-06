# Complete Testing Guide

**Test all three features:** Variable Substitution, Granite 4.0 AI Model, Debugger Persistence

---

## Setup

**Before starting tests:**

1. Reload extension at `chrome://extensions/`
2. Open Service Worker console (click "Service Worker" link)
3. Have at least one script loaded (e.g., WhatsappReadMsg-Fixed.json)

---

## Test 1: Variable Substitution ✅

### What to Test
Scripts can use `{{variableName}}` syntax that gets replaced at runtime.

### Steps

1. **Check script has variables:**
   - Open config page
   - Look at WhatsappReadMsg-Fixed.json
   - Should have: `"parameters": { "searchText1": "R94", "searchText2": "Rustambagh" }`
   - Should use: `"value": "{{searchText1}}"` in steps

2. **Test with custom parameters:**
   - Execute script from popup with: `{ "searchText1": "TestUser" }`
   - Check Service Worker console
   - Should see: `📝 Script variables: { searchText1: 'TestUser', ... }`
   - Should see: `🔄 Substituting {{searchText1}} with "TestUser"`

3. **Test with defaults:**
   - Execute script without parameters
   - Should use default values from script
   - Should see: `🔄 Substituting {{searchText1}} with "R94"`

**✅ PASS:** Variables are replaced correctly

---

## Test 2: Granite 4.0 Model ✅

### Part A: Load the Model

1. **Open config page:**
   - Right-click extension icon → "Options"
   - OR click ⚙️ in popup

2. **Go to Settings tab**

3. **Click "Load NLP Model" button**

4. **Wait and observe:**
   - Button disabled ✓
   - Status: "Creating AI Worker..." ✓
   - Status: "Loading Granite 4.0 model..." ✓
   - Progress updates show percentages ✓
   - After 1-5 min: "Model loaded successfully on webgpu" (or "wasm") ✓
   - Green indicator dot appears ✓

5. **Check Service Worker console:**
   - Should see: `✅ AI model ready in config page on webgpu`

6. **Check Config Page console (F12):**
   ```
   ✅ Web Worker created successfully
   ✅ [AI Worker] Transformers.js library loaded successfully
   ✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
   ```

**✅ PASS:** Model loads without errors

### Part B: Use the Model

1. **Open popup**

2. **Type:** `search for john in whatsapp`

3. **Press Enter**

4. **Observe popup:**
   - Shows: "🤖 Processing command..."
   - Shows matched script: "WhatsappReadMsg - Fixed"
   - Shows extracted parameter: `{"searchText1":"john"}`
   - Shows "Execute Now" button

5. **Check Service Worker console:**
   ```
   🤖 Processing command: search for john in whatsapp
   📤 Routing NLP processing to config page...
   ✅ NLP processing successful via config page
   ```

6. **Try other commands:**
   - `find alice` → should extract "alice"
   - `look for "test user"` → should extract "test user"

**✅ PASS:** AI matches commands and extracts parameters

### Part C: Execute with AI Parameters

1. **Type:** `search for mike in whatsapp`

2. **Click "Execute Now"**

3. **Check Service Worker console:**
   ```
   📝 Script variables: { searchText1: 'mike', ... }
   🔄 Substituting {{searchText1}} with "mike"
   ```

**✅ PASS:** AI-extracted parameters flow to execution

### Part D: Fallback Behavior

1. **Close config page tab** (this unloads the model)

2. **Type command in popup**

3. **Check Service Worker console:**
   ```
   ⚠️ AI model not loaded. Please open Settings page...
   ⚠️ Using fallback text matching
   ```

4. **Popup still shows results** (simple text match)

**✅ PASS:** Graceful fallback to text matching

---

## Test 3: Debugger Persistence ✅

### What to Test
Debugger stays attached after script execution.

### Steps

1. **Execute any script** (e.g., navigate to google.com)

2. **Wait for completion**

3. **Check target tab:**
   - Debugger bar still visible: "Debugging on this page"

4. **Check Service Worker console:**
   ```
   ✅ Script execution completed successfully
   🔗 Keeping debugger attached for further interaction
   ```

5. **Execute another script on same tab:**
   - Should work without re-attaching
   - Debugger still attached after second script

**✅ PASS:** Debugger persists across executions

---

## Integration Test: All Features Together 🎯

### Full Workflow

1. **Load AI model** in config page ✓

2. **Type NLP command:** `search for inttest in whatsapp` ✓

3. **AI matches and extracts:** `{"searchText1":"inttest"}` ✓

4. **Click "Execute Now"** ✓

5. **Check console:**
   ```
   📤 Routing NLP processing to config page...
   ✅ NLP processing successful via config page
   📝 Script variables: { searchText1: 'inttest', ... }
   🔄 Substituting {{searchText1}} with "inttest"
   ✅ Script execution completed successfully
   🔗 Keeping debugger attached
   ```

6. **Verify:**
   - AI processed command ✓
   - Variable substituted ✓
   - Script executed ✓
   - Debugger attached ✓

**✅ PASS:** All three features work together

---

## Common Issues & Solutions

### Issue: "Worker is not defined"

**Solution:** This error is now fixed. Model loads in config page, not service worker.

### Issue: CSP violation with CDN

**Solution:** Web Worker can load from CDN. Config page has no CSP restrictions.

### Issue: Model not loading

**Check:**
- Internet connection working?
- Config page console for errors?
- Sufficient disk space?

**Try:**
- Reload extension
- Clear browser cache
- Try again

### Issue: "AI Worker not initialized"

**Solution:**
- Open config page
- Go to Settings tab
- Click "Load NLP Model"
- **Keep config page open** (don't close tab)

### Issue: Commands not matching

**Check:**
- Is model actually loaded? (check config page status)
- Is config page still open?
- Are scripts loaded in extension?

### Issue: Variables not substituting

**Check:**
- Script has `parameters` object defined?
- Steps use correct syntax: `{{variableName}}`?
- Parameters passed when executing?

---

## Performance Benchmarks

| Operation | Expected Time |
|-----------|--------------|
| Model download (first time) | 1-5 minutes |
| Model loading (cached) | 10-30 seconds |
| Command processing (WebGPU) | <1 second |
| Command processing (WASM) | 1-3 seconds |
| Variable substitution | <1ms |
| Script execution | Varies by script |

---

## Console Output Reference

### Good Signs (Service Worker)

```
DeskAgent Background initialized
💡 AI model can be loaded from Settings/Config page
✅ AI model ready in config page on webgpu
🤖 Processing command: ...
📤 Routing NLP processing to config page...
✅ NLP processing successful via config page
📝 Script variables: { ... }
🔄 Substituting {{variable}} with "value"
✅ Script execution completed successfully
🔗 Keeping debugger attached
```

### Good Signs (Config Page)

```
✅ Web Worker created successfully
📦 [AI Worker] Loading Transformers.js library via dynamic import...
✅ [AI Worker] Transformers.js library loaded successfully
🚀 [AI Worker] Loading Granite 4.0 model...
🖥️ [AI Worker] WebGPU available: true
📥 [AI Worker] Loading tokenizer...
📥 [AI Worker] Loading model...
🔥 [AI Worker] Compiling shaders and warming up model...
✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
🤖 [AI Worker] Processing command: ...
```

### Warning Signs (Expected, Not Errors)

```
⚠️ AI model not loaded. Please open Settings page...
⚠️ Using fallback text matching
⚠️ Content script not available, using debugger API
```

These are warnings, not errors. Extension still works with fallback behavior.

---

## Final Checklist

- [ ] All three features tested individually
- [ ] Integration test passed
- [ ] No errors in Service Worker console
- [ ] No errors in Config Page console
- [ ] Model loads successfully
- [ ] NLP commands work
- [ ] Parameters extract correctly
- [ ] Variables substitute correctly
- [ ] Debugger stays attached
- [ ] Fallback works when model not loaded

---

**If all checkboxes checked: ✅ IMPLEMENTATION COMPLETE**

For detailed documentation, see:
- [CONFIG_PAGE_AI_LOADING.md](./CONFIG_PAGE_AI_LOADING.md) - Architecture
- [QUICK_START_AI_MODEL.md](./QUICK_START_AI_MODEL.md) - User guide
- [FINAL_IMPLEMENTATION_SUMMARY.md](./FINAL_IMPLEMENTATION_SUMMARY.md) - Summary
