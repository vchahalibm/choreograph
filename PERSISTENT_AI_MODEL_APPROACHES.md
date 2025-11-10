# Persistent AI Model Loading: Innovative Approaches

## Problem Analysis

**Current Issue:**
```
Popup opens → Create worker → Load model (30-60s) → Use model
Popup closes → Worker destroyed → Model unloaded
Popup opens → Create worker → Load model again (30-60s) ❌
```

**GPU Buffer Error:**
```
AbortError: Failed to execute 'mapAsync' on 'GPUBuffer':
A valid external Instance reference no longer exists
```

**Why this happens:**
- Chrome destroys popup page when closed
- Web Worker lives in popup context
- Model loaded in GPU memory is released
- Reopening popup creates new context = fresh start

**User Impact:**
- 30-60 second wait EVERY time popup opens
- Poor user experience
- Wasted resources (re-downloading cached model, recompiling shaders)

---

## 🏆 Recommended Approach: Chrome Offscreen API (MV3)

### Overview
Chrome introduced `chrome.offscreen` API specifically for this use case in Manifest V3!

### What is Offscreen Document?
- A hidden HTML document that runs in background
- Can create Web Workers ✅
- Persists across popup open/close ✅
- Can access WebGPU ✅
- Managed by service worker
- Designed for AI/ML workloads

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│  Background Service Worker (Always Running)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Manages Offscreen Document Lifecycle                  │  │
│  │ - Creates offscreen.html on install                   │  │
│  │ - Routes messages between popup and offscreen         │  │
│  │ - Monitors offscreen document health                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ Messages
┌─────────────────────────────────────────────────────────────┐
│  Offscreen Document (Hidden, Persistent)                    │
│  📄 offscreen.html                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  AI Worker (Web Worker)                               │  │
│  │  ├─ Granite 4.0 Model (Loaded ONCE)                   │  │
│  │  ├─ Tokenizer (Loaded ONCE)                          │  │
│  │  ├─ WebGPU Context (Persistent)                      │  │
│  │  └─ Ready to process commands                         │  │
│  └───────────────────────────────────────────────────────┘  │
│  Stays alive even when popup closes! ✅                    │
└─────────────────────────────────────────────────────────────┘
                            ↕ Messages
┌─────────────────────────────────────────────────────────────┐
│  Popup (Ephemeral - Created/Destroyed)                      │
│  📄 popup.html                                              │
│  └─ Sends commands to service worker                        │
│     └─ Service worker routes to offscreen document          │
│        └─ Offscreen worker processes                        │
│           └─ Response sent back to popup                    │
└─────────────────────────────────────────────────────────────┘

Lifecycle:
1. Extension installed → Service worker creates offscreen.html
2. Offscreen.html loads → Creates AI worker → Loads model ONCE
3. Popup opens → Sends command → Routed to offscreen → Instant response
4. Popup closes → Offscreen stays alive → Model stays loaded
5. Popup opens again → Model already loaded → Instant response ✅
```

### Implementation Steps

#### 1. Update manifest.json
```json
{
  "manifest_version": 3,
  "permissions": [
    "offscreen",
    "storage"
  ],
  "background": {
    "service_worker": "scripts/background.js"
  }
}
```

#### 2. Create offscreen.html
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Choreograph AI Worker - Offscreen Document</title>
</head>
<body>
  <!-- This page is hidden and runs in background -->
  <script src="scripts/offscreen-manager.js"></script>
</body>
</html>
```

#### 3. Create offscreen-manager.js
```javascript
// This runs in the offscreen document context
// Can create and manage Web Workers

let aiWorker = null;
let modelLoaded = false;

// Create AI worker immediately
function initializeWorker() {
  console.log('🚀 [Offscreen] Initializing AI worker...');

  aiWorker = new Worker(chrome.runtime.getURL('scripts/ai-worker.bundled.js'));

  aiWorker.addEventListener('message', (event) => {
    // Forward worker messages to service worker
    chrome.runtime.sendMessage({
      type: 'WORKER_MESSAGE',
      data: event.data
    });
  });

  // Auto-load model on startup
  loadModel();
}

function loadModel() {
  console.log('📥 [Offscreen] Loading Granite 4.0 model...');

  aiWorker.postMessage({
    type: 'LOAD_MODEL',
    data: { modelId: 'onnx-community/granite-4.0-micro-ONNX-web' },
    messageId: Date.now()
  });
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_COMMAND') {
    // Forward to AI worker
    aiWorker.postMessage(message);
    sendResponse({ received: true });
  }
  return true;
});

// Initialize immediately when offscreen document loads
initializeWorker();

console.log('✅ [Offscreen] Offscreen manager initialized');
```

