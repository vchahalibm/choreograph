# Improved Prompt Design for Granite AI Model

## Current Prompt (Basic)

```
You are an AI that matches commands to scripts.
Available scripts: [script list]
Command: [user command]
Return script ID or 'none'
```

**Problems:**
- No structured output format
- No entity/parameter extraction
- No confidence scoring
- No reasoning explanation
- No intent classification
- Limited context about scripts

---

## Proposed Exhaustive Prompt (Advanced)

### Version 1: Comprehensive Structured Prompt

```
You are an intelligent automation assistant that analyzes natural language commands and matches them to browser automation scripts.

## Your Task
Analyze the user's command and:
1. Classify the intent (action type)
2. Extract all entities (names, URLs, values, etc.)
3. Extract all parameters and their values
4. Match to the most appropriate script
5. Provide reasoning and confidence score

## Available Scripts
{SCRIPT_LIST_JSON}

Each script has:
- id: Unique identifier
- title: Human-readable name
- description: What the script does
- actions: List of actions it performs
- parameters: Required/optional parameters
- keywords: Related terms

## User Command
"{USER_COMMAND}"

## Analysis Format
Respond with ONLY a JSON object (no markdown, no explanation):

{
  "classification": {
    "primary_intent": "<navigate|search|fill_form|click|extract|submit|scroll|wait|other>",
    "action_type": "<open|close|type|select|download|upload|execute|other>",
    "complexity": "<simple|medium|complex>",
    "requires_interaction": <true|false>
  },
  "entities": {
    "urls": ["<extracted URLs>"],
    "text_values": ["<text to type or search>"],
    "selectors": ["<CSS selectors or element descriptions>"],
    "file_paths": ["<file paths if mentioned>"],
    "numbers": [<numeric values>],
    "dates": ["<date strings>"],
    "other": {
      "<entity_type>": "<value>"
    }
  },
  "parameters": {
    "<param_name>": {
      "value": "<extracted value>",
      "confidence": <0.0-1.0>,
      "source": "<explicit|inferred|default>"
    }
  },
  "matched_script": {
    "script_id": "<script_id or null>",
    "confidence": <0.0-1.0>,
    "reasoning": "<why this script matches>",
    "match_factors": {
      "keyword_match": <0.0-1.0>,
      "action_match": <0.0-1.0>,
      "parameter_match": <0.0-1.0>,
      "description_match": <0.0-1.0>
    }
  },
  "alternative_matches": [
    {
      "script_id": "<alternative_script_id>",
      "confidence": <0.0-1.0>,
      "reasoning": "<why this could also work>"
    }
  ],
  "ambiguities": [
    "<any unclear aspects of the command>"
  ],
  "missing_info": [
    "<required parameters not found in command>"
  ]
}

## Matching Rules
1. Prioritize exact keyword matches in script titles
2. Consider action similarity (e.g., "go to" matches "navigate")
3. Check if command parameters match script requirements
4. Higher confidence if all required parameters are present
5. Lower confidence if command is ambiguous or vague

## Entity Extraction Guidelines
- URLs: Look for patterns like "example.com", "http://", "www."
- Text values: Extract quoted strings or phrases after keywords like "search for", "type", "enter"
- Selectors: Extract element descriptions like "button", "link", "form", "input"
- Numbers: Extract numeric values with context (quantity, timeout, index)
- Dates: Extract date references (today, tomorrow, specific dates)

## Parameter Extraction Guidelines
- Explicit: User directly states the value ("timeout of 5 seconds")
- Inferred: Value can be deduced from context ("wait a bit" → timeout: 2000ms)
- Default: No value mentioned, use script default

## Confidence Scoring Guidelines
- 0.9-1.0: Exact match, all parameters present, unambiguous
- 0.7-0.9: Strong match, most parameters present, minor ambiguity
- 0.5-0.7: Good match, some parameters missing, moderate ambiguity
- 0.3-0.5: Weak match, many missing parameters, high ambiguity
- 0.0-0.3: Poor match, incompatible action types, very ambiguous

## Examples

### Example 1: Simple Navigation
Command: "Go to google.com"

Response:
{
  "classification": {
    "primary_intent": "navigate",
    "action_type": "open",
    "complexity": "simple",
    "requires_interaction": false
  },
  "entities": {
    "urls": ["google.com"],
    "text_values": [],
    "selectors": [],
    "file_paths": [],
    "numbers": [],
    "dates": [],
    "other": {}
  },
  "parameters": {
    "url": {
      "value": "google.com",
      "confidence": 1.0,
      "source": "explicit"
    }
  },
  "matched_script": {
    "script_id": "nav_001",
    "confidence": 0.95,
    "reasoning": "Command explicitly requests navigation to a URL, matches navigate_to_url script",
    "match_factors": {
      "keyword_match": 0.9,
      "action_match": 1.0,
      "parameter_match": 1.0,
      "description_match": 0.9
    }
  },
  "alternative_matches": [],
  "ambiguities": [],
  "missing_info": []
}

### Example 2: Complex Form Interaction
Command: "Fill out the contact form with my email john@example.com and message about product inquiry"

Response:
{
  "classification": {
    "primary_intent": "fill_form",
    "action_type": "type",
    "complexity": "complex",
    "requires_interaction": true
  },
  "entities": {
    "urls": [],
    "text_values": ["john@example.com", "product inquiry"],
    "selectors": ["contact form", "email", "message"],
    "file_paths": [],
    "numbers": [],
    "dates": [],
    "other": {
      "email": "john@example.com",
      "form_type": "contact"
    }
  },
  "parameters": {
    "email": {
      "value": "john@example.com",
      "confidence": 1.0,
      "source": "explicit"
    },
    "message": {
      "value": "about product inquiry",
      "confidence": 0.8,
      "source": "explicit"
    },
    "form_selector": {
      "value": "contact form",
      "confidence": 0.7,
      "source": "inferred"
    }
  },
  "matched_script": {
    "script_id": "form_002",
    "confidence": 0.85,
    "reasoning": "Command requests form filling with multiple fields, matches fill_contact_form script",
    "match_factors": {
      "keyword_match": 0.8,
      "action_match": 0.9,
      "parameter_match": 0.8,
      "description_match": 0.9
    }
  },
  "alternative_matches": [
    {
      "script_id": "form_001",
      "confidence": 0.6,
      "reasoning": "Generic form filler could work but less specific"
    }
  ],
  "ambiguities": [
    "Message content is vague - 'about product inquiry' needs more detail"
  ],
  "missing_info": [
    "name",
    "subject"
  ]
}

### Example 3: Ambiguous Command
Command: "click the button"

Response:
{
  "classification": {
    "primary_intent": "click",
    "action_type": "click",
    "complexity": "simple",
    "requires_interaction": true
  },
  "entities": {
    "urls": [],
    "text_values": [],
    "selectors": ["button"],
    "file_paths": [],
    "numbers": [],
    "dates": [],
    "other": {}
  },
  "parameters": {
    "selector": {
      "value": "button",
      "confidence": 0.5,
      "source": "explicit"
    }
  },
  "matched_script": {
    "script_id": null,
    "confidence": 0.3,
    "reasoning": "Command is too vague - which button? Multiple scripts could handle clicking.",
    "match_factors": {
      "keyword_match": 0.5,
      "action_match": 0.8,
      "parameter_match": 0.2,
      "description_match": 0.2
    }
  },
  "alternative_matches": [
    {
      "script_id": "click_001",
      "confidence": 0.4,
      "reasoning": "Generic click handler but needs specific button selector"
    },
    {
      "script_id": "submit_001",
      "confidence": 0.35,
      "reasoning": "Could be a submit button"
    }
  ],
  "ambiguities": [
    "Which button? Need text, position, or more specific description",
    "On which page or form?"
  ],
  "missing_info": [
    "button_text or button_selector",
    "page_url or context"
  ]
}

Now analyze the user command and respond with the JSON structure.
```

