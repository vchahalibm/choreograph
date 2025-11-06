# Quick Start Guide - New Features

## 1. Using Variables in Scripts (5 minutes)

### Step 1: Add Parameters to Your Script
Open your script JSON file and add a `parameters` object:

```json
{
  "title": "My Script",
  "targetUrl": "https://example.com",
  "parameters": {
    "username": "defaultUser",
    "password": "defaultPass"
  },
  "steps": [...]
}
```

### Step 2: Use Variables in Steps
Replace hardcoded values with `{{variableName}}`:

```json
{
  "type": "change",
  "value": "{{username}}",
  "selectors": [["#username"]]
}
```

### Step 3: Run with Custom Values (Optional)
```javascript
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'my-script',
  parameters: {
    username: "john_doe",
    password: "secret123"
  }
});
```

**That's it!** Check the console for `🔄 Substituting {{username}} with "john_doe"`

---

## 2. Using Granite 4.0 AI Model (10 minutes)

### Step 1: Load the Model
Open the extension popup or run:

```javascript
chrome.runtime.sendMessage({ type: 'LOAD_NLP_MODEL' });
```

Wait 30-60 seconds. Watch console for:
```
🚀 Loading Granite 4.0 model...
📥 Loading model.onnx: 45%
✅ Granite 4.0 model loaded successfully on webgpu
```

### Step 2: Use Natural Language Commands
```javascript
chrome.runtime.sendMessage({
  type: 'PROCESS_NLP_COMMAND',
  command: 'Search for Sarah in WhatsApp'
}, (response) => {
  console.log('Matched script:', response.script.title);
  console.log('Parameters:', response.parameters);
  console.log('Confidence:', response.confidence);
});
```

### Expected Response
```javascript
{
  matched: true,
  script: { title: "WhatsappReadMsg - Fixed", ... },
  parameters: { searchText2: "Sarah" },
  confidence: 0.85,
  reasoning: "User wants to search for a contact"
}
```

**Pro Tip:** First run compiles shaders - subsequent runs are faster!

---

## 3. Debugger Persistence (No Setup Required!)

### Default Behavior (Automatic)
The debugger now **stays attached** during and after script execution:

```javascript
// Just run your script normally
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-script'
});

// Debugger stays attached - you can inspect the page!
```

Console shows:
```
✅ Script execution completed successfully
🔗 Keeping debugger attached for further interaction
```

### Optional: Detach After Completion
```javascript
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-script',
  parameters: {
    detachDebugger: true  // Add this to detach
  }
});
```

### Auto-Reattachment
If debugger detaches unexpectedly, it automatically reattaches:

```
⚠️ Debugger detached from tab 123, reason: target_closed
🔄 Attempting to reattach debugger to tab 123...
✅ Debugger reattached to tab 123
```

**No configuration needed!** It just works.

---

## Complete Example: Parameterized WhatsApp Script

### 1. Script Definition
**File:** `WhatsappSearchContact.json`

```json
{
  "title": "WhatsApp Search Contact",
  "targetUrl": "https://web.whatsapp.com",
  "description": "Search for a contact in WhatsApp",
  "parameters": {
    "contactName": "John"
  },
  "steps": [
    {
      "type": "waitForElement",
      "selectors": [["div[role='textbox'][contenteditable='true']"]],
      "visible": true,
      "timeout": 10000
    },
    {
      "type": "click",
      "selectors": [["div[role='textbox'][contenteditable='true']"]]
    },
    {
      "type": "change",
      "value": "{{contactName}}",
      "selectors": [["div[role='textbox'][contenteditable='true']"]]
    },
    {
      "type": "waitAfter",
      "duration": 1500
    },
    {
      "type": "click",
      "selectors": [["#pane-side div[role='row']:first-child div[role='gridcell']"]]
    }
  ]
}
```

### 2. Load Script into Extension
1. Open extension popup
2. Click "Load Script"
3. Select `WhatsappSearchContact.json`

### 3. Run with AI
```javascript
// Natural language command
chrome.runtime.sendMessage({
  type: 'PROCESS_NLP_COMMAND',
  command: 'Find Sarah in WhatsApp'
});

// AI extracts parameters and runs script with { contactName: "Sarah" }
```