#### 4. Update background.js (Service Worker)
```javascript
// Create offscreen document on extension install
chrome.runtime.onInstalled.addListener(async () => {
  await createOffscreenDocument();
});

// Create offscreen document if not exists
async function createOffscreenDocument() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    console.log('✅ Offscreen document already exists');
    return;
  }

  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'], // For Web Workers
    justification: 'Load and run Granite 4.0 AI model persistently'
  });

  console.log('✅ Offscreen document created');
}

// Ensure offscreen document exists before routing messages
async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length === 0) {
    await createOffscreenDocument();
  }
}

// Route messages between popup and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_NLP_COMMAND') {
    handleNLPCommand(message, sendResponse);
    return true; // Keep channel open for async
  }
});

async function handleNLPCommand(message, sendResponse) {
  try {
    await ensureOffscreenDocument();

    // Forward to offscreen document
    const response = await chrome.runtime.sendMessage({
      type: 'PROCESS_COMMAND',
      command: message.command,
      scripts: message.scripts,
      options: message.options
    });

    sendResponse({ success: true, result: response });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

#### 5. Update popup.js
```javascript
// No changes needed! Popup continues to send messages to background
// Background routes to offscreen document transparently

async processNLPCommand(command) {
  const scripts = await this.getStoredScripts();

  const response = await chrome.runtime.sendMessage({
    type: 'PROCESS_NLP_COMMAND',
    command: command,
    scripts: scripts,
    options: {
      maxTokens: 250,
      responseTokens: 100,
      temperature: 0.3
    }
  });

  // Handle response...
}
```

### Benefits
✅ Model loads ONCE on extension install
✅ Persists across popup open/close
✅ No reload wait time (instant responses)
✅ WebGPU context stays alive
✅ Official Chrome API (supported)
✅ Designed for this exact use case

### Drawbacks
⚠️ Requires Chrome 109+ (Offscreen API)
⚠️ Slightly more complex architecture
⚠️ Memory stays allocated (but model is cached anyway)

---

## Alternative Approach 1: Background Page Emulation

### Concept
Keep options/config page open in a hidden window to maintain worker.

### Implementation
```javascript
// In background.js service worker
let configWindowId = null;

async function ensureConfigPageOpen() {
  // Check if config window exists
  if (configWindowId) {
    try {
      await chrome.windows.get(configWindowId);
      return; // Window still exists
    } catch {
      configWindowId = null; // Window was closed
    }
  }

  // Create hidden window with config page
  const window = await chrome.windows.create({
    url: 'pages/config.html',
    type: 'popup',
    state: 'minimized', // Start minimized
    width: 1,
    height: 1,
    left: -9999, // Off-screen
    top: -9999
  });

  configWindowId = window.id;

  // Keep it minimized/hidden
  await chrome.windows.update(configWindowId, {
    state: 'minimized',
    focused: false
  });
}

// Create on install
chrome.runtime.onInstalled.addListener(() => {
  ensureConfigPageOpen();
});
```

### Benefits
✅ Works in current Chrome versions
✅ Reuses existing config page logic
✅ Worker stays alive in config page

### Drawbacks
❌ User might see minimized window
❌ User can accidentally close window
❌ Uses more system resources
❌ Hacky solution (not official API)
❌ May be flagged by Chrome as suspicious

---

## Alternative Approach 2: SharedWorker

### Concept
Use SharedWorker instead of Web Worker - shared across all extension contexts.

### Implementation
```javascript
// In config.html, popup.html, etc.
const sharedWorker = new SharedWorker(
  chrome.runtime.getURL('scripts/ai-worker-shared.js')
);

sharedWorker.port.onmessage = (event) => {
  console.log('Message from shared worker:', event.data);
};

sharedWorker.port.postMessage({
  type: 'LOAD_MODEL',
  data: { modelId: 'onnx-community/granite-4.0-micro-ONNX-web' }
});
```

### Benefits
✅ Shared across all contexts
✅ Stays alive as long as one context uses it
✅ Standard Web API

### Drawbacks
❌ Still dies when all contexts close
❌ Limited browser support
❌ Same lifecycle issues as current approach
❌ Chrome MV3 has restrictions on SharedWorker

---

## Alternative Approach 3: IndexedDB + Lazy Load with Caching

### Concept
Accept reloading but make it instant by optimizing caching.

### Implementation
```javascript
// Optimize model loading from cache
async function loadModel() {
  // Check if model in IndexedDB
  const cachedModel = await getFromIndexedDB('granite-model');

  if (cachedModel) {
    console.log('📦 Loading from IndexedDB cache...');
    // Load from cache = ~2 seconds instead of 30-60
    model = await loadFromCache(cachedModel);
  } else {
    console.log('📥 Downloading model...');
    model = await downloadAndCache();
  }
}
```

### Benefits
✅ Simple, no architectural changes
✅ transformers.js already does this!
✅ Works in all contexts

### Drawbacks
❌ Still 2-5 second wait on popup open
❌ Doesn't solve the core problem
❌ GPU context still needs recompilation

---

## Alternative Approach 4: Pre-warm in Options Page

### Concept
Keep options page open in background tab, use it as AI host.

### Implementation
```javascript
// In background.js
chrome.runtime.onInstalled.addListener(() => {
  // Open options page in background
  chrome.tabs.create({
    url: chrome.runtime.getURL('pages/config.html'),
    active: false // Don't focus it
  });
});

