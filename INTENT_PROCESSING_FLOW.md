# Intent Processing Flow Through LLM

This document explains the complete processing path for intents once they are classified by the Granite 4.0 model.

---

## Overview

When a user types a command, it goes through a **two-stage LLM process**:

1. **Stage 1: Intent Classification** - Model analyzes the command and returns structured JSON
2. **Stage 2: Handler Processing** - Based on intent type, appropriate handler generates response

---

## Stage 1: Intent Classification

### Location
`src/ai-worker-source.js:156-300` - `classifyIntent()` function

### Process

```javascript
async function classifyIntent(command, scripts, options) {
  // Build production-ready prompt with taxonomy
  const prompt = `You are Choreograph AI, an intelligent assistant...

## Your Capabilities
7 types of intents: INFORMATIONAL, ACTION, EXTRACTION, ANALYSIS,
CONVERSATIONAL, CONFIGURATION, META

## Available Scripts
${scriptsJson}

## User Utterance
"${command}"

## Task
Classify the intent, extract entities, determine routing.

Respond with JSON only (no markdown):
{
  "intent": {
    "primary_category": "...",
    "subcategory": "...",
    "confidence": 0.0-1.0
  },
  "entities": { ... },
  "routing": {
    "handler": "llm|script_executor|help_system|config_manager",
    "script_match": { ... }
  },
  "parameters": { ... }
}`;

  // Tokenize prompt
  const inputs = tokenizer(prompt);

  // Generate with Granite 4.0 model
  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: 250,  // Enough for structured JSON
    do_sample: true,
    temperature: 0.3      // Low temp for consistent classification
  });

  // Decode output
  const generatedText = tokenizer.decode(outputs[0], { skip_special_tokens: true });

  // Extract JSON (after prompt)
  const jsonText = generatedText.slice(prompt.length).trim();

  // Parse JSON
  const classification = JSON.parse(jsonText);

  return classification;
}
```

### Output Format

```javascript
{
  "intent": {
    "primary_category": "INFORMATIONAL",
    "subcategory": "FACTUAL",
    "confidence": 0.95
  },
  "entities": {
    "topic": "machine learning",
    "question_type": "definition"
  },
  "routing": {
    "handler": "llm",
    "requires_web_context": false
  },
  "parameters": {}
}
```

### Token Usage: 250 tokens

This is enough to generate:
- Intent classification (category + subcategory)
- Entity extraction
- Routing decision
- Parameters for handlers

---

## Stage 2: Routing to Handlers

### Location
`src/ai-worker-source.js:302-330` - `routeToHandler()` function

### Process

```javascript
async function routeToHandler(classification, command, scripts, options) {
  const { intent, routing } = classification;

  switch (routing.handler) {
    case 'script_executor':
      return await handleActionIntent(classification, command, scripts);

    case 'llm':
      return await handleLLMIntent(classification, command, options);

    case 'help_system':
      return handleMetaIntent(classification, command);

    case 'config_manager':
      return handleConfigIntent(classification, command);

    default:
      return { matched: false, message: 'Handler not implemented' };
  }
}
```

The routing decision comes from Stage 1 classification. Let's trace each handler path:

---

## Handler 1: LLM Intent Handler

### Intent Types Handled
- **INFORMATIONAL**: Questions, facts, definitions
- **EXTRACTION**: Data scraping requests
- **ANALYSIS**: Data analysis requests
- **CONVERSATIONAL**: Greetings, chitchat

### Location
`src/ai-worker-source.js:409-464` - `handleLLMIntent()` function

### Process Flow

```
User: "What is machine learning?"
  ↓
Stage 1: Classification
  → intent: INFORMATIONAL
  → subcategory: FACTUAL
  → routing.handler: "llm"
  ↓
Stage 2: LLM Handler
  → Build response prompt
  → Generate answer with model
  → Return response text
  ↓
Display: 💡 "Machine learning is..."
```

### Detailed Implementation

```javascript
async function handleLLMIntent(classification, command, options) {
  const { intent } = classification;
  const category = intent.primary_category;

  // Step 1: Build response prompt based on intent type
  let responsePrompt = '';

  switch (category) {
    case 'INFORMATIONAL':
      responsePrompt = `You are a helpful AI assistant. Answer this question concisely:

Question: ${command}

Answer:`;
      break;

    case 'EXTRACTION':
      responsePrompt = `User wants to extract data: "${command}"

Provide a brief guide on how to extract this data using browser developer tools or explain what data they want:

Response:`;
      break;

    case 'ANALYSIS':
      responsePrompt = `User wants to analyze data: "${command}"

Provide a brief explanation of how to perform this analysis or what insights they're looking for:

Response:`;
      break;

    case 'CONVERSATIONAL':
      const subcategory = intent.subcategory || 'GENERAL';

      // Quick responses for common greetings
      if (subcategory === 'GREETING' || subcategory === 'THANKS') {
        return {
          matched: true,
          intent_category: category,
          response: getConversationalResponse(subcategory),
          classification
        };
      }

      responsePrompt = `Respond naturally to: "${command}"

Response:`;
      break;

    default:
      responsePrompt = `${command}

Response:`;
  }

  // Step 2: Generate response using LLM
  const inputs = tokenizer(responsePrompt);

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: options.responseTokens || 100,  // Answer length
    do_sample: true,
    temperature: 0.7,     // Higher temp for natural responses
    top_p: 0.9
  });

  // Step 3: Decode and extract response
  const generatedText = tokenizer.decode(outputs[0], { skip_special_tokens: true });
  const response = generatedText.slice(responsePrompt.length).trim();

  // Step 4: Return result
  return {
    matched: true,
    intent_category: category,
    response: response,
    classification
  };
}
```

### Token Usage: 100 tokens (responseTokens)

This is enough to generate:
- Short answers: 2-3 sentences
- Definitions: 1 paragraph
- Guidance: Brief instructions
- Conversational replies: Natural response

### Examples

#### Example 1: INFORMATIONAL Intent

**Input**: "What is machine learning?"

**Stage 1 Output**:
```json
{
  "intent": {
    "primary_category": "INFORMATIONAL",
    "subcategory": "DEFINITION",
    "confidence": 0.98
  },
  "routing": { "handler": "llm" }
}
```

**Stage 2 Process**:
```javascript
// Build prompt
responsePrompt = `You are a helpful AI assistant. Answer this question concisely:

Question: What is machine learning?

Answer:`;

// Generate (100 tokens)
response = "Machine learning is a subset of artificial intelligence that
enables computers to learn from data without being explicitly programmed.
It uses algorithms to find patterns in data and make predictions or
decisions based on those patterns."
```

**Output**:
```javascript
{
  matched: true,
  intent_category: "INFORMATIONAL",
  response: "Machine learning is a subset of artificial intelligence...",
  classification: { /* full classification */ }
}
```

**UI Display**: 💡 Machine learning is a subset of artificial intelligence...

---

#### Example 2: CONVERSATIONAL Intent

**Input**: "hello"

**Stage 1 Output**:
```json
{
  "intent": {
    "primary_category": "CONVERSATIONAL",
    "subcategory": "GREETING",
    "confidence": 0.99
  },
  "routing": { "handler": "llm" }
}
```

**Stage 2 Process**:
```javascript
// Shortcut: Pre-defined response (no LLM call needed)
if (subcategory === 'GREETING') {
  return {
    matched: true,
    intent_category: 'CONVERSATIONAL',
    response: "Hello! I'm Choreograph AI. How can I help you today?",
    classification
  };
}
```

**Output**:
```javascript
{
  matched: true,
  intent_category: "CONVERSATIONAL",
  response: "Hello! I'm Choreograph AI. How can I help you today?",
  classification: { /* full classification */ }
}
```

**UI Display**: 💬 Hello! I'm Choreograph AI. How can I help you today?

**Note**: Conversational greetings/thanks use predefined responses for speed

---

#### Example 3: EXTRACTION Intent

**Input**: "extract all product prices from this page"

**Stage 1 Output**:
```json
{
  "intent": {
    "primary_category": "EXTRACTION",
    "subcategory": "STRUCTURED",
    "confidence": 0.92
  },
  "entities": {
    "data_type": "prices",
    "target": "products",
    "scope": "page"
  },
  "routing": { "handler": "llm" }
}
```