---

## Version 2: Optimized for Token Efficiency

For production use with limited tokens (currently using `maxTokens: 10`), we need a more concise prompt:

```
Analyze this command and match to a script. Return JSON only.

## Scripts
{SCRIPT_LIST_JSON}

## Command
"{USER_COMMAND}"

## Response Format
{
  "intent": "<action_verb>",
  "entities": {
    "url": "<url>",
    "text": "<text>",
    "selector": "<element>"
  },
  "params": {"<name>": "<value>"},
  "match": {
    "id": "<script_id or null>",
    "confidence": <0.0-1.0>,
    "reason": "<brief explanation>"
  }
}

Rules:
1. Extract URLs, text values, element selectors
2. Match keywords: "go to"→navigate, "fill"→form, "click"→interact
3. High confidence (0.8+) if exact match + params present
4. Return null if no good match (<0.5 confidence)

Examples:
Command: "go to google.com" → {"intent":"navigate","entities":{"url":"google.com"},"params":{"url":"google.com"},"match":{"id":"nav_001","confidence":0.95,"reason":"exact navigation match"}}

Command: "search for hotels" → {"intent":"search","entities":{"text":"hotels"},"params":{"query":"hotels"},"match":{"id":"search_001","confidence":0.85,"reason":"search keyword + query param"}}

Respond with JSON:
```

