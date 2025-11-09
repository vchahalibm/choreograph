# Comprehensive Intent Taxonomy for Choreograph AI

## Overview

This document defines a complete intent classification system that handles ALL types of user utterances, not just browser automation actions.

---

## Intent Taxonomy Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOP-LEVEL INTENTS                            │
└─────────────────────────────────────────────────────────────────┘

1. INFORMATIONAL      - User seeks information or answers
2. ACTION             - User wants to perform browser automation
3. EXTRACTION         - User wants to extract/scrape data
4. ANALYSIS           - User wants to analyze data
5. CONVERSATIONAL     - Chitchat, greetings, acknowledgments
6. CONFIGURATION      - User wants to configure the system
7. META               - Questions about the system itself
```

---

## 1. INFORMATIONAL Intent

**Definition:** User is asking a question or seeking information from the LLM.

### Sub-Categories
```
INFORMATIONAL
├── FACTUAL           - Objective facts ("What is the capital of France?")
├── EXPLANATORY       - Explanations/how-to ("How does OAuth work?")
├── DEFINITION        - Definitions ("What does API mean?")
├── COMPARISON        - Comparing options ("Difference between X and Y?")
├── RECOMMENDATION    - Seeking suggestions ("Best laptop under $1000?")
├── OPINION           - Asking for opinions ("Is Python good for ML?")
└── CALCULATION       - Math/computation ("What's 15% of 250?")
```

### Entity Types
- **Topic**: The subject being asked about
- **Constraints**: Filters (price range, time period, location)
- **Context**: Additional context for the question
- **Scope**: Breadth of answer needed (brief, detailed, comprehensive)

### Example Utterances
```
"What is machine learning?"
"How do I reset my password?"
"What's the weather like in Tokyo?"
"Explain the difference between SQL and NoSQL"
"Can you recommend a good JavaScript framework?"
"Calculate the compound interest on $1000 at 5% for 3 years"
```

### Attributes to Extract
```json
{
  "intent_category": "INFORMATIONAL",
  "intent_subcategory": "EXPLANATORY|FACTUAL|DEFINITION|etc",
  "entities": {
    "topic": "<main subject>",
    "constraints": {
      "price_range": "<min-max>",
      "location": "<place>",
      "time_period": "<when>",
      "other": {}
    },
    "context_keywords": ["<relevant terms>"],
    "question_type": "what|how|why|when|where|who|which"
  },
  "response_expectation": "brief|detailed|step_by_step|list|comparison"
}
```

---

## 2. ACTION Intent

**Definition:** User wants to perform browser automation or system actions.

### Sub-Categories
```
ACTION
├── NAVIGATION        - Go to URLs, browse pages
├── INTERACTION       - Click, type, select, drag
├── FORM_SUBMISSION   - Fill and submit forms
├── AUTHENTICATION    - Login, logout, session management
├── DOWNLOAD          - Download files
├── UPLOAD            - Upload files
├── SEARCH            - Search within pages or sites
├── SCROLL            - Scroll to elements or positions
├── WAIT              - Wait for elements or conditions
└── WORKFLOW          - Multi-step automation sequences
```

### Entity Types
- **Target**: What to act upon (URL, element, form field)
- **Action Verb**: Specific action (click, type, navigate)
- **Parameters**: Values needed (URL, text, selector)
- **Conditions**: When/how to perform action
- **Sequence**: Order for multi-step actions

### Example Utterances
```
"Go to amazon.com"
"Click the login button"
"Fill the email field with test@example.com"
"Navigate to the checkout page and complete purchase"
"Type 'machine learning' into the search box"
"Download the PDF file"
"Wait for the page to load then click submit"
```

### Attributes to Extract
```json
{
  "intent_category": "ACTION",
  "intent_subcategory": "NAVIGATION|INTERACTION|FORM_SUBMISSION|etc",
  "entities": {
    "action_verb": "navigate|click|type|fill|submit|etc",
    "target": {
      "type": "url|element|field|button|link",
      "value": "<specific target>",
      "selector": "<CSS selector or description>"
    },
    "parameters": {
      "<param_name>": {
        "value": "<value>",
        "type": "string|number|url|email|etc",
        "confidence": 0.0-1.0
      }
    },
    "conditions": {
      "wait_for": "<element or event>",
      "timeout": <milliseconds>,
      "retry": <count>
    },
    "sequence_order": <step number if multi-step>
  },
  "requires_confirmation": true|false,
  "destructive": true|false
}
```

---

## 3. EXTRACTION Intent

**Definition:** User wants to extract, scrape, or collect data from web pages.

### Sub-Categories
```
EXTRACTION
├── STRUCTURED        - Extract from tables, lists
├── UNSTRUCTURED      - Extract from paragraphs, text
├── MEDIA             - Extract images, videos, files
├── METADATA          - Extract page metadata, headers
├── LINKS             - Extract all links
├── CONTACT_INFO      - Extract emails, phones, addresses
└── BATCH             - Extract from multiple pages
```

### Entity Types
- **Data Type**: What to extract (text, images, links, etc.)
- **Source**: Where to extract from (URL, selector, page section)
- **Filters**: Criteria for selection
- **Format**: Desired output format (JSON, CSV, plain text)
- **Scope**: Single page vs multiple pages

### Example Utterances
```
"Extract all product prices from this page"
"Get all email addresses from the contact page"
"Scrape the table data and save as CSV"
"Collect all image URLs from the gallery"
"Extract the article text and author name"
"Get all links from the navigation menu"
"Scrape product details from the first 10 results"
```

### Attributes to Extract
```json
{
  "intent_category": "EXTRACTION",
  "intent_subcategory": "STRUCTURED|UNSTRUCTURED|MEDIA|etc",
  "entities": {
    "data_type": "text|images|links|tables|metadata|etc",
    "source": {
      "url": "<page URL>",
      "selector": "<CSS selector>",
      "section": "<page section description>"
    },
    "filters": {
      "pattern": "<regex or keyword>",
      "attribute": "<HTML attribute to extract>",
      "constraints": {}
    },
    "output_format": "json|csv|txt|html",
    "scope": {
      "pages": "single|multiple|all",
      "count": <number of items>,
      "pagination": true|false
    }
  },
  "post_processing": ["clean|deduplicate|sort|format"]
}
```

---

## 4. ANALYSIS Intent

**Definition:** User wants to analyze, process, or transform data.

### Sub-Categories
```
ANALYSIS
├── STATISTICAL       - Calculate stats (avg, sum, count)
├── COMPARISON        - Compare data sets or values
├── SUMMARIZATION     - Summarize text or data
├── CLASSIFICATION    - Categorize or label data
├── SENTIMENT         - Analyze sentiment/tone
├── PATTERN           - Find patterns or trends
├── VALIDATION        - Validate data quality
└── TRANSFORMATION    - Transform data format/structure
```

### Entity Types
- **Analysis Type**: What kind of analysis
- **Data Source**: Where the data comes from
- **Metrics**: What to measure/calculate
- **Grouping**: How to group/aggregate
- **Output**: How to present results

### Example Utterances
```
"Analyze the sentiment of customer reviews"
"Compare prices across these three websites"
"Calculate the average rating of all products"
"Summarize this article in 3 bullet points"
"Find patterns in the sales data"
"Categorize these emails by topic"
"Count how many items are in stock vs out of stock"
```

### Attributes to Extract
```json
{
  "intent_category": "ANALYSIS",
  "intent_subcategory": "STATISTICAL|COMPARISON|SUMMARIZATION|etc",
  "entities": {
    "analysis_type": "sentiment|statistics|comparison|summary|etc",
    "data_source": {
      "type": "scraped|uploaded|provided|url",
      "location": "<where data is>",
      "format": "json|csv|text|html"
    },
    "metrics": ["average", "count", "sum", "trend", "etc"],
    "grouping": {
      "group_by": "<field to group by>",
      "aggregation": "sum|avg|count|min|max"
    },
    "filters": {
      "date_range": "<start to end>",
      "category": "<filter by category>",
      "threshold": "<min/max values>"
    },
    "output": {
      "format": "chart|table|summary|report",
      "visualization": "bar|line|pie|none"
    }
  }
}
```

---

## 5. CONVERSATIONAL Intent

**Definition:** Social interactions, greetings, acknowledgments (non-task oriented).

### Sub-Categories
```
CONVERSATIONAL
├── GREETING          - Hello, hi, good morning
├── FAREWELL          - Goodbye, bye, see you
├── THANKS            - Thank you, thanks
├── APOLOGY           - Sorry, my bad
├── ACKNOWLEDGMENT    - OK, got it, I see
├── SMALL_TALK        - How are you, what's up
└── EXCLAMATION       - Wow, great, oh no
```

### Example Utterances
```
"Hello!"
"Thanks for your help"
"Goodbye"
"How are you doing?"
"OK, got it"
"That's great!"
```

### Attributes to Extract
```json
{
  "intent_category": "CONVERSATIONAL",
  "intent_subcategory": "GREETING|THANKS|FAREWELL|etc",
  "entities": {
    "sentiment": "positive|neutral|negative",
    "formality": "formal|casual",
    "emotion": "happy|grateful|apologetic|neutral"
  },
  "requires_response": true|false,
  "response_type": "acknowledgment|reciprocate|none"
}
```

---

## 6. CONFIGURATION Intent

**Definition:** User wants to configure, setup, or customize the system.

### Sub-Categories
```
CONFIGURATION
├── SETTINGS          - Change system settings
├── PREFERENCES       - Set user preferences
├── SCRIPTS           - Add/edit/delete scripts
├── WORKFLOWS         - Create/modify workflows
├── CREDENTIALS       - Manage credentials/auth
└── INTEGRATIONS      - Connect external services
```

### Example Utterances
```
"Change the default timeout to 10 seconds"
"Add a new script for checking email"
"Set my preferred language to Spanish"
"Enable notifications for completed tasks"
"Save my login credentials for Gmail"
```

### Attributes to Extract
```json
{
  "intent_category": "CONFIGURATION",
  "intent_subcategory": "SETTINGS|SCRIPTS|PREFERENCES|etc",
  "entities": {
    "config_target": "timeout|language|notifications|scripts|etc",
    "action": "set|change|enable|disable|add|remove",
    "value": "<new value>",
    "scope": "global|user|session"
  },
  "requires_confirmation": true|false,
  "reversible": true|false
}
```

---

## 7. META Intent

**Definition:** Questions about the system, capabilities, or help requests.

### Sub-Categories
```
META
├── HELP              - How to use the system
├── CAPABILITIES      - What can the system do
├── STATUS            - System status/health
├── TROUBLESHOOTING   - Error help, debugging
├── FEEDBACK          - Report issues or suggestions
└── DOCUMENTATION     - Request documentation
```

### Example Utterances
```
"What can you do?"
"How do I create a new workflow?"
"Show me available commands"
"Why isn't my script working?"
"Is the AI model loaded?"
"Report a bug: login button not working"
```

### Attributes to Extract
```json
{
  "intent_category": "META",
  "intent_subcategory": "HELP|CAPABILITIES|STATUS|etc",
  "entities": {
    "help_topic": "<specific feature or command>",
    "component": "scripts|workflows|ai_model|extension",
    "error_context": "<error message or description>",
    "suggestion": "<user's suggestion or feedback>"
  },
  "urgency": "low|medium|high"
}
```

---

## Multi-Intent Detection

Some utterances contain MULTIPLE intents that should be handled sequentially.

### Examples

**Example 1: Information + Action**
```
"What's the price of this product and add it to cart"

