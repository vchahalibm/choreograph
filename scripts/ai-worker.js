// AI Worker - Runs AI model in Web Worker context
// Uses dynamic import() to load Transformers.js (works in workers, not service workers)

let tokenizer = null;
let model = null;
let modelId = null;
let isLoading = false;
let Transformers = null;

// Listen for messages
self.addEventListener('message', async (event) => {
  const { type, data, messageId } = event.data;

  try {
    switch (type) {
      case 'LOAD_MODEL':
        await handleLoadModel(data, messageId);
        break;

      case 'PROCESS_COMMAND':
        await handleProcessCommand(data, messageId);
        break;

      case 'CHECK_STATUS':
        handleCheckStatus(messageId);
        break;

      default:
        sendError(messageId, `Unknown message type: ${type}`);
    }
  } catch (error) {
    sendError(messageId, error.message, error.stack);
  }
});

// Load Transformers.js library from local file (bundled with extension)
async function loadTransformersLibrary() {
  if (Transformers) {
    return Transformers;
  }

  console.log('📦 [AI Worker] Loading Transformers.js library from local file...');

  try {
    // Load from local file bundled with extension - no CSP restrictions!
    // Use relative path from worker location
    console.log('   📂 Loading from: ./transformers.min.js');
    self.importScripts('./transformers.min.js');

    // Access from global scope after importScripts
    Transformers = self.Transformers;

    if (!Transformers) {
      throw new Error('Transformers.js not found in global scope after importScripts');
    }

    console.log('✅ [AI Worker] Transformers.js library loaded successfully');
    console.log('   📋 Available exports:', Object.keys(Transformers).slice(0, 10).join(', '));
    return Transformers;
  } catch (error) {
    console.error('❌ [AI Worker] Failed to load Transformers.js:', error);
    throw new Error(`Failed to load Transformers.js library: ${error.message}`);
  }
}

// Load the Granite 4.0 model
async function handleLoadModel(data, messageId) {
  if (model && tokenizer) {
    sendResponse(messageId, 'MODEL_LOADED', {
      success: true,
      cached: true,
      modelId,
      device: 'webgpu'
    });
    return;
  }

  if (isLoading) {
    sendResponse(messageId, 'MODEL_LOADING', {
      message: 'Model is already loading...'
    });
    return;
  }

  isLoading = true;
  modelId = data?.modelId || 'onnx-community/granite-4.0-micro-ONNX-web';

  try {
    console.log('🚀 [AI Worker] Loading Granite 4.0 model...');
    console.log('📦 [AI Worker] Model:', modelId);

    // Load Transformers.js library first
    const lib = await loadTransformersLibrary();
    const { AutoTokenizer, AutoModelForCausalLM, env } = lib;

    // Configure Transformers.js
    env.allowLocalModels = false;
    env.backends.onnx.wasm.proxy = false;

    // Check WebGPU availability
    const isWebGPUAvailable = !!self.navigator?.gpu;
    console.log(`🖥️ [AI Worker] WebGPU available: ${isWebGPUAvailable}`);

    // Progress callback
    const progressHandler = (progress) => {
      if (progress.status === 'progress' && progress.progress) {
        console.log(`📥 [AI Worker] Loading ${progress.file}: ${Math.round(progress.progress)}%`);
        sendProgress(messageId, progress.file, progress.progress);
      } else if (progress.status === 'done') {
        console.log(`✅ [AI Worker] Loaded ${progress.file}`);
      } else if (progress.status === 'initiate') {
        console.log(`🔄 [AI Worker] Initiating download: ${progress.file}`);
      }
    };

    // Load tokenizer
    console.log('📥 [AI Worker] Loading tokenizer...');
    tokenizer = await AutoTokenizer.from_pretrained(modelId, {
      progress_callback: progressHandler
    });

    // Load model
    console.log('📥 [AI Worker] Loading model...');
    model = await AutoModelForCausalLM.from_pretrained(modelId, {
      dtype: isWebGPUAvailable ? 'q4f16' : 'q4',
      device: isWebGPUAvailable ? 'webgpu' : 'wasm',
      progress_callback: progressHandler
    });

    // Warm up model
    console.log('🔥 [AI Worker] Compiling shaders and warming up model...');
    const inputs = tokenizer('a');
    await model.generate({ ...inputs, max_new_tokens: 1 });

    console.log(`✅ [AI Worker] Granite 4.0 model loaded successfully on ${isWebGPUAvailable ? 'webgpu' : 'wasm'}`);

    sendResponse(messageId, 'MODEL_LOADED', {
      success: true,
      modelId,
      device: isWebGPUAvailable ? 'webgpu' : 'wasm'
    });
  } catch (error) {
    console.error('❌ [AI Worker] Error loading model:', error);
    sendError(messageId, error.message, error.stack);
  } finally {
    isLoading = false;
  }
}