---

## Version 3: Few-Shot Learning Optimized

Uses examples to teach the model the pattern:

```
Match user commands to automation scripts.

Scripts:
{SCRIPT_LIST_JSON}

Task: Return {"script_id": "<id>", "confidence": <0-1>, "params": {}, "reasoning": "<why>"}

Examples:
Q: "navigate to amazon.com"
A: {"script_id":"nav_001","confidence":0.95,"params":{"url":"amazon.com"},"reasoning":"exact match for navigation script, URL extracted"}

Q: "fill the form with email test@mail.com"
A: {"script_id":"form_002","confidence":0.85,"params":{"email":"test@mail.com"},"reasoning":"form filling intent, email parameter extracted"}

Q: "do something"
A: {"script_id":null,"confidence":0.1,"params":{},"reasoning":"command too vague, no clear script match"}

User command: "{USER_COMMAND}"
Response:
```

---

## Comparison Matrix

| Feature | Current | Version 1 (Exhaustive) | Version 2 (Optimized) | Version 3 (Few-Shot) |
|---------|---------|----------------------|---------------------|-------------------|
| Intent Classification | ❌ | ✅ Detailed | ✅ Basic | ✅ Implicit |
| Entity Extraction | ❌ | ✅ Comprehensive | ✅ Key entities | ✅ By example |
| Parameter Extraction | ❌ | ✅ With confidence | ✅ Basic | ✅ By example |
| Confidence Scoring | ❌ | ✅ Multi-factor | ✅ Single score | ✅ Single score |
| Reasoning | ❌ | ✅ Detailed | ✅ Brief | ✅ Brief |
| Alternative Matches | ❌ | ✅ | ❌ | ❌ |
| Ambiguity Detection | ❌ | ✅ | ❌ | ❌ |
| Token Efficiency | High | Low (~1000 tokens) | Medium (~300 tokens) | High (~200 tokens) |
| Response Tokens | ~5 | ~200-500 | ~50-100 | ~50-100 |
| Parse Complexity | Low | High | Medium | Medium |
| Accuracy Potential | Low | Very High | High | High |

---

## Recommended Approach: Hybrid Strategy

Combine the best aspects:

```
You are an automation assistant. Match commands to scripts and extract parameters.

## Scripts
{SCRIPT_LIST_JSON}

## Command
"{USER_COMMAND}"

## Response (JSON only, no markdown)
{
  "intent": "<navigate|search|click|fill|extract|other>",
  "entities": {
    "urls": ["<urls>"],
    "text": ["<text values>"],
    "elements": ["<selectors>"],
    "numbers": [<numbers>]
  },
  "parameters": {
    "<param_name>": {
      "value": "<value>",
      "confidence": <0.0-1.0>
    }
  },
  "match": {
    "script_id": "<id or null>",
    "confidence": <0.0-1.0>,
    "reasoning": "<1-2 sentence explanation>"
  }
}

## Matching Rules
1. Extract URLs (example.com, http://, www.), text (quoted or after keywords), elements (button/link/form)
2. Map intent: "go to"→navigate, "fill/type"→fill, "click/press"→click, "find/search"→search
3. Confidence: 0.9+ exact match, 0.7-0.9 good match, 0.5-0.7 partial match, <0.5 poor match
4. Return null if confidence <0.4 or command too vague

## Examples
"go to google.com" → {"intent":"navigate","entities":{"urls":["google.com"]},"parameters":{"url":{"value":"google.com","confidence":1.0}},"match":{"script_id":"nav_001","confidence":0.95,"reasoning":"Clear navigation intent with explicit URL"}}

"search for hotels in Paris" → {"intent":"search","entities":{"text":["hotels in Paris"]},"parameters":{"query":{"value":"hotels in Paris","confidence":1.0}},"match":{"script_id":"search_001","confidence":0.9,"reasoning":"Search intent with clear query text"}}

"click something" → {"intent":"click","entities":{},"parameters":{},"match":{"script_id":null,"confidence":0.2,"reasoning":"Too vague - no specific element or context provided"}}

Analyze: "{USER_COMMAND}"
```