Intent 1: INFORMATIONAL (extract price)
Intent 2: ACTION (add to cart)
```

**Example 2: Extraction + Analysis**
```
"Scrape all reviews and calculate the average rating"

Intent 1: EXTRACTION (scrape reviews)
Intent 2: ANALYSIS (calculate average)
```

**Example 3: Action + Extraction**
```
"Go to amazon.com and get all product titles"

Intent 1: ACTION (navigate to amazon.com)
Intent 2: EXTRACTION (get product titles)
```

### Multi-Intent Attributes
```json
{
  "is_multi_intent": true,
  "intents": [
    {
      "order": 1,
      "category": "ACTION",
      "subcategory": "NAVIGATION",
      "entities": {...},
      "depends_on": null
    },
    {
      "order": 2,
      "category": "EXTRACTION",
      "subcategory": "STRUCTURED",
      "entities": {...},
      "depends_on": 1  // Depends on intent 1 completing
    }
  ],
  "execution_mode": "sequential|parallel"
}
```

---

## Intent Classification Decision Tree

```
User Utterance
    │
    ├─ Contains question words (what, how, why)?
    │  └─ YES → Likely INFORMATIONAL
    │      ├─ Asks about system? → META
    │      ├─ Asks to calculate? → ANALYSIS (if has data) or INFORMATIONAL
    │      └─ General knowledge? → INFORMATIONAL
    │
    ├─ Contains action verbs (go, click, fill, submit)?
    │  └─ YES → Likely ACTION
    │      ├─ Multiple steps? → ACTION/WORKFLOW
    │      └─ Single step? → ACTION/<subcategory>
    │
    ├─ Contains extraction verbs (get, scrape, extract, collect)?
    │  └─ YES → Likely EXTRACTION
    │      ├─ Followed by analysis? → EXTRACTION + ANALYSIS (multi-intent)
    │      └─ Just extraction? → EXTRACTION
    │
    ├─ Contains analysis verbs (analyze, compare, summarize, calculate)?
    │  └─ YES → Likely ANALYSIS
    │      ├─ No data source? → INFORMATIONAL (asking how)
    │      └─ Has data? → ANALYSIS
    │
    ├─ Social phrases (hello, thanks, bye)?
    │  └─ YES → CONVERSATIONAL
    │
    ├─ Configuration verbs (set, change, configure, enable)?
    │  └─ YES → CONFIGURATION
    │
    └─ About system (can you, what can, how do I)?
       └─ YES → META
