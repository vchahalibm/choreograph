# Chat Invocation Flow - AI Model vs Fallback

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER OPENS POPUP                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  popup.js: DeskAgentPopup.init()                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Setup event listeners                                       │  │
│  │ 2. initializeAIWorker()  ──────────────────────┐              │  │
│  │ 3. setInputEnabled(false)  [GRAYED OUT]        │              │  │
│  │ 4. loadMessages()                              │              │  │
│  └────────────────────────────────────────────────┼──────────────┘  │
└────────────────────────────────────────────────────┼─────────────────┘
                                                     │
                    ┌────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  initializeAIWorker()                                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Create Worker from ai-worker.bundled.js                    │  │
│  │ 2. Setup message listener (handleWorkerMessage)               │  │
│  │ 3. Setup error listener                                       │  │
│  │ 4. Auto-call loadAIModel()                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  loadAIModel()                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ State: isModelLoading = true                                  │  │
│  │ Status: "Loading Granite 4.0 AI model..."                     │  │
│  │                                                                │  │
│  │ sendWorkerMessage('LOAD_MODEL', {                             │  │
│  │   modelId: 'onnx-community/granite-4.0-micro-ONNX-web'       │  │
│  │ })                                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI Worker (ai-worker.bundled.js)                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ handleLoadModel()                                             │  │
│  │ ├─ Check WebGPU availability                                 │  │
│  │ ├─ Load AutoTokenizer from HuggingFace                       │  │
│  │ │  └─ Progress callbacks → PROGRESS messages                 │  │
│  │ ├─ Load AutoModelForCausalLM                                 │  │
│  │ │  ├─ dtype: 'q4f16' (WebGPU) or 'q4' (WASM)               │  │
│  │ │  └─ Progress callbacks → PROGRESS messages                 │  │
│  │ └─ Return MODEL_LOADED with success=true                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  handleWorkerMessage() receives MODEL_LOADED                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ State: modelLoaded = true                                     │  │
│  │ State: isModelLoading = false                                 │  │
│  │ Status: "✅ AI model ready (webgpu)"                          │  │
│  │ setInputEnabled(true)  [INPUT NOW ENABLED]                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## User Command Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│               USER TYPES COMMAND AND PRESSES ENTER                   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  sendCommand()                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Get command text                                           │  │
│  │ 2. Clear input field                                          │  │
│  │ 3. Add user message to chat                                   │  │
│  │ 4. setProcessing(true)  [DISABLE INPUT TEMPORARILY]          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  handleSpecialCommand(command)                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Check if command matches special patterns:                    │  │
│  │ ✓ "help"                  → Show help message                 │  │
│  │ ✓ "model status"          → Show AI model status              │  │
│  │ ✓ "show available scripts" → List all scripts                 │  │
│  │ ✓ "show available tasks"   → List all tasks                   │  │
│  │ ✓ "run task [name]"       → Execute task by name              │  │
│  │                                                                │  │
│  │ If matched → Handle and return true                           │  │
│  │ If not matched → return false, continue to NLP processing     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                     ┌───────────┴───────────┐
                     │    Not special        │
                     │    command            │
                     └───────────┬───────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  processNLPCommand(command)                                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Get available scripts from storage                         │  │
│  │ 2. Check if scripts exist                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────────┐
              │  DECISION: How to process command?   │
              └──────────────────┬───────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │ CONDITION 1:        │         │ CONDITION 2:        │
    │ this.modelLoaded    │         │ !this.modelLoaded   │
    │ && this.aiWorker    │         │ || !this.aiWorker   │
    │                     │         │ || AI failed        │
    └──────┬──────────────┘         └──────┬──────────────┘
           │                               │
           ▼                               ▼
    ┌─────────────────────────────┐ ┌─────────────────────────────┐
    │   USE AI MODEL PATH         │ │  USE FALLBACK PATH          │
    │   ✅ Model is loaded        │ │  ⚠️ Model not available     │
    │   ✅ Worker is ready        │ │  ⚠️ Using text matching     │
    └──────┬──────────────────────┘ └──────┬──────────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ AI MODEL PROCESSING          │ │ FALLBACK TEXT MATCHING       │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## AI Model Processing Path (Condition 1: modelLoaded && aiWorker)

