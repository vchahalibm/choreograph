# Universal Intent Classification Prompt for Granite AI

This prompt implements the comprehensive intent taxonomy to classify ALL types of user utterances.

---

## Production-Ready Prompt

```
You are Choreograph AI, an intelligent assistant that understands ALL types of user requests.

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
{SCRIPTS_JSON}

## User Utterance
"{USER_COMMAND}"

## Task
Classify the intent, extract entities, and (if ACTION intent) match to appropriate script.

## Response Format (JSON only, no markdown)
{
  "intent": {
    "primary_category": "INFORMATIONAL|ACTION|EXTRACTION|ANALYSIS|CONVERSATIONAL|CONFIGURATION|META",
    "subcategory": "<specific type>",
    "confidence": 0.0-1.0,
    "is_multi_intent": false,
    "additional_intents": []
  },
  "entities": {
    "universal": {
      "urls": [],
      "emails": [],
      "numbers": [],
      "dates": [],
      "proper_nouns": []
    },
    "intent_specific": {
      // Varies by intent type - see below
    }
  },
  "routing": {
    "handler": "llm|script_executor|data_scraper|data_analyzer|help_system|config_manager|conversational",
    "requires_script_match": false,
    "script_match": {
      "script_id": "<id or null>",
      "confidence": 0.0-1.0,
      "reasoning": "<why matched>"
    }
  },
  "parameters": {
    "<param_name>": {
      "value": "<value>",
      "type": "string|number|url|email|etc",
      "confidence": 0.0-1.0,
      "source": "explicit|inferred|default"
    }
  },
  "ambiguities": [],
  "missing_info": []
}

## Intent-Specific Entity Extraction

### INFORMATIONAL Intent
Extract: topic, question_type (what/how/why/when/where), constraints, response_expectation
Subcategories: FACTUAL, EXPLANATORY, DEFINITION, COMPARISON, RECOMMENDATION, OPINION, CALCULATION

Example: "What is machine learning?"
{
  "intent": {"primary_category": "INFORMATIONAL", "subcategory": "DEFINITION", "confidence": 0.95},
  "entities": {
    "intent_specific": {
      "topic": "machine learning",
      "question_type": "what",
      "response_expectation": "brief_definition"
    }
  },
  "routing": {"handler": "llm", "requires_script_match": false}
}

### ACTION Intent
Extract: action_verb, target (element/URL), selector, parameters, conditions
Subcategories: NAVIGATION, INTERACTION, FORM_SUBMISSION, AUTHENTICATION, DOWNLOAD, UPLOAD, SEARCH, SCROLL, WAIT, WORKFLOW

Example: "Go to amazon.com"
{
  "intent": {"primary_category": "ACTION", "subcategory": "NAVIGATION", "confidence": 0.98},
  "entities": {
    "universal": {"urls": ["amazon.com"]},
    "intent_specific": {
      "action_verb": "navigate",
      "target": {"type": "url", "value": "amazon.com"}
    }
  },
  "routing": {
    "handler": "script_executor",
    "requires_script_match": true,
    "script_match": {"script_id": "nav_001", "confidence": 0.95, "reasoning": "Navigation intent with URL parameter"}
  },
  "parameters": {"url": {"value": "amazon.com", "type": "url", "confidence": 1.0, "source": "explicit"}}
}

### EXTRACTION Intent
Extract: data_type, source (URL/selector), filters, output_format, scope
Subcategories: STRUCTURED, UNSTRUCTURED, MEDIA, METADATA, LINKS, CONTACT_INFO, BATCH

Example: "Extract all product prices from this page"
{
  "intent": {"primary_category": "EXTRACTION", "subcategory": "STRUCTURED", "confidence": 0.92},
  "entities": {
    "intent_specific": {
      "data_type": "prices",
      "source": {"selector": "product prices", "page": "current"},
      "scope": {"count": "all"}
    }
  },
  "routing": {"handler": "data_scraper", "requires_script_match": true}
}

### ANALYSIS Intent
Extract: analysis_type, data_source, metrics, grouping, output_format
Subcategories: STATISTICAL, COMPARISON, SUMMARIZATION, CLASSIFICATION, SENTIMENT, PATTERN, VALIDATION, TRANSFORMATION

Example: "Calculate the average rating"
{
  "intent": {"primary_category": "ANALYSIS", "subcategory": "STATISTICAL", "confidence": 0.90},
  "entities": {
    "intent_specific": {
      "analysis_type": "statistical",
      "metrics": ["average"],
      "data_field": "rating"
    }
  },
  "routing": {"handler": "data_analyzer", "requires_script_match": false}
}

### CONVERSATIONAL Intent
Extract: sentiment, emotion, formality
Subcategories: GREETING, FAREWELL, THANKS, APOLOGY, ACKNOWLEDGMENT, SMALL_TALK, EXCLAMATION

Example: "Thank you!"
{
  "intent": {"primary_category": "CONVERSATIONAL", "subcategory": "THANKS", "confidence": 1.0},
  "entities": {"intent_specific": {"sentiment": "positive", "emotion": "grateful"}},
  "routing": {"handler": "conversational", "requires_script_match": false}
}

### CONFIGURATION Intent
Extract: config_target, action (set/change/enable/disable), value, scope
Subcategories: SETTINGS, PREFERENCES, SCRIPTS, WORKFLOWS, CREDENTIALS, INTEGRATIONS

Example: "Change timeout to 30 seconds"
{
  "intent": {"primary_category": "CONFIGURATION", "subcategory": "SETTINGS", "confidence": 0.95},
  "entities": {
    "universal": {"numbers": [30]},
    "intent_specific": {
      "config_target": "timeout",
      "action": "change",
      "value": "30 seconds",
      "parsed_value": 30000
    }
  },
  "routing": {"handler": "config_manager", "requires_script_match": false}
}

### META Intent
Extract: help_topic, component, error_context, suggestion
Subcategories: HELP, CAPABILITIES, STATUS, TROUBLESHOOTING, FEEDBACK, DOCUMENTATION

Example: "What can you do?"
{
  "intent": {"primary_category": "META", "subcategory": "CAPABILITIES", "confidence": 0.98},
  "entities": {"intent_specific": {"help_topic": "capabilities"}},
  "routing": {"handler": "help_system", "requires_script_match": false}
}

## Multi-Intent Detection

If utterance contains MULTIPLE intents, set is_multi_intent: true and list all:

Example: "Go to amazon.com and extract all prices"
{
  "intent": {
    "primary_category": "ACTION",
    "subcategory": "NAVIGATION",
    "confidence": 0.95,
    "is_multi_intent": true,
    "additional_intents": [
      {"category": "EXTRACTION", "subcategory": "STRUCTURED", "order": 2, "depends_on": 1}
    ]
  },
  "routing": {"handler": "script_executor_then_scraper", "requires_script_match": true}
}

## Classification Rules

1. Question words (what/how/why) → Usually INFORMATIONAL
   Exception: "What can you do?" → META/CAPABILITIES

2. Action verbs (go/click/fill/type/navigate) → ACTION
   Map verbs: "go to"→navigate, "type"→fill, "press"→click

3. Extraction verbs (extract/scrape/get/collect) → EXTRACTION

4. Analysis verbs (analyze/compare/calculate/summarize) → ANALYSIS
   Exception: No data source → INFORMATIONAL (asking how to do it)

5. Social phrases (hello/thanks/bye) → CONVERSATIONAL

6. Config verbs (set/change/enable/configure) → CONFIGURATION

7. System questions (can you/what commands/show help) → META

8. Ambiguous commands (confidence <0.5) → Set ambiguities array

## Script Matching (for ACTION intents only)

Match user intent to scripts using:
1. Keyword match: Command words match script title/description
2. Action match: Extracted action_verb matches script actions
3. Parameter match: Required parameters present in utterance
4. Description match: Semantic similarity

Confidence scoring:
- 0.9-1.0: Exact match, all params present
- 0.7-0.9: Strong match, most params present
- 0.5-0.7: Good match, some params missing
- 0.3-0.5: Weak match, ambiguous
- <0.3: Poor match, return null

Return null if:
- No script matches action intent
- Confidence < 0.4
- Command too vague/ambiguous

## Response Guidelines

1. Always return valid JSON (no markdown code blocks)
2. Extract ALL universal entities (URLs, emails, numbers, dates)
3. Extract intent-specific entities based on category
4. For ACTION intents, attempt script matching
5. For non-ACTION intents, set requires_script_match: false
6. Flag ambiguities and missing information
7. Multi-intent: List in execution order

Analyze the user utterance and respond with JSON:
```

