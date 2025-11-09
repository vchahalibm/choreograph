// AI Worker Source - Webpack Entry Point for Granite 4.0 Model
// This file will be bundled by webpack with @huggingface/transformers
import { AutoTokenizer, AutoModelForCausalLM, env } from '@huggingface/transformers';

let tokenizer = null;
let model = null;
let modelId = null;
let isLoading = false;

// Configure Transformers.js environment for local ONNX runtime
// This prevents CDN requests and uses bundled WASM files
env.backends.onnx.wasm.wasmPaths = self.location.href.replace(/\/[^\/]+$/, '/');
env.allowRemoteModels = true;
env.allowLocalModels = false;

// Export to global scope for use in Web Worker
self.Transformers = {
  AutoTokenizer,
  AutoModelForCausalLM,
  env
};

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

// Process natural language command with universal intent classification
async function handleProcessCommand(data, messageId) {
  if (!model || !tokenizer) {
    sendError(messageId, 'Model not loaded. Call LOAD_MODEL first.');
    return;
  }

  const { command, scripts = [], options = {} } = data;

  console.log('🤖 [AI Worker] Processing command:', command);

  try {
    // Step 1: Classify intent
    const classification = await classifyIntent(command, scripts, options);
    console.log('📊 [AI Worker] Intent classification:', classification.intent.primary_category);

    // Step 2: Route to appropriate handler based on intent
    const result = await routeToHandler(classification, command, scripts, options);

    sendResponse(messageId, 'COMMAND_RESULT', result);
  } catch (error) {
    console.error('❌ [AI Worker] Error processing command:', error);
    sendError(messageId, error.message, error.stack);
  }
}

// Classify intent using production-ready prompt
async function classifyIntent(command, scripts, options) {
  const scriptsJson = JSON.stringify(scripts.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    actions: s.steps?.map(step => step.action) || [],
    parameters: s.parameters || {}
  })));

  const prompt = `You are Choreograph AI, an intelligent assistant that understands ALL types of user requests.

## Your Capabilities
You can handle 7 types of intents:
1. INFORMATIONAL - Answer questions, provide information
2. ACTION - Perform browser automation (navigate, click, fill forms)
3. EXTRACTION - Scrape/extract data from web pages
4. ANALYSIS - Analyze, compare, or summarize data
5. CONVERSATIONAL - Greetings, thanks, chitchat
6. CONFIGURATION - Change settings, manage scripts
7. META - Help requests, capability questions

## Available Automation Scripts
${scriptsJson}

## User Utterance
"${command}"

## Task
Classify the intent, extract entities, and (if ACTION intent) match to appropriate script.

## Response Format (JSON only, no markdown)
{
  "intent": {
    "primary_category": "INFORMATIONAL|ACTION|EXTRACTION|ANALYSIS|CONVERSATIONAL|CONFIGURATION|META",
    "subcategory": "<specific type>",
    "confidence": 0.0-1.0
  },
  "entities": {
    "urls": [],
    "text": [],
    "numbers": []
  },
  "routing": {
    "handler": "llm|script_executor|help_system|config_manager",
    "script_match": {
      "script_id": "<id or null>",
      "confidence": 0.0-1.0,
      "reasoning": "<why matched>"
    }
  },
  "parameters": {}
}

## Classification Rules
1. Question words (what/how/why) → INFORMATIONAL
2. Action verbs (go/click/fill) → ACTION
3. Extract/scrape verbs → EXTRACTION
4. Analyze/compare verbs → ANALYSIS
5. Hello/thanks/bye → CONVERSATIONAL
6. Set/change config → CONFIGURATION
7. System questions → META

Examples:
"What is AI?" → {"intent":{"primary_category":"INFORMATIONAL","subcategory":"DEFINITION","confidence":0.95},"routing":{"handler":"llm"}}
"Go to google.com" → {"intent":{"primary_category":"ACTION","subcategory":"NAVIGATION","confidence":0.98},"routing":{"handler":"script_executor","script_match":{"script_id":"<id>","confidence":0.95}}}
"Thanks!" → {"intent":{"primary_category":"CONVERSATIONAL","subcategory":"THANKS","confidence":1.0},"routing":{"handler":"llm"}}

Respond with JSON:`;

  // Tokenize and generate
  const inputs = tokenizer(prompt);
  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: options.maxTokens || 250,
    do_sample: false,
    temperature: options.temperature || 0.3
  });

  // Decode output
  const generatedText = tokenizer.decode(outputs[0], { skip_special_tokens: true });
  const newText = generatedText.slice(prompt.length).trim();
  console.log('🤖 [AI Worker] Classification response:', newText);

  // Try to parse JSON response
  try {
    // Remove markdown code blocks if present
    let jsonText = newText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Try to find JSON object in response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (parseError) {
    console.warn('⚠️ [AI Worker] Failed to parse JSON response, using fallback');
    return fallbackClassification(command, scripts);
  }
}