**Stage 2 Process**:
```javascript
// Build prompt
responsePrompt = `User wants to extract data: "extract all product prices from this page"

Provide a brief guide on how to extract this data using browser developer tools or explain what data they want:

Response:`;

// Generate (100 tokens)
response = "To extract product prices:
1. Right-click the page and select 'Inspect'
2. Use the element selector to click on a price
3. Note the CSS class (e.g., '.product-price')
4. In Console, run: document.querySelectorAll('.product-price')
5. Or create a script in Choreograph to automate this extraction"
```

**Output**:
```javascript
{
  matched: true,
  intent_category: "EXTRACTION",
  response: "To extract product prices: 1. Right-click...",
  classification: { /* full classification */ }
}
```

**UI Display**: 📊 To extract product prices: 1. Right-click...

---

## Handler 2: Action Intent Handler

### Intent Types Handled
- **ACTION**: Browser automation (navigate, click, fill forms)

### Location
`src/ai-worker-source.js:333-407` - `handleActionIntent()` function

### Process Flow

```
User: "Go to amazon.com"
  ↓
Stage 1: Classification
  → intent: ACTION
  → subcategory: NAVIGATION
  → routing.handler: "script_executor"
  → routing.script_match: { script_id: "nav_001", confidence: 0.95 }
  ↓
Stage 2: Action Handler
  → Find matching script
  → Extract parameters
  → Return script + params
  ↓
Display: 📋 Script card with Execute button
```

### Implementation

```javascript
async function handleActionIntent(classification, command, scripts) {
  const { routing, entities, parameters } = classification;

  // Step 1: Check if model already matched a script
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

  // Step 2: Fallback to simple matching if model didn't match
  const lowerCommand = command.toLowerCase();

  for (const script of scripts) {
    const lowerTitle = (script.title || '').toLowerCase();
    const lowerDesc = (script.description || '').toLowerCase();

    if (lowerCommand.includes(lowerTitle) || lowerTitle.includes(lowerCommand) ||
        lowerCommand.includes(lowerDesc)) {
      return {
        matched: true,
        intent_category: 'ACTION',
        script: script,
        confidence: 0.7,
        parameters: extractParameters(command, script),
        classification
      };
    }
  }

  // Step 3: No match found
  return {
    matched: false,
    intent_category: 'ACTION',
    message: 'No matching script found',
    classification
  };
}
```

### Example

**Input**: "Navigate to amazon.com"

**Stage 1 Output**:
```json
{
  "intent": {
    "primary_category": "ACTION",
    "subcategory": "NAVIGATION",
    "confidence": 0.96
  },
  "entities": {
    "url": "amazon.com",
    "protocol": "https"
  },
  "routing": {
    "handler": "script_executor",
    "script_match": {
      "script_id": "nav_001",
      "confidence": 0.95,
      "reasoning": "Navigation intent with URL parameter"
    }
  },
  "parameters": {
    "url": "amazon.com"
  }
}
```

**Stage 2 Output**:
```javascript
{
  matched: true,
  intent_category: "ACTION",
  script: {
    id: "nav_001",
    title: "Navigate to URL",
    description: "Navigate to a specified URL",
    steps: [...]
  },
  confidence: 0.95,
  parameters: { url: "amazon.com" },
  reasoning: "Navigation intent with URL parameter",
  classification: { /* full classification */ }
}
```

**UI Display**: 📋 Script card showing "Navigate to URL" with Execute button

**Note**: ACTION intents don't use LLM for response generation - they return script references

---

## Handler 3: Meta Intent Handler

### Intent Types Handled
- **META**: Help, capabilities, status, troubleshooting

### Location
`src/ai-worker-source.js:467-529` - `handleMetaIntent()` function

### Process Flow

```
User: "What can you do?"
  ↓
Stage 1: Classification
  → intent: META
  → subcategory: CAPABILITIES
  → routing.handler: "help_system"
  ↓
Stage 2: Meta Handler
  → Select predefined response based on subcategory
  → Return help text
  ↓
Display: ℹ️ "I'm Choreograph AI! I can help you with..."
```

### Implementation