```

---

## Entity & Attribute Extraction Rules

### Universal Entities (extracted for all intents)
```json
{
  "raw_utterance": "<original text>",
  "detected_language": "en|es|fr|etc",
  "entities": {
    "urls": ["<all URLs mentioned>"],
    "emails": ["<all emails>"],
    "phone_numbers": ["<all phones>"],
    "dates": ["<all date references>"],
    "times": ["<all time references>"],
    "numbers": [<all numeric values>],
    "proper_nouns": ["<names, places, brands>"]
  },
  "sentiment": "positive|neutral|negative",
  "urgency": "low|medium|high",
  "ambiguity_score": 0.0-1.0
}
```

### Intent-Specific Entities
Each intent category has its own entity schema (defined above in each section).

### Attribute Confidence Scoring
```json
{
  "attribute_name": {
    "value": "<extracted value>",
    "confidence": 0.0-1.0,
    "source": "explicit|inferred|default",
    "alternatives": [
      {"value": "<alt value>", "confidence": 0.0-1.0}
    ]
  }
}
```

---

## Routing Logic

After intent classification, route to appropriate handler:

```
┌─────────────────────────────────────────────────────┐
│           Intent Classification Result              │
└──────────────────┬──────────────────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     │                           │
     ▼                           ▼
SINGLE INTENT              MULTI-INTENT
     │                           │
     ├─ INFORMATIONAL → LLM Response Handler
     ├─ ACTION → Script Matcher & Executor
     ├─ EXTRACTION → Data Scraper
     ├─ ANALYSIS → Data Analyzer
     ├─ CONVERSATIONAL → Conversational Handler
     ├─ CONFIGURATION → Settings Manager
     └─ META → Help System