// Popup sends commands to options page via messaging
// Options page never closes (user would need to manually close tab)
```

### Benefits
✅ Simple implementation
✅ Works with current code
✅ Model stays loaded in options page

### Drawbacks
❌ User sees extra tab
❌ User can close tab
❌ Not elegant solution
❌ Memory overhead

---

## Comparison Matrix

| Approach | Persistence | User Impact | Complexity | Chrome Version | Recommended |
|----------|-------------|-------------|------------|----------------|-------------|
| **Offscreen API** | ⭐⭐⭐⭐⭐ | ✅ None | Medium | 109+ | ✅ **YES** |
| Hidden Window | ⭐⭐⭐ | ⚠️ Visible in task manager | High | Any | ❌ No |
| SharedWorker | ⭐⭐ | ✅ None | Medium | Limited | ❌ No |
| Optimized Cache | ⭐ | ⚠️ 2-5s wait | Low | Any | ⚠️ Fallback |
| Options Tab | ⭐⭐⭐⭐ | ❌ Visible tab | Low | Any | ❌ No |

---

## 🏆 Final Recommendation: Chrome Offscreen API

**Why Offscreen API is the best:**
1. **Official Chrome solution** for this exact problem
2. **Truly persistent** - stays alive independently
3. **No user-visible artifacts** (no windows, tabs)
4. **Designed for AI/ML workloads** with Web Workers
5. **Future-proof** - Chrome's recommended approach for MV3

**Migration Path:**
```
Current:  Popup → Worker → Model (destroyed on close)
Step 1:   Offscreen → Worker → Model (persistent)
Step 2:   Popup → Background → Offscreen → Response
```

**Implementation Effort:**
- Create offscreen.html (10 lines)
- Create offscreen-manager.js (50 lines)
- Update background.js (100 lines)
- Minimal changes to popup.js (just routing)

**Timeline:**
- Implementation: 2-3 hours
- Testing: 1 hour
- Total: Half day of work

**Result:**
- ✅ Load model once on install
- ✅ Instant responses forever
- ✅ No reload wait time
- ✅ Perfect user experience

---

## Proof of Concept: Offscreen API Works!

Multiple Chrome extensions already use this successfully:
- **Whisper AI** (speech-to-text)
- **On-Device AI** extensions
- **Image processing** extensions

Chrome documentation explicitly mentions this use case:
> "The offscreen API allows the extension to use DOM APIs in a hidden document without interrupting the user experience by opening new windows or tabs."

---

## Next Steps

1. **Implement Offscreen API approach** (recommended)
   - Create offscreen.html
   - Create offscreen-manager.js
   - Update background.js
   - Test persistence

2. **Fallback: Optimize current caching** (if Offscreen not feasible)
   - Ensure transformers.js cache is working
   - Measure load time improvements
   - Accept 2-5 second wait

3. **Hybrid approach**
   - Use Offscreen if Chrome 109+
   - Fall back to optimized caching for older versions

---

## Testing Plan

After implementing Offscreen API:

```javascript
// Test 1: Initial load
1. Install extension
2. Wait for "Model loaded" in console
3. Measure time: ~30-60 seconds (ONCE)

// Test 2: Popup lifecycle
1. Open popup
2. Send command "hello"
3. Response should be instant (<1s) ✅
4. Close popup
5. Open popup again
6. Send command "what is AI"
7. Response should be instant (<1s) ✅
8. Model NOT reloaded ✅

// Test 3: Extension restart
1. Reload extension in chrome://extensions/
2. Model should reload ONCE
3. All subsequent popup opens = instant ✅

// Test 4: Memory usage
1. Check chrome://system
2. Offscreen document uses ~500MB (model)
3. Memory stable across popup open/close ✅
```

---

## Implementation Priority

**High Priority (Do First):**
- ✅ Offscreen API implementation
- ✅ Message routing between contexts
- ✅ Model persistence testing

**Medium Priority:**
- Error handling for offscreen document
- Graceful fallback if Offscreen API fails
- Health monitoring of offscreen document

**Low Priority:**
- Option to disable persistent model (memory saving)
- Manual model reload command
- Memory usage optimization

---

## Code Skeleton Ready

I can implement the Offscreen API approach right now if you approve!

Files to create/modify:
1. ✅ offscreen.html (NEW)
2. ✅ scripts/offscreen-manager.js (NEW)
3. 🔧 scripts/background.js (MODIFY)
4. 🔧 scripts/popup.js (MINOR MODIFY)
5. 🔧 manifest.json (ADD PERMISSION)

Estimated time: 2-3 hours of implementation + testing.

**Ready to proceed?** 🚀