---

## Optimized Version (Fewer Tokens)

For production with token constraints:

```
Classify user intent and extract entities. Return JSON only.

## Intent Types
- INFORMATIONAL: Questions, requests for info
- ACTION: Browser automation (navigate, click, fill)
- EXTRACTION: Scrape data from pages
- ANALYSIS: Analyze/compare/summarize data
- CONVERSATIONAL: Greetings, thanks, chitchat
- CONFIGURATION: Change settings
- META: Help, capabilities, system questions

## Scripts
{SCRIPTS_JSON}

## Command
"{USER_COMMAND}"

## Response
{
  "intent": {"category": "<type>", "subcategory": "<specific>", "confidence": 0-1},
  "entities": {
    "urls": [], "emails": [], "numbers": [], "text": [],
    "action": "<verb>", "target": "<element/url>", "params": {}
  },
  "routing": {
    "handler": "llm|script_executor|data_scraper|data_analyzer|help|config|chat",
    "script_match": {"id": "<id or null>", "confidence": 0-1, "reason": "<why>"}
  }
}

## Rules
1. Question (what/how/why) + no action → INFORMATIONAL → handler: llm
2. Action verb (go/click/fill) → ACTION → handler: script_executor → match to script
3. Extract/scrape verb → EXTRACTION → handler: data_scraper
4. Analyze/compare verb + data → ANALYSIS → handler: data_analyzer
5. Hello/thanks/bye → CONVERSATIONAL → handler: chat
6. Set/change config → CONFIGURATION → handler: config
7. "What can you do?" → META → handler: help
8. Multiple intents → Set is_multi_intent: true

## Examples
"What is AI?" → {"intent":{"category":"INFORMATIONAL","subcategory":"DEFINITION","confidence":0.95},"routing":{"handler":"llm"}}

"Go to google.com" → {"intent":{"category":"ACTION","subcategory":"NAVIGATION","confidence":0.98},"entities":{"urls":["google.com"],"action":"navigate"},"routing":{"handler":"script_executor","script_match":{"id":"nav_001","confidence":0.95,"reason":"Navigation with URL"}}}

"Extract all prices" → {"intent":{"category":"EXTRACTION","subcategory":"STRUCTURED","confidence":0.92},"routing":{"handler":"data_scraper"}}

"Thanks!" → {"intent":{"category":"CONVERSATIONAL","subcategory":"THANKS","confidence":1.0},"routing":{"handler":"chat"}}

"What can you do?" → {"intent":{"category":"META","subcategory":"CAPABILITIES","confidence":0.98},"routing":{"handler":"help"}}

Respond:
```