For MULTI-INTENT:
1. Parse all intents
2. Determine dependencies
3. Create execution pipeline
4. Execute in order (sequential or parallel)
5. Aggregate results
```

---

## Example Classifications

### Example 1: Pure Informational
```
Utterance: "What is the capital of France?"

Classification:
{
  "intent_category": "INFORMATIONAL",
  "intent_subcategory": "FACTUAL",
  "is_multi_intent": false,
  "entities": {
    "topic": "capital of France",
    "question_type": "what",
    "proper_nouns": ["France"]
  },
  "routing": "llm_response",
  "match_to_script": false
}
```

### Example 2: Pure Action
```
Utterance: "Go to amazon.com and click the login button"

Classification:
{
  "intent_category": "ACTION",
  "intent_subcategory": "WORKFLOW",
  "is_multi_intent": true,
  "intents": [
    {
      "order": 1,
      "category": "ACTION",
      "subcategory": "NAVIGATION",
      "entities": {
        "action_verb": "navigate",
        "target": {"type": "url", "value": "amazon.com"}
      }
    },
    {
      "order": 2,
      "category": "ACTION",
      "subcategory": "INTERACTION",
      "entities": {
        "action_verb": "click",
        "target": {"type": "button", "value": "login button"}
      }
    }
  ],
  "routing": "script_matcher",
  "match_to_script": true
}
```

### Example 3: Extraction + Analysis
```
Utterance: "Extract all product reviews and analyze the sentiment"