```
┌─────────────────────────────────────────────────────────────────────┐
│  processNLPCommand() - AI Model Branch                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ if (this.modelLoaded && this.aiWorker) {                      │  │
│  │   try {                                                        │  │
│  │     response = await sendWorkerMessage('PROCESS_COMMAND', {   │  │
│  │       command: command,                                        │  │
│  │       scripts: scripts,                                        │  │
│  │       options: {                                               │  │
│  │         maxTokens: 10,                                         │  │
│  │         temperature: 0.3                                       │  │
│  │       }                                                         │  │
│  │     });                                                         │  │
│  │   }                                                             │  │
│  │ }                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI Worker: handleProcessCommand()                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. Build prompt with available scripts:                       │  │
│  │    "You are an AI that matches commands to scripts.           │  │
│  │     Available scripts: [script list]                          │  │
│  │     Command: [user command]                                   │  │
│  │     Return script ID or 'none'"                               │  │
│  │                                                                │  │
│  │ 2. Tokenize prompt with AutoTokenizer                         │  │
│  │                                                                │  │
│  │ 3. Generate response with Granite 4.0 model:                  │  │
│  │    - Uses WebGPU acceleration if available                    │  │
│  │    - Falls back to WASM if WebGPU not supported              │  │
│  │    - Temperature: 0.3 (focused, deterministic)                │  │
│  │    - MaxTokens: 10 (just need script ID)                      │  │
│  │                                                                │  │
│  │ 4. Parse model output to extract script ID                    │  │
│  │                                                                │  │
│  │ 5. Find matching script and calculate confidence              │  │
│  │                                                                │  │
│  │ 6. Return COMMAND_RESULT with:                                │  │
│  │    { matched: true/false,                                     │  │
│  │      script: {...},                                           │  │
│  │      confidence: 0.0-1.0,                                     │  │
│  │      reasoning: "AI model match" }                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  processNLPCommand() receives result                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ if (response.type === 'COMMAND_RESULT' && response.data) {   │  │
│  │   result = response.data;  // Use AI result                  │  │
│  │ }                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fallback Text Matching Path (Condition 2: !modelLoaded || !aiWorker || AI failed)

```
┌─────────────────────────────────────────────────────────────────────┐
│  processNLPCommand() - Fallback Branch                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ // Fallback to text matching if AI model not available       │  │
│  │ if (!result) {                                                 │  │
│  │   result = await this.fallbackScriptMatching(command, scripts)│  │
│  │ }                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  fallbackScriptMatching(command, scripts)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Simple keyword-based matching:                                │  │
│  │                                                                │  │
│  │ For each script:                                              │  │
│  │   score = 0                                                   │  │
│  │                                                                │  │
│  │   1. Check exact title match in command:                     │  │
│  │      if (command.includes(script.title))                     │  │
│  │        score += 1.0                                           │  │
│  │                                                                │  │
│  │   2. Check word-by-word matches:                             │  │
│  │      commandWords = command.split(' ')                        │  │
│  │      titleWords = script.title.split(' ')                     │  │
│  │      descWords = script.description.split(' ')                │  │
│  │                                                                │  │
│  │      For each word in command:                                │  │
│  │        if word in titleWords:     score += 0.3               │  │
│  │        if word in descWords:      score += 0.2               │  │
│  │        if word in fileName:       score += 0.2               │  │
│  │                                                                │  │
│  │   3. Track best match                                         │  │
│  │                                                                │  │
│  │ If bestScore > 0.3:                                           │  │
│  │   return { matched: true,                                     │  │
│  │            script: bestMatch,                                 │  │
│  │            confidence: min(bestScore, 0.9),                   │  │
│  │            reasoning: 'Text matching' }                       │  │
│  │ else:                                                          │  │
│  │   return { matched: false }                                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Conditions Summary

### ✅ **AI Model Used When:**

1. **`this.modelLoaded === true`**
   - Model has successfully loaded from HuggingFace
   - Set to `true` when worker sends `MODEL_LOADED` message

2. **`this.aiWorker !== null`**
   - Worker instance exists and is initialized
   - Set during `initializeAIWorker()`

3. **No errors during AI processing**
   - Worker responds successfully to `PROCESS_COMMAND`
   - No timeout or communication errors

### ⚠️ **Fallback Text Matching Used When:**

1. **`!this.modelLoaded`**
   - Model is still loading
   - Model failed to load
   - Model never initialized

2. **`!this.aiWorker`**
   - Worker failed to initialize
   - Worker crashed or terminated

3. **AI processing throws error**
   - Worker timeout (>5 minutes)
   - Worker communication error
   - Model inference error

4. **No scripts available**
   - Early exit with "No scripts available" message

---

## State Transitions