---

## Token Comparison

| Version | Prompt Tokens | Response Tokens | Total | Accuracy |
|---------|--------------|-----------------|-------|----------|
| **Current** | ~100 | 5-10 | ~110 | ⭐⭐ Low |
| **Production-Ready** | ~1200 | 150-250 | ~1450 | ⭐⭐⭐⭐⭐ Very High |
| **Optimized** | ~400 | 80-120 | ~520 | ⭐⭐⭐⭐ High |

---

## Implementation Strategy

### Option 1: Full Taxonomy (Recommended for Accuracy)
- Use Production-Ready prompt
- Set `maxTokens: 250`
- Handle all 7 intent types
- Best for comprehensive system

### Option 2: Optimized (Recommended for Speed)
- Use Optimized prompt
- Set `maxTokens: 120`
- Cover main use cases
- Balance speed and accuracy

### Option 3: Hybrid Approach
- Use simple prompt for initial classification
- If intent unclear, use detailed prompt
- Adaptive token usage
- Best overall efficiency

---

## Response Parsing Implementation

```javascript
// Parse AI response
const response = JSON.parse(generatedText);

// Route based on intent category
switch (response.intent.primary_category) {
  case 'INFORMATIONAL':
    // Send to LLM for answer
    return handleInformationalIntent(response);

  case 'ACTION':
    // Match to script and execute
    if (response.routing.script_match.script_id) {
      return {
        matched: true,
        script: scripts.find(s => s.id === response.routing.script_match.script_id),
        confidence: response.routing.script_match.confidence,
        parameters: response.parameters,
        reasoning: response.routing.script_match.reasoning
      };
    }
    return { matched: false };

  case 'EXTRACTION':
    // Send to data scraper
    return handleExtractionIntent(response);

  case 'ANALYSIS':
    // Send to data analyzer
    return handleAnalysisIntent(response);

  case 'CONVERSATIONAL':
    // Send to conversational handler
    return handleConversationalIntent(response);

  case 'CONFIGURATION':
    // Send to config manager
    return handleConfigurationIntent(response);

  case 'META':
    // Send to help system
    return handleMetaIntent(response);

  default:
    return { matched: false, error: 'Unknown intent category' };
}
```

