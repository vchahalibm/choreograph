# Intent Classification and Routing Flow

## Quick Answer

**Script matching ONLY happens for ACTION intents.** For INFORMATIONAL intents, the system uses predefined keyword-based responses instead.

---

## Complete Flow Diagram

```
User types command: "what is machine learning"
    ↓
┌─────────────────────────────────────────────────────┐
│ STEP 1: Model Classification (classifyIntent)      │
│                                                     │
│ Prompt sent to Granite 4.0 Micro:                  │
│ "Classify user intent: ..."                        │
│                                                     │
│ Model responds: "INFORMATIONAL"                    │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ STEP 2: Build Classification Object                │
│ (buildSimpleClassification function)               │
│                                                     │
│ {                                                   │
│   intent: {                                         │
│     primary_category: "INFORMATIONAL",              │
│     confidence: 0.8                                 │
│   },                                                │
│   routing: {                                        │
│     handler: "llm"  ← Routes to LLM handler        │
│   }                                                 │
│ }                                                   │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ STEP 3: Route to Handler (routeToHandler)          │
│                                                     │
│ Intent: INFORMATIONAL → Handler: "llm"             │
│                                                     │
│ Calls: handleLLMIntent()                           │
│ (NO script matching - scripts not used!)          │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ STEP 4: Generate Response (handleLLMIntent)        │
│                                                     │
│ if (command.includes('machine learning')) {        │
│   response = "Machine learning is a subset..."     │
│ }                                                   │
│                                                     │
│ Returns predefined response (no model generation)  │
└─────────────────────────────────────────────────────┘
    ↓
Response displayed to user
```

---

## Intent Types and Their Handlers

| Intent Type | Handler | Uses Scripts? | How Response is Generated |
|-------------|---------|---------------|---------------------------|
| **INFORMATIONAL** | `llm` | ❌ No | Keyword matching → Predefined responses |
| **ACTION** | `script_executor` | ✅ Yes | Script matching → Execute automation |
| **CONVERSATIONAL** | `llm` | ❌ No | Predefined responses (hello, thanks, etc.) |
| **META** | `help_system` | ❌ No | Predefined help text |

---

## Code Flow in Detail

### 1. Classification (src/ai-worker-source.js:156-223)

```javascript
async function classifyIntent(command, scripts, options) {
  // Simple prompt - just asks for category
  const prompt = `Classify user intent:
User: "${command}"
Intent (pick one):
1. INFORMATIONAL - questions about facts
2. ACTION - browser automation commands
3. CONVERSATIONAL - greetings, thanks
4. META - help requests
Answer with just the category name:`;

  // Model generates: "INFORMATIONAL" (one word)
  const outputs = await model.generate({...});

  // Build classification object
  return buildSimpleClassification(category, command, scripts);
}
```

**Output:**
```json
{
  "intent": {
    "primary_category": "INFORMATIONAL",
    "confidence": 0.8
  },
  "routing": {
    "handler": "llm"  // ← This determines which handler is called
  }
}
```

---

### 2. Routing Logic (src/ai-worker-source.js:226-250)

```javascript
function buildSimpleClassification(category, command, scripts) {
  const classification = {
    routing: {
      handler: category === 'ACTION' ? 'script_executor' :
                category === 'META' ? 'help_system' : 'llm',
      // ↑ INFORMATIONAL → 'llm' handler (no scripts!)
    }
  };
  return classification;
}
```

**Routing Table:**
- `INFORMATIONAL` → `handler: "llm"`
- `ACTION` → `handler: "script_executor"`
- `CONVERSATIONAL` → `handler: "llm"`
- `META` → `handler: "help_system"`

---

### 3. Handler Dispatch (src/ai-worker-source.js:289-325)

```javascript
async function routeToHandler(classification, command, scripts, options) {
  const { routing } = classification;

  switch (routing.handler) {
    case 'script_executor':
      // ACTION intents → Match to scripts
      return await handleActionIntent(classification, command, scripts);

    case 'llm':
      // INFORMATIONAL, CONVERSATIONAL → NO script matching
      return await handleLLMIntent(classification, command, options);

    case 'help_system':
      // META intents → Help text
      return handleMetaIntent(classification, command);
  }
}
```

---

### 4A. INFORMATIONAL Handler (src/ai-worker-source.js:404-437)

**For INFORMATIONAL intents - NO script matching happens here!**