```
┌─────────────────────────────────────────────────────────────────────┐
│                        POPUP LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────────┘

 Popup Opens
     │
     ▼
 ┌─────────────────┐
 │ Initial State   │  modelLoaded = false
 │                 │  isModelLoading = false
 │                 │  aiWorker = null
 │                 │  Input: DISABLED
 └────────┬────────┘
          │
          │ initializeAIWorker()
          ▼
 ┌─────────────────┐
 │ Worker Created  │  aiWorker = Worker instance
 │                 │  Input: DISABLED
 └────────┬────────┘
          │
          │ loadAIModel()
          ▼
 ┌─────────────────┐
 │ Model Loading   │  isModelLoading = true
 │                 │  Status: "Loading..."
 │                 │  Input: DISABLED
 │                 │  → Uses FALLBACK if command sent
 └────────┬────────┘
          │
          │ Progress updates...
          │
          ▼
 ┌─────────────────┐
 │ Model Ready     │  modelLoaded = true
 │                 │  isModelLoading = false
 │                 │  Status: "✅ AI model ready"
 │                 │  Input: ENABLED
 │                 │  → Uses AI MODEL for commands
 └────────┬────────┘
          │
          │ User types command
          ▼
 ┌─────────────────┐
 │ Processing      │  isProcessing = true
 │ Command         │  Input: DISABLED (temporarily)
 │                 │  → AI model processes
 └────────┬────────┘
          │
          ▼
 ┌─────────────────┐
 │ Command Done    │  isProcessing = false
 │                 │  Input: ENABLED
 │                 │  → Ready for next command
 └─────────────────┘
          │
          │ (loop)
          ▼

 ┌─────────────────┐
 │ Error State     │  modelLoaded = false
 │ (if load fails) │  Status: "⚠️ Model load failed"
 │                 │  Input: ENABLED
 │                 │  → Uses FALLBACK for all commands
 └─────────────────┘
```

---

## Key Decision Points

### **Decision 1: Initialize Worker**
- **Where**: `popup.js:init()` line 43
- **When**: Popup opens
- **Always**: Yes (always try to initialize)
- **Result**: Creates AI worker instance

### **Decision 2: Load Model**
- **Where**: `popup.js:initializeAIWorker()` line 72
- **When**: Worker successfully created
- **Always**: Yes (automatic loading)
- **Result**: Starts model download/loading

### **Decision 3: Enable Input**
- **Where**: `popup.js:loadAIModel()` lines 99, 108
- **When**:
  - Model loaded successfully → enable
  - Model load failed → enable (with fallback)
- **Result**: User can start typing

### **Decision 4: Process with AI or Fallback**
- **Where**: `popup.js:processNLPCommand()` lines 443-460
- **When**: User sends command
- **Conditions**:
  - ✅ Use AI: `modelLoaded && aiWorker` (line 443)
  - ⚠️ Use Fallback: `!result` after AI attempt (line 463)
- **Result**: Command processed and matched to script

---

## File References

| Component | File | Lines |
|-----------|------|-------|
| Worker Initialization | `scripts/popup.js` | 52-78 |
| Model Loading | `scripts/popup.js` | 80-110 |
| Worker Message Handling | `scripts/popup.js` | 131-153 |
| Input State Management | `scripts/popup.js` | 155-168, 170-189 |
| NLP Processing Decision | `scripts/popup.js` | 429-513 |
| AI Model Processing | `scripts/popup.js` | 443-460 |
| Fallback Text Matching | `scripts/popup.js` | 515-562 |
| AI Worker Core Logic | `src/ai-worker-source.js` | Full file |
| Status UI | `pages/popup.html` | 367-369 |

---

## Model Caching Behavior

```
┌─────────────────────────────────────────────────────────────────────┐
│              MODEL CACHING (via transformers.js)                     │
└─────────────────────────────────────────────────────────────────────┘

First Load (No Cache):
  ├─ Check IndexedDB → Empty
  ├─ Download from HuggingFace CDN
  │  ├─ config.json
  │  ├─ tokenizer.json
  │  ├─ model.onnx (main model file)
  │  └─ model_quantized.onnx (quantized version)
  ├─ Store in IndexedDB
  └─ Load into memory

  Time: 30-60 seconds (depending on connection)
  Size: ~40-80 MB download

Subsequent Loads (Cached):
  ├─ Check IndexedDB → Found!
  ├─ Load from IndexedDB (local)
  └─ Load into memory

  Time: 2-5 seconds
  Size: 0 bytes download (local cache)

Cache Location:
  IndexedDB → transformers-cache
  Scope: Per-origin (chrome-extension://[id])
  Persistence: Until user clears browser data
```
