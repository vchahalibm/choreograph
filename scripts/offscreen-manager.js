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
    const { callback } = pendingRequests.get(messageId);
    pendingRequests.delete(messageId);

    console.log(`📤 [Offscreen] Forwarding response. Type: ${type}, HasData: ${!!data}`);
    if (data) {
      console.log(`📦 [Offscreen] Response data:`, data);
    }

    // Call the callback to send response back
    if (callback) {
      callback({
        type: type,
        data: data,
        error: error
      });
    }
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

  if (message.type === 'PROCESS_COMMAND') {
    console.log('📥 [Offscreen] Received PROCESS_COMMAND via sendMessage');

    if (!modelLoaded) {
      console.warn('⚠️ [Offscreen] Model not loaded yet, rejecting request');
      sendResponse({
        type: 'ERROR',
        error: { message: 'Model not loaded yet. Please wait...' }
      });
      return true;
    }

    const { data } = message;
    console.log(`🚀 [Offscreen] Processing command: "${data?.command}"`);

    // Forward to AI worker
    const workerMsgId = ++workerMessageId;

    // Store callback for when worker responds
    const responseCallback = (response) => {
      console.log('✅ [Offscreen] Sending response back to background');
      sendResponse(response);
    };

    // Store in pending requests
    pendingRequests.set(workerMsgId, {
      callback: responseCallback
    });

    console.log(`🔀 [Offscreen] Mapped workerMsgId ${workerMsgId}`);

    // Send to worker
    aiWorker.postMessage({
      type: 'PROCESS_COMMAND',
      data: data,
      messageId: workerMsgId
    });

    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }

  return false;
});

// Note: Removed port connection handling - now using chrome.runtime.sendMessage
// which is more reliable for request-response patterns

// Initialize worker when this script loads
initializeWorker();

console.log('✅ [Offscreen] Offscreen manager initialized and ready');

// Keep offscreen document alive with periodic heartbeat
setInterval(() => {
  console.log(`💓 [Offscreen] Heartbeat - Model loaded: ${modelLoaded}`);
}, 60000); // Every minute
