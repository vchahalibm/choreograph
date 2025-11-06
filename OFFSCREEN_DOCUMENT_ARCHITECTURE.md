# Offscreen Document Architecture for AI Model

## Problem

Chrome Extension Service Workers have a critical limitation: **they cannot use `new Worker()` or dynamic `import()`**. This is by design as per the [W3C Service Worker specification](https://github.com/w3c/ServiceWorker/issues/1356).

The Granite 4.0 model via `@huggingface/transformers@3.7.5` requires dynamic imports to load ONNX Runtime, which makes it impossible to run directly in a Service Worker.

### Error We Were Getting

```
❌ Failed to initialize AI Worker: ReferenceError: Worker is not defined
```

## Solution: Offscreen Documents

Chrome provides the **Offscreen API** specifically for this use case. An offscreen document is an HTML page that runs in a separate context and **DOES support Web Workers and dynamic imports**.

## Architecture

```
┌─────────────────────────┐
│  Service Worker         │
│  (background.js)        │
│                         │
│  - Orchestrates tasks   │
│  - Cannot use Workers   │
└──────────┬──────────────┘
           │ chrome.runtime.sendMessage()
           │
           ▼
┌─────────────────────────┐
│  Offscreen Document     │
│  (offscreen.html)       │
│  (offscreen-bridge.js)  │
│                         │
│  - HTML page context    │
│  - CAN use new Worker() │
└──────────┬──────────────┘
           │ new Worker()
           │
           ▼
┌─────────────────────────┐
│  Web Worker             │
│  (ai-worker.js)         │
│                         │
│  - Loads Granite 4.0    │
│  - Runs AI inference    │
│  - Uses dynamic import()│
└─────────────────────────┘
```

## Message Flow

### 1. Service Worker → Offscreen Document

```javascript
// background.js
chrome.runtime.sendMessage({
  target: 'offscreen',
  type: 'LOAD_MODEL',
  data: { modelId: 'onnx-community/granite-4.0-micro-ONNX-web' },
  messageId: 1
});
```

### 2. Offscreen Document → Web Worker

```javascript
// offscreen-bridge.js
worker.postMessage({
  type: 'LOAD_MODEL',
  data: { modelId: 'onnx-community/granite-4.0-micro-ONNX-web' },
  messageId: 1
});
```

### 3. Web Worker → Offscreen Document

```javascript
// ai-worker.js
self.postMessage({
  messageId: 1,
  type: 'MODEL_LOADED',
  data: { success: true, device: 'webgpu' }
});
```

### 4. Offscreen Document → Service Worker

```javascript
// offscreen-bridge.js
chrome.runtime.sendMessage({
  source: 'ai-worker',
  data: {
    messageId: 1,
    type: 'MODEL_LOADED',
    data: { success: true, device: 'webgpu' }
  }
});
```

## Implementation Details

### 1. Manifest Changes

Added `offscreen` permission:

```json
{
  "permissions": [
    "debugger",
    "tabs",
    "activeTab",
    "storage",
    "scripting",
    "downloads",
    "offscreen"
  ]
}
```

### 2. Created Files

- **`pages/offscreen.html`** - The offscreen document HTML page
- **`scripts/offscreen-bridge.js`** - Bridge between service worker and web worker
- **`scripts/ai-worker.js`** - The actual Web Worker with AI model (already existed)

### 3. Service Worker Initialization

```javascript
// background.js
async initAIWorker() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    console.log('✅ Offscreen document already exists');
    this.aiWorker = true;
    return;
  }

  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'pages/offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Run AI model in Web Worker for NLP processing'
  });

  console.log('✅ Offscreen document created for AI Worker');
  this.aiWorker = true;
}
```

### 4. Offscreen Bridge

```javascript
// offscreen-bridge.js
let worker = new Worker(chrome.runtime.getURL('scripts/ai-worker.js'), { type: 'module' });

// Relay messages from service worker to web worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.target === 'offscreen') {
    worker.postMessage(message);
  }
});

// Relay messages from web worker to service worker
worker.addEventListener('message', (event) => {
  chrome.runtime.sendMessage({
    source: 'ai-worker',
    data: event.data
  });
});
```

## Benefits

1. **No Service Worker Limitations** - Offscreen documents run in a regular web page context
2. **Full Web Worker Support** - Can create Workers and use dynamic imports
3. **WebGPU Support** - Can access GPU for model acceleration
4. **Persistent Context** - Offscreen document stays alive as long as needed
5. **Clean Architecture** - Clear separation of concerns

## Testing

To verify the offscreen document is working:

1. Open `chrome://extensions/` → DeskAgent → Service Worker → Console
2. You should see:
   ```
   ✅ Offscreen document created for AI Worker
   ```

3. Open `chrome://extensions/` → DeskAgent → "Inspect views: offscreen page"
4. You should see:
   ```
   ✅ [Offscreen Bridge] Web Worker created successfully
   ✅ [AI Worker] Web Worker initialized and ready
   ```

5. Try loading the model via the popup:
   ```
   Type: load model
   ```

6. Check the offscreen document console for:
   ```
   🚀 [AI Worker] Loading Granite 4.0 model...
   📥 [AI Worker] Loading tokenizer...
   📥 [AI Worker] Loading model...
   🔥 [AI Worker] Compiling shaders and warming up model...
   ✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
   ```

## References

- [Chrome Offscreen API Documentation](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Service Worker Limitations](https://github.com/w3c/ServiceWorker/issues/1356)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