```javascript
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

I understand natural language commands. Here are examples:

**Browser Actions:**
• "Open google.com"
• "Click the login button"
• "Fill in the email field with test@example.com"

**Information:**
• "What is artificial intelligence?"
• "Explain how APIs work"

**Data Extraction:**
• "Extract all product prices"
• "Get the page title"

**Meta:**
• "What can you do?"
• "Show available scripts"`;
      break;

    case 'STATUS':
      response = `**System Status**

✅ AI Model: Loaded (Granite 4.0)
✅ Intent Classification: Working
✅ Script Executor: Ready
📊 Available Scripts: ${classification.available_scripts || 0}`;
      break;

    case 'TROUBLESHOOTING':
      response = `**Troubleshooting**

If you're experiencing issues:
1. Check that scripts are uploaded in settings
2. Verify the command is clear and specific
3. Try rephrasing your request
4. Use "show available scripts" to see what's configured`;
      break;

    default:
      response = `I'm here to help! Try asking:
• "What can you do?" - See my capabilities
• "Show available scripts" - View configured scripts
• "Help" - Get command examples`;
  }

  return {
    matched: true,
    intent_category: 'META',
    response: response,
    classification
  };
}
```

### Example

**Input**: "what can you do"

**Stage 1 Output**:
```json
{
  "intent": {
    "primary_category": "META",
    "subcategory": "CAPABILITIES",
    "confidence": 0.97
  },
  "routing": { "handler": "help_system" }
}
```

**Stage 2 Output**:
```javascript
{
  matched: true,
  intent_category: "META",
  response: "I'm Choreograph AI! I can help you with:\n\n🤖 Browser Automation...",
  classification: { /* full classification */ }
}
```

**UI Display**: ℹ️ I'm Choreograph AI! I can help you with: ...

**Note**: META intents use predefined responses (no LLM call) for consistent, accurate help

---

## Handler 4: Config Intent Handler

### Intent Types Handled
- **CONFIGURATION**: Settings, preferences, script management

### Location
`src/ai-worker-source.js:531-567` - `handleConfigIntent()` function

### Process Flow

```
User: "Show available scripts"
  ↓
Stage 1: Classification
  → intent: CONFIGURATION
  → subcategory: SCRIPTS
  → routing.handler: "config_manager"
  ↓
Stage 2: Config Handler
  → Generate response about configuration
  → Return guidance text
  ↓
