// Offscreen Manager - Persistent AI Worker Host
// This runs in the offscreen document context (hidden, persistent)
// Purpose: Keep AI worker and model loaded across popup open/close

console.log('🚀 [Offscreen] Initializing offscreen document...');

let aiWorker = null;
let modelLoaded = false;
let isModelLoading = false;
let workerMessageId = 0;
let pendingRequests = new Map();

// Initialize AI Worker immediately when offscreen document loads
function initializeWorker() {
  console.log('🔧 [Offscreen] Creating AI Worker...');

  try {
    aiWorker = new Worker(chrome.runtime.getURL('scripts/ai-worker.bundled.js'));

    // Listen for messages from AI worker
    aiWorker.addEventListener('message', (event) => {
      handleWorkerMessage(event.data);
    });

    // Listen for errors from AI worker
    aiWorker.addEventListener('error', (error) => {
      console.error('❌ [Offscreen] AI Worker error:', error);
    });

    console.log('✅ [Offscreen] AI Worker created successfully');

    // Auto-load model on startup
    autoLoadModel();
  } catch (error) {
    console.error('❌ [Offscreen] Failed to create AI Worker:', error);
  }
}

// Auto-load model when offscreen document starts
function autoLoadModel() {
  if (modelLoaded || isModelLoading) {
    console.log('⏭️ [Offscreen] Model already loaded or loading');
    return;
  }

  console.log('📥 [Offscreen] Auto-loading Granite 4.0 model...');
  isModelLoading = true;

  const messageId = ++workerMessageId;

  aiWorker.postMessage({
    type: 'LOAD_MODEL',
    data: { modelId: 'onnx-community/granite-4.0-micro-ONNX-web' },
    messageId: messageId
  });
}

// Handle messages from AI worker
function handleWorkerMessage(message) {
  const { messageId, type, data, error } = message;

  console.log(`📨 [Offscreen] Worker message: ${type}`, messageId);

  // Handle model loaded
  if (type === 'MODEL_LOADED' && data?.success) {
    modelLoaded = true;
    isModelLoading = false;
    console.log(`✅ [Offscreen] Model loaded successfully on ${data.device || 'unknown'}`);

    // Notify background that model is ready
    chrome.runtime.sendMessage({
      type: 'MODEL_STATUS',
      loaded: true,
      device: data.device
    }).catch(err => console.log('Background not ready yet:', err.message));
  }

  // Handle progress updates
  if (type === 'PROGRESS') {
    console.log(`📊 [Offscreen] Loading ${data.file}: ${Math.round(data.progress || 0)}%`);
  }

  // Forward worker response to pending request
  if (messageId && pendingRequests.has(messageId)) {
    const { port, requestId } = pendingRequests.get(messageId);
    pendingRequests.delete(messageId);

    console.log(`📤 [Offscreen] Forwarding response to popup. RequestId: ${requestId}, Type: ${type}, HasData: ${!!data}`);
    if (data) {
      console.log(`📦 [Offscreen] Response data:`, data);
    }

    // Send response back through the port
    port.postMessage({
      requestId: requestId,
      type: type,
      data: data,
      error: error
    });
  } else if (messageId) {
    console.warn(`⚠️ [Offscreen] No pending request found for messageId: ${messageId}`);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📬 [Offscreen] Received message:', message.type);

  if (message.type === 'CHECK_MODEL_STATUS') {
    sendResponse({
      loaded: modelLoaded,
      loading: isModelLoading
    });
    return true;
  }

  if (message.type === 'RELOAD_MODEL') {
    modelLoaded = false;
    isModelLoading = false;
    autoLoadModel();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Listen for connections from background (for streaming responses)
chrome.runtime.onConnect.addListener((port) => {
  console.log('🔌 [Offscreen] Port connected:', port.name);

  port.onMessage.addListener((message) => {
    const { type, data, requestId } = message;

    console.log(`📥 [Offscreen] Port message: ${type}, requestId: ${requestId}`);

    if (type === 'PROCESS_COMMAND') {
      if (!modelLoaded) {
        console.warn('⚠️ [Offscreen] Model not loaded yet, rejecting request');
        port.postMessage({
          requestId: requestId,
          type: 'ERROR',
          error: { message: 'Model not loaded yet. Please wait...' }
        });
        return;
      }

      console.log(`🚀 [Offscreen] Processing command: "${data?.command}" (requestId: ${requestId})`);

      // Forward to AI worker
      const workerMsgId = ++workerMessageId;

      // Store request mapping
      pendingRequests.set(workerMsgId, {
        port: port,
        requestId: requestId
      });

      console.log(`🔀 [Offscreen] Mapped requestId ${requestId} → workerMsgId ${workerMsgId}`);

      // Send to worker
      aiWorker.postMessage({
        type: 'PROCESS_COMMAND',
        data: data,
        messageId: workerMsgId
      });
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('🔌 [Offscreen] Port disconnected');
  });
});

// Initialize worker when this script loads
initializeWorker();

console.log('✅ [Offscreen] Offscreen manager initialized and ready');

// Keep offscreen document alive with periodic heartbeat
setInterval(() => {
  console.log(`💓 [Offscreen] Heartbeat - Model loaded: ${modelLoaded}`);
}, 60000); // Every minute
