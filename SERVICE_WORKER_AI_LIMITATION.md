# Service Worker AI Model Limitation

## Critical Issue Discovered

**Service Workers CANNOT load AI models that require dynamic `import()`**

### The Error
```
Error: no available backend found. ERR: [webgpu] TypeError: import() is disallowed on ServiceWorkerGlobalScope by the HTML specification. See https://github.com/w3c/ServiceWorker/issues/1356.
```

### Root Cause

1. **Transformers.js uses dynamic imports** to load ONNX Runtime:
   ```javascript
   // Inside transformers.js
   const ort = await import('onnx-runtime-web');
   ```

2. **Service Workers don't support `import()`**:
   - HTML specification explicitly disallows it
   - Security and lifecycle reasons
   - Won't be fixed (by design)

3. **This affects ALL backends**:
   - ❌ WebGPU - requires dynamic import
   - ❌ WASM - also requires dynamic import for ort-wasm
   - ❌ WebNN - requires dynamic import

## Solutions

### Option 1: Remove AI Model Feature ❌

**Simplest but removes functionality**

- Keep variable substitution ✅
- Keep debugger persistence ✅
- Remove AI-powered script matching ❌

### Option 2: Use Fallback Text Matching Only ✅ (Current Implementation)

**Already implemented in the code**

The `fallbackScriptMatching()` method provides basic matching:

```javascript
fallbackScriptMatching(command, scripts) {
  const commandLower = command.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const script of scripts) {
    const scriptText = `${script.title || ''} ${script.description || ''}`.toLowerCase();
    const commandWords = commandLower.split(/\s+/);
    const matches = commandWords.filter(word => scriptText.includes(word)).length;
    const score = matches / commandWords.length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = script;
    }
  }

  if (bestScore > 0.3) {
    return { matched: true, script: bestMatch, confidence: bestScore, parameters: {} };
  }

  return { matched: false, message: 'No matching script found', bestScore };
}
```

**Works without AI model:**
- Simple word matching
- No external dependencies
- Fast and lightweight
- Good enough for basic matching

### Option 3: Use Web Worker for Model (Recommended) ✅

**Best solution but requires refactoring**

#### Architecture

```
┌─────────────────────┐
│  Service Worker     │
│  (background.js)    │
│  - Script execution │
│  - Debugger API     │
│  - Message routing  │
└──────────┬──────────┘
           │ postMessage
           ▼
┌─────────────────────┐
│  Web Worker         │
│  (ai-worker.js)     │
│  - Load AI model    │
│  - Process commands │
│  - Return matches   │
└─────────────────────┘
```

#### Implementation Steps

1. **Create ai-worker.js**
   ```javascript
   // ai-worker.js
   import { AutoTokenizer, AutoModelForCausalLM } from '@huggingface/transformers@3.7.5';

   let model = null;
   let tokenizer = null;

   self.addEventListener('message', async (event) => {
     const { type, data } = event.data;

     if (type === 'LOAD_MODEL') {
       try {
         tokenizer = await AutoTokenizer.from_pretrained('onnx-community/granite-4.0-micro-ONNX-web');
         model = await AutoModelForCausalLM.from_pretrained('onnx-community/granite-4.0-micro-ONNX-web', {
           dtype: 'q4f16',
           device: 'webgpu'
         });
         self.postMessage({ type: 'MODEL_LOADED', success: true });
       } catch (error) {
         self.postMessage({ type: 'MODEL_LOADED', success: false, error: error.message });
       }
     }

     if (type === 'PROCESS_COMMAND') {
       // Process with model...
       const result = await processCommand(data.command, data.scripts);
       self.postMessage({ type: 'COMMAND_RESULT', result });
     }
   });
   ```

2. **Update background.js**
   ```javascript
   class DeskAgentBackground {
     constructor() {
       // Create worker
       this.aiWorker = new Worker('scripts/ai-worker.js', { type: 'module' });

       // Listen for worker messages
       this.aiWorker.addEventListener('message', (event) => {
         this.handleWorkerMessage(event.data);
       });
     }

     async loadNLPModel() {
       return new Promise((resolve, reject) => {
         this.aiWorker.postMessage({ type: 'LOAD_MODEL' });
         // Handle response...
       });
     }

     async processNLPCommand(command) {
       return new Promise((resolve, reject) => {
         this.aiWorker.postMessage({
           type: 'PROCESS_COMMAND',
           data: { command, scripts: await this.getStoredScripts() }
         });
         // Handle response...
       });
     }
   }
   ```

3. **Update manifest.json**
   ```json
   {
     "web_accessible_resources": [
       {
         "resources": ["scripts/ai-worker.js"],
         "matches": ["<all_urls>"]
       }
     ]
   }
   ```

### Option 4: Use Offscreen Document (Chrome 109+) ✅