Display: ⚙️ "You have 5 scripts configured..."
```

### Implementation

```javascript
function handleConfigIntent(classification, command) {
  const { intent } = classification;
  const subcategory = intent.subcategory || 'GENERAL';

  let response = '';

  switch (subcategory) {
    case 'SCRIPTS':
      response = `**Script Management**

To manage your scripts:
1. Click the settings icon (⚙️)
2. Upload JSON scripts or create new ones
3. Scripts will appear in the configuration page

Available commands:
• "Show available scripts" - List all scripts
• "Show available tasks" - List configured tasks`;
      break;

    case 'SETTINGS':
      response = `**Settings**

Configure Choreograph in the settings page:
• Upload automation scripts
• Manage tasks and workflows
• View execution history

Click the ⚙️ icon to access settings.`;
      break;

    case 'PREFERENCES':
      response = `**Preferences**

Customize Choreograph behavior:
• Script execution timeout
• Auto-execute vs confirm
• Logging verbosity

Access preferences in the settings page.`;
      break;

    default:
      response = `**Configuration**

Use commands like:
• "Show available scripts"
• "Open settings"
• "What scripts do I have?"`;
  }

  return {
    matched: true,
    intent_category: 'CONFIGURATION',
    response: response,
    classification
  };
}
```

---

## Complete Processing Timeline

### Example: "What is machine learning?"

```
Time    | Location                    | Action
--------|----------------------------|------------------------------------------
0ms     | popup.js                   | User types command, clicks send
10ms    | popup.js:480               | Send PROCESS_COMMAND through port
15ms    | background.js:105          | Receive from popup, relay to offscreen
20ms    | offscreen-manager.js:148   | Receive from background, forward to worker
25ms    | ai-worker-source.js:130    | Worker receives PROCESS_COMMAND
30ms    | ai-worker-source.js:142    | Call classifyIntent()
35ms    | ai-worker-source.js:230    | Build classification prompt (250 tokens)
40ms    | model.generate()           | Stage 1: Granite model classifies intent
250ms   | ai-worker-source.js:282    | Parse JSON: intent=INFORMATIONAL, handler=llm
255ms   | ai-worker-source.js:146    | Call routeToHandler()
260ms   | ai-worker-source.js:312    | Route to handleLLMIntent()
265ms   | ai-worker-source.js:417    | Build response prompt (100 tokens)
270ms   | model.generate()           | Stage 2: Granite model generates answer
550ms   | ai-worker-source.js:456    | Decode response text
555ms   | ai-worker-source.js:148    | Send COMMAND_RESULT back to offscreen
560ms   | offscreen-manager.js:88    | Forward response to background
565ms   | background.js:119          | Forward response to popup
570ms   | popup.js:490               | Receive response
575ms   | popup.js:511               | Call handleIntentResult()
580ms   | popup.js:528               | Display with 💡 icon
585ms   | popup.js:538               | Add message to UI
```

**Total Time**: ~585ms (classification + generation + relay)

---

## Token Budget Allocation

### Stage 1: Intent Classification
- **Tokens**: 250 (maxTokens)
- **Temperature**: 0.3 (low for consistency)
- **Purpose**: Generate structured JSON
- **Content**:
  - Intent category + subcategory
  - Entity extraction
  - Routing decision
  - Script matching (if ACTION)
  - Parameters

### Stage 2: Response Generation (LLM Handler Only)
- **Tokens**: 100 (responseTokens)
- **Temperature**: 0.7 (higher for natural language)
- **Purpose**: Generate natural language answer
- **Content**:
  - INFORMATIONAL: 2-3 sentence answer
  - EXTRACTION: Brief extraction guide
  - ANALYSIS: Analysis explanation
  - CONVERSATIONAL: Natural response

### Total Token Usage Per Command
- **With LLM handler**: 250 + 100 = 350 tokens (~1-2 seconds)
- **With predefined response**: 250 tokens (~300-500ms)
- **ACTION handler**: 250 tokens (~300-500ms)

---

## Performance Characteristics

### Latency Breakdown

| Stage | Time | Notes |
|-------|------|-------|
| Message relay (Popup → Offscreen) | ~20ms | Port communication overhead |
| Intent classification (Stage 1) | ~200-300ms | 250 tokens @ 0.3 temp |
| Response generation (Stage 2) | ~200-300ms | 100 tokens @ 0.7 temp (LLM only) |
| Message relay (Offscreen → Popup) | ~20ms | Port communication overhead |
| **Total (LLM intents)** | **~440-640ms** | INFORMATIONAL, EXTRACTION, ANALYSIS |
| **Total (predefined)** | **~240-340ms** | CONVERSATIONAL, META, CONFIG |
| **Total (ACTION)** | **~240-340ms** | Script matching only |

### Optimization Strategies

1. **Predefined Responses**: META and CONVERSATIONAL use cached responses for speed
2. **Token Limits**: 250/100 tokens provide good quality without excess latency
3. **Temperature Tuning**:
   - Classification: 0.3 (consistent, accurate)
   - Generation: 0.7 (natural, varied)
4. **Persistent Model**: Offscreen API keeps model loaded (~200x faster after first load)

---

## Error Handling

### Classification Errors

If JSON parsing fails in Stage 1:
```javascript
try {
  const parsed = JSON.parse(jsonText);
  return parsed;
} catch (error) {
  console.error('Failed to parse classification:', error);

  // Fallback: Try to extract intent from text
  if (jsonText.includes('INFORMATIONAL')) {
    return {
      intent: { primary_category: 'INFORMATIONAL', confidence: 0.5 },
      routing: { handler: 'llm' }
    };
  }

  // Ultimate fallback
  return {
    intent: { primary_category: 'ACTION', confidence: 0.3 },
    routing: { handler: 'script_executor' }
  };
}
```

### Generation Errors

If Stage 2 generation fails:
```javascript
try {
  const response = await generateResponse();
  return { matched: true, response };
} catch (error) {
  console.error('Generation failed:', error);

  // Fallback to generic response
  return {
    matched: true,
    response: "I understand your request, but I'm having trouble generating a response right now. Please try again or rephrase your question."
  };
}
```

### Port Communication Errors

If message relay fails:
```javascript
// popup.js
try {
  const response = await this.sendWorkerMessage('PROCESS_COMMAND', data);
} catch (error) {
  console.error('Worker timeout or disconnection:', error);

  // Fall back to text matching
  result = await this.fallbackScriptMatching(command, scripts);
}
```

---

## Summary: Two-Stage LLM Processing

```
┌─────────────────────────────────────────────────────────────┐
│                    USER TYPES COMMAND                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: INTENT CLASSIFICATION (250 tokens, temp=0.3)      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Granite 4.0 Model analyzes command                   │   │
│  │ Returns structured JSON:                             │   │
│  │   - intent.primary_category                          │   │
│  │   - intent.subcategory                               │   │
│  │   - entities                                          │   │
│  │   - routing.handler                                   │   │
│  │   - parameters                                        │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
               ┌───────┴───────┐
               │  Route Based  │
               │  on Handler   │
               └───────┬───────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────┐ ┌────────────┐ ┌───────────┐ ┌─────────────┐