// Process natural language command
async function handleProcessCommand(data, messageId) {
  if (!model || !tokenizer) {
    sendError(messageId, 'Model not loaded. Call LOAD_MODEL first.');
    return;
  }

  const { command, scripts, options = {} } = data;

  if (!scripts || scripts.length === 0) {
    sendResponse(messageId, 'COMMAND_RESULT', {
      matched: false,
      message: 'No scripts available'
    });
    return;
  }

  console.log('🤖 [AI Worker] Processing command:', command);

  try {
    // Build prompt for script matching
    const scriptsList = scripts.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ''}`).join('\n');

    const prompt = `Available automation scripts:
${scriptsList}

User wants to: ${command}

Match the user's request to a script number (1-${scripts.length}) or 0 if no match.
Answer with just the number:`;

    // Tokenize and generate
    const inputs = tokenizer(prompt);
    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: options.maxTokens || 10,
      do_sample: false,
      temperature: options.temperature || 0.3
    });

    // Decode output
    const generatedText = tokenizer.decode(outputs[0], { skip_special_tokens: true });
    const newText = generatedText.slice(prompt.length).trim();
    console.log('🤖 [AI Worker] Model response:', newText);

    // Extract number from response
    const numberMatch = newText.match(/\d+/);
    if (numberMatch) {
      const scriptIndex = parseInt(numberMatch[0]) - 1;

      if (scriptIndex >= 0 && scriptIndex < scripts.length) {
        const matchedScript = scripts[scriptIndex];

        // Extract parameters from command
        const parameters = extractParameters(command, matchedScript);

        sendResponse(messageId, 'COMMAND_RESULT', {
          matched: true,
          script: matchedScript,
          parameters,
          confidence: 0.8,
          reasoning: 'Matched using Granite 4.0 model in Web Worker'
        });
        return;
      }
    }

    // No match found
    sendResponse(messageId, 'COMMAND_RESULT', {
      matched: false,
      message: 'Model did not provide clear match',
      rawResponse: newText
    });
  } catch (error) {
    console.error('❌ [AI Worker] Error processing command:', error);
    sendError(messageId, error.message, error.stack);
  }
}

// Extract parameters from natural language command
function extractParameters(command, script) {
  const parameters = {};

  if (!script.parameters) {
    return parameters;
  }

  for (const [paramName, defaultValue] of Object.entries(script.parameters)) {
    // Look for quoted strings in command
    const quotedMatch = command.match(/"([^"]+)"|'([^']+)'/);
    if (quotedMatch) {
      parameters[paramName] = quotedMatch[1] || quotedMatch[2];
      continue;
    }

    // Look for words after "for", "with", "to", "named"
    const forMatch = command.match(/(?:for|with|to|named?)\s+(\w+)/i);
    if (forMatch) {
      parameters[paramName] = forMatch[1];
      continue;
    }

    // Look for capitalized words (likely names)
    const capitalMatch = command.match(/\b([A-Z][a-z]+)\b/);
    if (capitalMatch) {
      parameters[paramName] = capitalMatch[1];
    }
  }

  return parameters;
}

// Check worker status
function handleCheckStatus(messageId) {
  sendResponse(messageId, 'STATUS', {
    modelLoaded: !!(model && tokenizer),
    isLoading,
    modelId,
    transformersLoaded: !!Transformers
  });
}

// Send response
function sendResponse(messageId, type, data) {
  self.postMessage({
    messageId,
    type,
    data
  });
}

// Send progress update
function sendProgress(messageId, file, progress) {
  self.postMessage({
    messageId,
    type: 'PROGRESS',
    data: { file, progress }
  });
}

// Send error
function sendError(messageId, message, stack) {
  self.postMessage({
    messageId,
    type: 'ERROR',
    error: { message, stack }
  });
}

console.log('✅ [AI Worker] Web Worker initialized and ready');