// Fallback classification if JSON parsing fails
function fallbackClassification(command, scripts) {
  const lowerCommand = command.toLowerCase();

  // Check for question words
  if (lowerCommand.match(/^(what|how|why|when|where|who|which|can you explain|tell me about)/)) {
    return {
      intent: { primary_category: 'INFORMATIONAL', subcategory: 'GENERAL', confidence: 0.7 },
      entities: { urls: [], text: [command], numbers: [] },
      routing: { handler: 'llm', script_match: { script_id: null, confidence: 0, reasoning: 'Question detected' } },
      parameters: {}
    };
  }

  // Check for conversational
  if (lowerCommand.match(/^(hello|hi|hey|thanks|thank you|bye|goodbye)/)) {
    return {
      intent: { primary_category: 'CONVERSATIONAL', subcategory: 'GREETING', confidence: 0.9 },
      entities: { urls: [], text: [], numbers: [] },
      routing: { handler: 'llm', script_match: { script_id: null, confidence: 0, reasoning: 'Social phrase' } },
      parameters: {}
    };
  }

  // Check for meta
  if (lowerCommand.match(/(what can you do|help|show commands|capabilities)/)) {
    return {
      intent: { primary_category: 'META', subcategory: 'CAPABILITIES', confidence: 0.9 },
      entities: { urls: [], text: [], numbers: [] },
      routing: { handler: 'help_system', script_match: { script_id: null, confidence: 0, reasoning: 'Help request' } },
      parameters: {}
    };
  }

  // Default to ACTION for script matching
  return {
    intent: { primary_category: 'ACTION', subcategory: 'GENERAL', confidence: 0.6 },
    entities: { urls: extractUrls(command), text: [], numbers: [] },
    routing: { handler: 'script_executor', script_match: { script_id: null, confidence: 0, reasoning: 'Default action intent' } },
    parameters: {}
  };
}

// Route to appropriate handler based on intent
async function routeToHandler(classification, command, scripts, options) {
  const { intent, routing } = classification;

  switch (routing.handler) {
    case 'script_executor':
      // ACTION intent - match to scripts
      return await handleActionIntent(classification, command, scripts);

    case 'llm':
      // INFORMATIONAL, EXTRACTION, ANALYSIS, CONVERSATIONAL - generate LLM response
      return await handleLLMIntent(classification, command, options);

    case 'help_system':
      // META intent - provide help
      return handleMetaIntent(classification, command);

    case 'config_manager':
      // CONFIGURATION intent - handle config changes
      return handleConfigIntent(classification, command);

    default:
      return {
        matched: false,
        intent_category: intent.primary_category,
        message: `Handler ${routing.handler} not yet implemented`,
        classification
      };
  }
}

// Handle ACTION intents - match to scripts
async function handleActionIntent(classification, command, scripts) {
  const { routing, entities, parameters } = classification;

  // If model already matched a script
  if (routing.script_match?.script_id && routing.script_match.confidence > 0.5) {
    const matchedScript = scripts.find(s => s.id === routing.script_match.script_id);
    if (matchedScript) {
      return {
        matched: true,
        intent_category: 'ACTION',
        script: matchedScript,
        confidence: routing.script_match.confidence,
        parameters: parameters || extractParameters(command, matchedScript),
        reasoning: routing.script_match.reasoning,
        classification
      };
    }
  }

  // Fallback: Try simple matching
  if (scripts.length === 0) {
    return {
      matched: false,
      intent_category: 'ACTION',
      message: 'No scripts available',
      classification
    };
  }

  // Simple keyword matching fallback
  const lowerCommand = command.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const script of scripts) {
    const title = (script.title || '').toLowerCase();
    const description = (script.description || '').toLowerCase();
    let score = 0;

    if (lowerCommand.includes(title)) score += 0.8;
    if (lowerCommand.includes(description)) score += 0.6;

    const words = lowerCommand.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue;
      if (title.includes(word)) score += 0.3;
      if (description.includes(word)) score += 0.2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = script;
    }
  }

  if (bestMatch && bestScore > 0.4) {
    return {
      matched: true,
      intent_category: 'ACTION',
      script: bestMatch,
      confidence: Math.min(bestScore, 0.9),
      parameters: extractParameters(command, bestMatch),
      reasoning: 'Matched using keyword fallback',
      classification
    };
  }

  return {
    matched: false,
    intent_category: 'ACTION',
    message: 'No matching script found',
    classification
  };
}