**Similar to Web Worker but Chrome-specific**

```javascript
// background.js
async function loadModel() {
  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Load AI model'
  });

  // Communicate with offscreen document
  const response = await chrome.runtime.sendMessage({ type: 'LOAD_MODEL' });
}
```

## Recommendation

### Short Term: Use Fallback Text Matching ✅

**Status**: Already implemented

```javascript
async processNLPCommand(command) {
  // Try to load model (will fail in service worker)
  try {
    if (!this.nlpModel) {
      await this.loadNLPModel();
    }
    // Use model...
  } catch (error) {
    console.warn('Model not available, using fallback');
    return this.fallbackScriptMatching(command, scripts);
  }
}
```

**Pros:**
- ✅ Works immediately
- ✅ No refactoring needed
- ✅ Fast and reliable
- ✅ Good enough for basic use

**Cons:**
- ❌ Less intelligent matching
- ❌ No parameter extraction from NLP
- ❌ No confidence scores

### Long Term: Implement Web Worker ⏳

**Status**: Future enhancement

**Pros:**
- ✅ Full AI model support
- ✅ WebGPU acceleration
- ✅ Proper separation of concerns
- ✅ Better performance (off main thread)

**Cons:**
- ⏰ Requires refactoring
- ⏰ More complex architecture
- ⏰ Additional files to maintain

## Current Code Status

### What Works ✅

1. **Variable Substitution** - Fully functional
   ```javascript
   { "value": "{{searchText}}" } → { "value": "John" }
   ```

2. **Debugger Persistence** - Fully functional
   ```javascript
   // Debugger stays attached, auto-reattaches on detach
   ```

3. **Fallback Text Matching** - Fully functional
   ```javascript
   command: "search whatsapp"
   → matches "WhatsappReadMsg" script
   ```

### What Doesn't Work ❌

1. **AI Model Loading in Service Worker**
   ```javascript
   await loadNLPModel() // ❌ Fails with import() error
   ```

2. **Granite 4.0 in Service Worker**
   ```javascript
   // ❌ Can't use any transformer model in service worker
   ```

### What Needs Update 📝

**Remove AI model loading attempts in service worker:**

```javascript
// background.js
async processNLPCommand(command, options = {}) {
  // Don't try to load model in service worker
  // Go straight to fallback
  const scripts = await this.getStoredScripts();
  return this.fallbackScriptMatching(command, scripts);
}
```

## Updated Documentation

### FEATURES_UPDATE.md
- ⚠️ Note: AI model runs in fallback mode (text matching)
- ⚠️ Full AI support requires Web Worker (future enhancement)

### QUICK_START.md
- Update to show fallback matching is default
- Remove AI model loading instructions (for now)

### README.md
- Add service worker limitation note
- Explain fallback text matching
- Roadmap: Web Worker implementation

## Testing the Current State

### What to Test ✅

1. **Variable substitution**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'EXECUTE_SCRIPT',
     scriptId: 'whatsapp-script',
     parameters: { searchText1: "Test" }
   });
   ```

2. **Debugger persistence**
   ```javascript
   // Run script, verify debugger stays attached
   ```

3. **Fallback text matching**
   ```javascript
   chrome.runtime.sendMessage({
     type: 'PROCESS_NLP_COMMAND',
     command: 'search whatsapp'
   });
   // Should match WhatsappReadMsg using text matching
   ```

### What NOT to Test ❌

1. ~~AI model loading~~ - Won't work in service worker
2. ~~WebGPU acceleration~~ - Requires Web Worker
3. ~~Advanced NLP features~~ - Requires model

## Migration Path

### Phase 1: Current (Fallback Mode) ✅
- Use text matching
- Document limitation
- All other features work

### Phase 2: Web Worker Implementation ⏳
- Create ai-worker.js
- Move model loading to worker
- Update message passing

### Phase 3: Offscreen Document (Optional) ⏳
- Chrome 109+ feature
- Better lifecycle management
- Official Chrome extension pattern

## References

- [Service Worker Import Issue](https://github.com/w3c/ServiceWorker/issues/1356)
- [Chrome Offscreen Documents](https://developer.chrome.com/docs/extensions/reference/offscreen/)
- [Web Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)

## Conclusion

**Service Workers fundamentally cannot load AI models** due to lack of dynamic `import()` support.

**Current approach:** Use fallback text matching (works well for basic use cases)

**Future approach:** Move AI model to Web Worker (proper solution, requires refactoring)

**User impact:**
- ✅ All core features (variables, debugger) work
- ⚠️ AI matching is basic (text-based, not NLP-based)
- ✅ Can be upgraded to full AI in future (Web Worker)

---

**Last Updated**: 2025-10-12
**Status**: Limitation identified, fallback implemented
**Next**: Continue with text matching or implement Web Worker