### 4. Or Run Directly
```javascript
chrome.runtime.sendMessage({
  type: 'EXECUTE_SCRIPT',
  scriptId: 'whatsapp-search-contact',
  parameters: {
    contactName: 'Sarah'
  }
});
```

### 5. Watch the Magic
Console output:
```
📝 Script variables: { contactName: "Sarah" }
Starting to execute steps, tabId: 123, steps count: 5

▶️ Step 1/5: waitForElement
✅ Completed: waitForElement

▶️ Step 2/5: click
✅ Completed: click

▶️ Step 3/5: change
🔄 Substituting {{contactName}} with "Sarah"
⌨️ Typing "Sarah" into element: div[role='textbox'][contenteditable='true']
✓ DOM typing successful (contenteditable)
✅ Completed: change

▶️ Step 4/5: waitAfter
✅ Completed: waitAfter

▶️ Step 5/5: click
🎯 Using CDP trusted click for WhatsApp element
🎯 CDP click using DOM.getBoxModel at (235, 150)
✓ CDP click complete at (235, 150)
✅ Completed: click

🎉 All steps completed
✅ Script execution completed successfully
🔗 Keeping debugger attached for further interaction
```

---

## Troubleshooting

### Variables Not Working?
```bash
# Check console for this:
🔄 Substituting {{contactName}} with "Sarah"

# If you see this instead:
⚠️ Variable {{contactName}} not found in parameters

# Fix: Make sure parameter name matches exactly (case-sensitive)
```

### Model Not Loading?
```bash
# Check WebGPU:
navigator.gpu  // Should return an object

# If undefined, model uses WASM (slower but works)
# Check console for:
🖥️ WebGPU available: false
⚙️ Model config: { device: "wasm" }
```

### Debugger Keeps Detaching?
```bash
# Check console for:
⚠️ Debugger detached from tab 123, reason: canceled_by_user

# This means you manually detached it
# Let the extension manage it automatically instead
```

---

## Best Practices

### 1. Variable Naming
✅ **Good:**
```json
"parameters": {
  "contactName": "John",
  "messageText": "Hello",
  "searchQuery": "test"
}
```

❌ **Bad:**
```json
"parameters": {
  "var1": "John",           // Not descriptive
  "contact-name": "John",   // Uses dash (won't work)
  "123name": "John"         // Starts with number
}
```

### 2. Model Usage
✅ **Good:**
- Load model once on extension start
- Use descriptive script titles and descriptions
- Keep commands natural: "Search for John"

❌ **Bad:**
- Loading model for every command
- Vague script descriptions
- Cryptic commands: "do the thing"

### 3. Debugger Management
✅ **Good:**
- Let extension manage attachment/detachment
- Use `detachDebugger: true` only when needed
- Monitor console for reattachment issues

❌ **Bad:**
- Manually attaching/detaching constantly
- Ignoring console warnings
- Fighting with auto-reattachment

---

## Next Steps

1. **Read full docs:** [FEATURES_UPDATE.md](FEATURES_UPDATE.md)
2. **Check changelog:** [CHANGELOG.md](CHANGELOG.md)
3. **Try examples:** Use `WhatsappReadMsg-Fixed.json` as template
4. **Experiment:** Create your own parameterized scripts
5. **Optimize:** Profile script performance with different parameters

---

## Quick Reference Card

### Message Types
```javascript
// Execute script
{ type: 'EXECUTE_SCRIPT', scriptId: string, parameters: object }

// Load AI model
{ type: 'LOAD_NLP_MODEL' }

// Process natural language
{ type: 'PROCESS_NLP_COMMAND', command: string, options: object }

// Attach debugger
{ type: 'ATTACH_DEBUGGER', tabId: number | url: string }

// Detach debugger
{ type: 'DETACH_DEBUGGER', tabId: number }
```

### Variable Syntax
```json
"value": "{{variableName}}"          // Simple
"url": "https://{{domain}}/{{path}}" // Multiple
"text": "Hello {{firstName}} {{lastName}}" // Combined
```

### Console Indicators
- `🔄` Variable substitution
- `🚀` Model loading started
- `📥` Model file downloading
- `✅` Success
- `❌` Error
- `⚠️` Warning
- `🔗` Debugger attached
- `🔌` Debugger detached
- `📝` Script variables

---

**Ready to automate!** 🚀