// Handle INFORMATIONAL, EXTRACTION, ANALYSIS, CONVERSATIONAL intents - generate LLM response
async function handleLLMIntent(classification, command, options) {
  const { intent } = classification;
  const category = intent.primary_category;

  let responsePrompt = '';

  switch (category) {
    case 'INFORMATIONAL':
      responsePrompt = `You are a helpful AI assistant. Answer this question concisely:\n\nQuestion: ${command}\n\nAnswer:`;
      break;

    case 'EXTRACTION':
      responsePrompt = `User wants to extract data: "${command}"\n\nProvide a brief guide on how to extract this data using browser developer tools or explain what data they want:\n\nResponse:`;
      break;

    case 'ANALYSIS':
      responsePrompt = `User wants to analyze data: "${command}"\n\nProvide a brief explanation of how to perform this analysis or what insights they're looking for:\n\nResponse:`;
      break;

    case 'CONVERSATIONAL':
      const subcategory = intent.subcategory || 'GENERAL';
      if (subcategory === 'GREETING' || subcategory === 'THANKS') {
        return {
          matched: true,
          intent_category: category,
          response: getConversationalResponse(subcategory),
          classification
        };
      }
      responsePrompt = `Respond naturally to: "${command}"\n\nResponse:`;
      break;

    default:
      responsePrompt = `${command}\n\nResponse:`;
  }

  // Generate response using LLM
  const inputs = tokenizer(responsePrompt);
  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: options.responseTokens || 100,
    do_sample: true,
    temperature: 0.7,
    top_p: 0.9
  });

  const generatedText = tokenizer.decode(outputs[0], { skip_special_tokens: true });
  const response = generatedText.slice(responsePrompt.length).trim();

  return {
    matched: true,
    intent_category: category,
    response: response,
    classification
  };
}

// Handle META intents - provide help
function handleMetaIntent(classification, command) {
  const { intent } = classification;
  const subcategory = intent.subcategory || 'HELP';

  let response = '';

  switch (subcategory) {
    case 'CAPABILITIES':
      response = `I'm Choreograph AI! I can help you with:

🤖 **Browser Automation**: Navigate websites, click buttons, fill forms
📊 **Data Extraction**: Scrape data from web pages
💬 **Questions**: Answer general questions
⚙️ **Configuration**: Manage scripts and settings

Try commands like:
• "Go to amazon.com"
• "What is machine learning?"
• "Show available scripts"`;
      break;

    case 'HELP':
      response = `**Choreograph Help**

Available commands:
• "show available scripts" - List all automation scripts
• "show available tasks" - List all workflows
• "model status" - Check AI model status
• Natural language commands for automation

Upload scripts in the settings page to create custom automations!`;
      break;

    case 'STATUS':
      response = `✅ AI model is loaded and ready!\n🧠 Using Granite 4.0 (IBM's micro language model)\n💻 Running on ${self.navigator?.gpu ? 'WebGPU' : 'WebAssembly'}`;
      break;

    default:
      response = 'How can I help you? Try asking "What can you do?" or "Show available scripts"';
  }

  return {
    matched: true,
    intent_category: 'META',
    response: response,
    classification
  };
}

// Handle CONFIGURATION intents
function handleConfigIntent(classification, command) {
  const { entities } = classification;

  // For now, return guidance (actual config changes would need UI confirmation)
  return {
    matched: true,
    intent_category: 'CONFIGURATION',
    response: 'Configuration changes require confirmation. Please use the Settings page to modify system settings.',
    requires_confirmation: true,
    classification
  };
}

// Get conversational response
function getConversationalResponse(subcategory) {
  const responses = {
    'GREETING': 'Hello! I\'m Choreograph AI. How can I help you today?',
    'THANKS': 'You\'re welcome! Let me know if you need anything else.',
    'FAREWELL': 'Goodbye! Feel free to come back anytime.',
    'ACKNOWLEDGMENT': 'Got it!',
    'APOLOGY': 'No problem at all!'
  };

  return responses[subcategory] || 'I\'m here to help!';
}

// Extract URLs from text
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-z0-9-]+\.(com|org|net|io|dev|ai)[^\s]*)/gi;
  const matches = text.match(urlRegex);
  return matches || [];
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
    transformersLoaded: true
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

console.log('✅ [AI Worker] Web Worker initialized and ready (Webpack bundled with Granite 4.0 support)');