│ LLM Handler │ │   Action   │ │   Meta    │ │   Config    │
│             │ │  Handler   │ │  Handler  │ │   Handler   │
│ (Stage 2)   │ │            │ │           │ │             │
└──────┬──────┘ └─────┬──────┘ └─────┬─────┘ └──────┬──────┘
       │              │              │              │
       ▼              │              │              │
┌─────────────────────┐              │              │
│ STAGE 2: GENERATE   │              │              │
│ (100 tokens, 0.7)   │              │              │
│                     │              │              │
│ Granite 4.0 Model   │              │              │
│ generates natural   │              │              │
│ language response   │              │              │
└──────┬──────────────┘              │              │
       │                             │              │
       └──────────────┬──────────────┴──────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Format Response │
            │  with Icon       │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │   DISPLAY IN UI  │
            └──────────────────┘
```

### Key Takeaways

1. **Two-stage processing**: Classification first, then handler-specific processing
2. **LLM used twice** (for INFORMATIONAL/EXTRACTION/ANALYSIS only):
   - Stage 1: Classify intent (250 tokens)
   - Stage 2: Generate answer (100 tokens)
3. **Predefined responses** for speed (META, CONVERSATIONAL greetings)
4. **Script matching** for ACTION intents (no Stage 2 LLM call)
5. **Total latency**: 440-640ms for LLM intents, 240-340ms for others
6. **Graceful fallbacks** at every stage if errors occur

---

## Debug Console Output Example

When you test "what is machine learning", you should see:

```
[Popup] Command sent: what is machine learning
🔄 [Background] Received PROCESS_COMMAND from popup, requestId: 1
📤 [Background] Forwarding to offscreen...
📥 [Offscreen] Port message: PROCESS_COMMAND, requestId: 1
🚀 [Offscreen] Processing command: "what is machine learning" (requestId: 1)
🔀 [Offscreen] Mapped requestId 1 → workerMsgId 1
🤖 [AI Worker] Processing command: what is machine learning
📊 [AI Worker] Intent classification: INFORMATIONAL
📨 [Offscreen] Worker message: COMMAND_RESULT 1
📤 [Offscreen] Forwarding response to popup. RequestId: 1, Type: COMMAND_RESULT, HasData: true
📦 [Offscreen] Response data: {matched: true, intent_category: "INFORMATIONAL", response: "Machine learning is...", ...}
📥 [Background] Received response from offscreen: COMMAND_RESULT requestId: 1
📤 [Background] Forwarding response back to popup
🔍 [Popup] Received response from worker: {type: "COMMAND_RESULT", data: {...}}
✅ [Popup] Result data: {matched: true, intent_category: "INFORMATIONAL", ...}
📊 Intent: INFORMATIONAL {...}
[Popup] Displaying: 💡 Machine learning is a subset of artificial intelligence...
```

This complete trace shows every hop in the message chain and both LLM stages!