```javascript
async function handleLLMIntent(classification, command, options) {
  const { intent } = classification;
  const category = intent.primary_category;

  let response = '';

  switch (category) {
    case 'INFORMATIONAL':
      // Simple keyword matching in the command
      const lowerCmd = command.toLowerCase();

      if (lowerCmd.includes('machine learning')) {
        response = 'Machine learning is a subset of artificial intelligence...';
      } else if (lowerCmd.includes('granite') || lowerCmd.includes('model')) {
        response = 'I\'m powered by IBM Granite 4.0 Micro...';
      } else if (lowerCmd.includes('choreograph')) {
        response = 'Choreograph is an AI-powered browser automation...';
      } else {
        response = 'I can help answer questions, but I work best with browser automation tasks...';
      }
      break;
  }

  return {
    matched: true,
    intent_category: category,
    response: response,  // Predefined response, not generated
    classification
  };
}
```

**Key Point:** This function uses **keyword matching** in the command to select predefined responses. No scripts involved!

---

### 4B. ACTION Handler (src/ai-worker-source.js:328-401)

**Only ACTION intents use script matching:**

```javascript
async function handleActionIntent(classification, command, scripts) {
  // If no scripts available
  if (scripts.length === 0) {
    return {
      matched: false,
      intent_category: 'ACTION',
      message: 'No scripts available'
    };
  }

  // Try keyword matching with scripts
  const lowerCommand = command.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const script of scripts) {
    const title = (script.title || '').toLowerCase();
    const description = (script.description || '').toLowerCase();
    let score = 0;

    if (lowerCommand.includes(title)) score += 0.8;
    if (lowerCommand.includes(description)) score += 0.6;

    // Calculate match score...

    if (score > bestScore) {
      bestScore = score;
      bestMatch = script;
    }
  }

  if (bestScore > 0.3) {
    return {
      matched: true,
      intent_category: 'ACTION',
      script: bestMatch,  // ← Matched script returned
      confidence: bestScore
    };
  }

  return {
    matched: false,
    intent_category: 'ACTION',
    message: 'No matching script found'
  };
}
```

**Key Point:** This function searches through available scripts and matches based on title/description keywords.

---

## Example Flows

### Example 1: "what is machine learning"

```
1. Model classifies → "INFORMATIONAL"
2. Routing → handler: "llm"
3. handleLLMIntent() called
   - Checks: command.includes('machine learning') → TRUE
   - Returns: "Machine learning is a subset of artificial intelligence..."
4. Scripts never touched!
```

### Example 2: "go to google.com"

```
1. Model classifies → "ACTION"
2. Routing → handler: "script_executor"
3. handleActionIntent() called
   - Searches scripts for matching "go" or "navigate"
   - Finds script with title "Navigate to URL"
   - Returns: {matched: true, script: {...}}
4. Script executed by popup/background
```

### Example 3: "hello"

```
1. Model classifies → "CONVERSATIONAL"
2. Routing → handler: "llm"
3. handleLLMIntent() called
   - Calls getConversationalResponse()
   - Returns: "Hello! I'm Choreograph AI. How can I help you today?"
4. Scripts never touched!
```

---

## Why This Design?

### Two-Stage Architecture

**Stage 1: Granite Model**
- Simple classification (INFORMATIONAL vs ACTION vs CONVERSATIONAL vs META)
- Just outputs one word
- Fast and reliable

**Stage 2: Code-Based Routing**
- INFORMATIONAL → Keyword matching for predefined responses
- ACTION → Script matching for automation
- CONVERSATIONAL → Predefined friendly responses
- META → Help system

### Benefits

1. **Model does what it's good at:** Simple classification
2. **Code does what it's good at:** Keyword matching, script selection, predefined responses
3. **Fast:** No complex JSON generation
4. **Reliable:** Predefined responses > Model-generated text for small models
5. **Maintainable:** Easy to add new responses or scripts

---

## Summary

**Q: Where is script matching for INFORMATIONAL intents?**

**A: There isn't any!** Script matching ONLY happens for ACTION intents.

**Flow:**
- **INFORMATIONAL** → Keyword match → Predefined response (no scripts)
- **ACTION** → Script match → Execute automation (uses scripts)
- **CONVERSATIONAL** → Predefined response (no scripts)
- **META** → Help text (no scripts)

**The model's job:** Just classify the intent type (one word)

**Code's job:** Everything else (routing, responses, script matching)

This separation makes the system fast, reliable, and easy to debug!