**Benefits:**
- Structured entity extraction (URLs, text, elements, numbers)
- Clear parameter extraction with confidence
- Intent classification
- Reasonable token usage (~400 tokens prompt + ~100 response)
- Few-shot examples for pattern learning
- Explicit matching rules

---

## Implementation Considerations

### Current Token Limits
- Current setting: `maxTokens: 10` (only returns script ID)
- Recommended: `maxTokens: 150-200` for structured JSON response
- Trade-off: More tokens = better analysis but slower inference

### Model Configuration Changes Needed

**In `scripts/popup.js:processNLPCommand()`:**
```javascript
const response = await this.sendWorkerMessage('PROCESS_COMMAND', {
  command,
  scripts,
  options: {
    maxTokens: 150,      // Increased from 10
    temperature: 0.3,    // Keep low for deterministic
    doSample: false      // Disable sampling for consistency
  }
});
```

**In `src/ai-worker-source.js:handleProcessCommand()`:**
- Replace simple prompt with hybrid prompt
- Parse JSON response instead of simple text
- Handle malformed JSON gracefully
- Extract confidence and reasoning from response

### Fallback Strategy

If JSON parsing fails:
1. Try to extract script_id from raw text
2. Use regex to find script IDs in response
3. Fall back to text matching algorithm
4. Log error for debugging

---

## Testing Different Prompt Versions

### Test Commands Set

```javascript
const testCommands = [
  // Simple navigation
  "go to amazon.com",
  "navigate to https://github.com",
  "open youtube",

  // Search queries
  "search for machine learning courses",
  "find hotels in Tokyo",
  "look up weather forecast",

  // Form filling
  "fill the email field with test@example.com",
  "enter my name John Smith in the form",
  "type password in the login field",

  // Clicking
  "click the submit button",
  "press the login button",
  "click on the first result",

  // Complex commands
  "go to booking.com and search for hotels in Paris for next week",
  "fill out the contact form with my email and phone number",

  // Ambiguous commands
  "do something",
  "click it",
  "go there",
  "search"
];
```

### Evaluation Metrics

1. **Accuracy**: Correct script matched
2. **Entity Extraction**: All entities found
3. **Parameter Extraction**: All params extracted
4. **Confidence Calibration**: High confidence = correct match
5. **Ambiguity Detection**: Flags vague commands
6. **Response Time**: Inference speed
7. **Token Usage**: Actual tokens consumed

---

## Next Steps

1. **Choose prompt version** based on requirements:
   - Version 1: Maximum accuracy, research/testing
   - Version 2: Balanced accuracy and speed
   - Version 3: Maximum speed, simple use cases
   - Hybrid: Recommended for production

2. **Update token limits** in code:
   - Change `maxTokens: 10` → `150-200`
   - Update timeout for longer inference

3. **Implement JSON parsing** in worker:
   - Add try-catch for JSON.parse
   - Handle malformed responses
   - Extract fields from structured response

4. **Test with real scripts** and commands:
   - Measure accuracy improvements
   - Tune confidence thresholds
   - Adjust prompt based on results

5. **Add user feedback loop**:
   - "Was this the right script?"
   - Use feedback to improve prompts
   - Build fine-tuning dataset