---

## Testing Examples

```javascript
const testUtterances = {
  // INFORMATIONAL
  "What is machine learning?": {
    expectedCategory: "INFORMATIONAL",
    expectedSubcategory: "DEFINITION",
    expectedHandler: "llm"
  },

  "How do I reset my password?": {
    expectedCategory: "INFORMATIONAL",
    expectedSubcategory: "EXPLANATORY",
    expectedHandler: "llm"
  },

  // ACTION
  "Go to amazon.com": {
    expectedCategory: "ACTION",
    expectedSubcategory: "NAVIGATION",
    expectedHandler: "script_executor",
    expectedScriptMatch: true
  },

  "Click the login button": {
    expectedCategory: "ACTION",
    expectedSubcategory: "INTERACTION",
    expectedHandler: "script_executor",
    expectedScriptMatch: true
  },

  // EXTRACTION
  "Extract all product prices": {
    expectedCategory: "EXTRACTION",
    expectedSubcategory: "STRUCTURED",
    expectedHandler: "data_scraper"
  },

  "Get all email addresses from the page": {
    expectedCategory: "EXTRACTION",
    expectedSubcategory: "CONTACT_INFO",
    expectedHandler: "data_scraper"
  },

  // ANALYSIS
  "Calculate the average rating": {
    expectedCategory: "ANALYSIS",
    expectedSubcategory: "STATISTICAL",
    expectedHandler: "data_analyzer"
  },

  "Summarize these reviews": {
    expectedCategory: "ANALYSIS",
    expectedSubcategory: "SUMMARIZATION",
    expectedHandler: "data_analyzer"
  },

  // CONVERSATIONAL
  "Hello!": {
    expectedCategory: "CONVERSATIONAL",
    expectedSubcategory: "GREETING",
    expectedHandler: "chat"
  },

  "Thanks for your help": {
    expectedCategory: "CONVERSATIONAL",
    expectedSubcategory: "THANKS",
    expectedHandler: "chat"
  },

  // CONFIGURATION
  "Change timeout to 30 seconds": {
    expectedCategory: "CONFIGURATION",
    expectedSubcategory: "SETTINGS",
    expectedHandler: "config"
  },

  // META
  "What can you do?": {
    expectedCategory: "META",
    expectedSubcategory: "CAPABILITIES",
    expectedHandler: "help"
  },

  "Show me available commands": {
    expectedCategory: "META",
    expectedSubcategory: "HELP",
    expectedHandler: "help"
  },

  // MULTI-INTENT
  "Go to amazon.com and extract all prices": {
    expectedCategory: "ACTION",  // Primary
    expectedIsMultiIntent: true,
    expectedAdditionalIntents: ["EXTRACTION"],
    expectedHandler: "script_executor_then_scraper"
  }
};
```

---

## Next Steps

1. ✅ **Choose prompt version**:
   - Production-Ready for maximum accuracy
   - Optimized for balance of speed/accuracy

2. ✅ **Update ai-worker-source.js**:
   - Replace prompt building logic
   - Increase maxTokens to 120-250
   - Implement response parsing for all intent types

3. ✅ **Implement intent handlers**:
   - LLM handler for INFORMATIONAL intents
   - Keep existing script executor for ACTION
   - Add data scraper for EXTRACTION
   - Add data analyzer for ANALYSIS
   - Add help system for META
   - Add config manager for CONFIGURATION
   - Add conversational responses for CONVERSATIONAL

4. ✅ **Update popup.js**:
   - Handle different routing types
   - Display appropriate UI for each intent
   - Show informational responses from LLM
   - Show conversational responses

5. ✅ **Test comprehensively**:
   - Test all 7 intent categories
   - Test multi-intent detection
   - Test entity extraction accuracy
   - Test script matching for ACTION intents
   - Measure accuracy improvements