Classification:
{
  "intent_category": "EXTRACTION",  // Primary
  "intent_subcategory": "UNSTRUCTURED",
  "is_multi_intent": true,
  "intents": [
    {
      "order": 1,
      "category": "EXTRACTION",
      "subcategory": "UNSTRUCTURED",
      "entities": {
        "data_type": "text",
        "source": {"selector": "product reviews"},
        "scope": {"pages": "single", "count": "all"}
      }
    },
    {
      "order": 2,
      "category": "ANALYSIS",
      "subcategory": "SENTIMENT",
      "entities": {
        "analysis_type": "sentiment",
        "data_source": {"type": "scraped", "from_step": 1}
      },
      "depends_on": 1
    }
  ],
  "routing": "extraction_then_analysis",
  "match_to_script": true  // May need extraction script
}
```

### Example 4: Mixed (Info + Action)
```
Utterance: "What's the best laptop under $1000? Then go buy it"

Classification:
{
  "is_multi_intent": true,
  "intents": [
    {
      "order": 1,
      "category": "INFORMATIONAL",
      "subcategory": "RECOMMENDATION",
      "entities": {
        "topic": "laptop",
        "constraints": {"price_range": "under $1000"}
      }
    },
    {
      "order": 2,
      "category": "ACTION",
      "subcategory": "WORKFLOW",
      "entities": {
        "action_verb": "purchase",
        "target": {"type": "product", "value": "from_step_1"}
      },
      "depends_on": 1
    }
  ],
  "routing": "llm_then_script",
  "execution_mode": "sequential"
}
```

### Example 5: Configuration
```
Utterance: "Change the default timeout to 30 seconds"

Classification:
{
  "intent_category": "CONFIGURATION",
  "intent_subcategory": "SETTINGS",
  "is_multi_intent": false,
  "entities": {
    "config_target": "timeout",
    "action": "change",
    "value": "30 seconds",
    "parsed_value": 30000,  // milliseconds
    "scope": "global"
  },
  "routing": "settings_manager",
  "match_to_script": false,
  "requires_confirmation": true
}
```

### Example 6: Meta
```
Utterance: "What commands can I use?"

Classification:
{
  "intent_category": "META",
  "intent_subcategory": "CAPABILITIES",
  "is_multi_intent": false,
  "entities": {
    "help_topic": "commands",
    "component": "general"
  },
  "routing": "help_system",
  "match_to_script": false
}
```

---

## Summary

This taxonomy provides:

1. ✅ **7 Top-Level Intent Categories** (not just actions)
2. ✅ **30+ Sub-Categories** for fine-grained classification
3. ✅ **Intent-Specific Entity Schemas** for each category
4. ✅ **Multi-Intent Detection** for complex utterances
5. ✅ **Routing Logic** to appropriate handlers
6. ✅ **Confidence Scoring** for entities and classifications
7. ✅ **Decision Tree** for classification
8. ✅ **Comprehensive Examples** for each intent type

This enables the system to handle:
- ✅ Questions to the LLM (INFORMATIONAL)
- ✅ Browser automation (ACTION)
- ✅ Data scraping (EXTRACTION)
- ✅ Data analysis (ANALYSIS)
- ✅ Chitchat (CONVERSATIONAL)
- ✅ System configuration (CONFIGURATION)
- ✅ Help requests (META)
- ✅ Complex multi-intent commands

Next step: Create the actual prompt that implements this taxonomy!
