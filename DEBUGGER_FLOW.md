# DeskAgent - Debugger Attachment & Script Execution Flow

## Complete Code Flow Explanation

### 📌 Overview
When you execute a script, DeskAgent follows this flow:
1. Find or create the target tab
2. Attach debugger to the tab
3. Execute script steps one by one
4. Use Chrome DevTools Protocol to interact with the page

---

## 🔄 Step-by-Step Flow

### 1. User Triggers Script Execution

**Two ways to trigger:**

#### A. From Configuration Page:
```
User clicks "Execute" button
  ↓
config.js sends message to background:
  chrome.runtime.sendMessage({
    type: 'EXECUTE_SCRIPT',
    scriptId: 'script-id-123'
  })
```

#### B. From Chat Popup (with NLP):
```
User types command: "search google"
  ↓
popup.js processes with NLP
  ↓
Finds matching script
  ↓
Sends message to background:
  chrome.runtime.sendMessage({
    type: 'EXECUTE_SCRIPT',
    scriptId: 'matched-script-id'
  })
```

---

### 2. Background Receives Message
**File: `background.js` - `handleMessage()` method**

```javascript
// Line 41-47
async handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'EXECUTE_SCRIPT':
      await this.executeScript(message.scriptId, message.parameters);
      sendResponse({ success: true });
      break;
  }
}
```

Console: `📨 Received EXECUTE_SCRIPT message`

---

### 3. Execute Script Method
**File: `background.js` - `executeScript()` method**

```javascript
// Line 197-210
async executeScript(scriptId, parameters = {}) {
  // 1. Get all scripts from storage
  const scripts = await chrome.storage.local.get(['jsonScripts']);

  // 2. Find the specific script by ID
  const script = scripts.jsonScripts.find(s => s.id === scriptId);

  if (!script) {
    throw new Error(`Script not found: ${scriptId}`);
  }

  // 3. Pass to script executor
  await this.scriptExecutor.execute(script, parameters);
}
```

Console: `🔍 Looking up script: ${scriptId}`

---

### 4. Script Executor - Execute Method
**File: `background.js` - `ScriptExecutor.execute()` method**

```javascript
// Line 333-360
async execute(script, parameters = {}) {
  console.log('Executing script:', script.title);
  console.log('Script steps:', script.steps);

  // Extract targetUrl from script JSON
  const targetUrl = script.targetUrl || parameters.targetUrl;

  // CRITICAL: Attach debugger - this finds/creates tab
  const tabId = await this.background.attachDebugger(targetUrl);

  // Now execute all steps
  await this.executeSteps(script.steps, tabId);

  console.log('Script execution completed');
}
```

Console:
```
📝 Executing script: Google Search Example
📋 Script steps: [8 steps array]
```

---

### 5. Attach Debugger - Tab Finding Logic
**File: `background.js` - `attachDebugger()` method**

This is the CRITICAL method that handles tab finding/creation:

```javascript
// Line 84-145
async attachDebugger(tabIdOrUrl) {
  let tabId;

  // CASE 1: Tab ID provided directly
  if (typeof tabIdOrUrl === 'number') {
    console.log(`📍 Using provided tab ID: ${tabIdOrUrl}`);
    tabId = tabIdOrUrl;
  }
  // CASE 2: URL provided - need to find or create tab
  else {
    console.log(`🔍 Searching for tab with URL: ${tabIdOrUrl}`);

    // Try to find existing tab
    tabId = await this.findTabByUrl(tabIdOrUrl);

    // CASE 2A: Tab exists
    if (tabId) {
      console.log(`✅ Found existing tab ${tabId}`);
    }
    // CASE 2B: Tab doesn't exist - CREATE NEW TAB
    else {
      console.log(`❌ Tab not found, creating new tab`);
      console.log(`🌐 Navigating to: ${tabIdOrUrl}`);

      // Create new tab and navigate to URL
      const tab = await chrome.tabs.create({ url: tabIdOrUrl });
      tabId = tab.id;

      console.log(`✨ Created new tab ${tabId}`);
      console.log(`⏳ Waiting for page to load...`);

      // Wait for page to fully load
      await this.waitForTabLoad(tabId);

      console.log(`✅ Page loaded in tab ${tabId}`);
    }
  }

  // Now attach debugger to the tab
  try {
    // Check if already attached (avoid double attachment)
    if (this.attachedTabs.has(tabId)) {
      console.log(`♻️ Debugger already attached to tab ${tabId}`);
      return tabId;
    }

    // Attach debugger
    await chrome.debugger.attach({ tabId }, '1.3');

    // Get tab details for logging
    const tab = await chrome.tabs.get(tabId);

    console.log(`✅ Debugger attached to tab ${tabId}`);
    console.log(`   📄 Tab: "${tab.title}"`);
    console.log(`   🔗 URL: ${tab.url}`);

    // Small delay to ensure debugger is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`🎯 Debugger ready, returning tabId: ${tabId}`);

    return tabId;

  } catch (error) {
    console.error('❌ Error attaching debugger:', error);
    throw error;
  }
}
```

---

### 6. Find Tab By URL
**File: `background.js` - `findTabByUrl()` method**

```javascript
// Line 158-171
async findTabByUrl(urlPattern) {
  // Get ALL open tabs
  const tabs = await chrome.tabs.query({});
  console.log(`   Scanning ${tabs.length} open tabs...`);

  // Check each tab
  for (const tab of tabs) {
    // Match by exact URL or partial URL
    if (tab.url && (tab.url.includes(urlPattern) || tab.url === urlPattern)) {
      console.log(`   ✓ Match found: "${tab.title}" (${tab.url})`);
      return tab.id;
    }
  }

  console.log(`   ✗ No matching tab found for: ${urlPattern}`);
  return null;
}
```

**Matching Logic:**
- **Exact match**: `tab.url === urlPattern` (e.g., "https://google.com" === "https://google.com")
- **Partial match**: `tab.url.includes(urlPattern)` (e.g., "https://google.com/search?q=test" includes "google.com")

---

### 7. Wait For Tab Load
**File: `background.js` - `waitForTabLoad()` method**

```javascript
// Line 173-189
async waitForTabLoad(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkStatus = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // Check if page is loaded
        if (tab.status === 'complete') {
          resolve();
        }
        // Check for timeout
        else if (Date.now() - startTime > timeout) {
          reject(new Error('Tab load timeout'));
        }
        // Keep checking
        else {
          setTimeout(checkStatus, 100);
        }
      });
    };

    checkStatus();
  });
}
```

---

### 8. Execute Steps
**File: `background.js` - `executeSteps()` method**

```javascript
// Line 362-398
async executeSteps(steps, tabId, loopContext = null) {
  console.log(`📋 executeSteps called with ${steps.length} steps for tab ${tabId}`);

  // Loop through each step
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`▶️ Step ${i+1}/${steps.length}: ${step.type}`);

    // Check condition (if any)
    if (step.condition) {
      const conditionMet = await this.evaluateCondition(step.condition, tabId);
      if (!conditionMet) {
        console.log(`⏭️ Skipping step ${i} - condition not met`);
        continue;
      }
    }

    // Execute the step
    await this.executeStep(step, tabId, loopContext);

    // Wait after step (if specified)
    if (step.waitAfter) {
      console.log(`⏸️ Waiting ${step.waitAfter}ms...`);
      await this.wait(step.waitAfter);
    }

    // Handle loops (if specified)
    if (step.loop) {
      await this.executeLoop(step, tabId);
    }
  }

  console.log('✅ All steps completed');
}
```

---

### 9. Execute Individual Step
**File: `background.js` - `executeStep()` method**

```javascript
// Line 400-450
async executeStep(step, tabId, loopContext) {
  console.log(`🔧 Executing step: ${step.type}`, step);

  switch (step.type) {
    case 'setViewport':
      await this.setViewport(step, tabId);
      break;

    case 'navigate':
      await this.navigate(step, tabId);
      break;

    case 'click':
      await this.click(step, tabId);
      break;

    case 'change':
      await this.changeInput(step, tabId);
      break;

    case 'keyDown':
    case 'keyUp':
      await this.keyAction(step, tabId);
      break;

    // ... other step types
  }
}
```

Each step type uses **Chrome DevTools Protocol** commands.

---

## 🎯 Tab Finding/Creation Logic Summary

### Scenario 1: Tab ID Provided
```
attachDebugger(281778268)
  ↓
Use tab ID directly
  ↓
Attach debugger to that tab
```

### Scenario 2: URL Provided - Tab Exists
```
attachDebugger("https://google.com")
  ↓
findTabByUrl("https://google.com")
  ↓
Scan all tabs
  ↓
Found: Tab 281778268 with URL "https://google.com"
  ↓
Attach debugger to tab 281778268
```

### Scenario 3: URL Provided - Tab Does NOT Exist
```
attachDebugger("https://google.com")
  ↓
findTabByUrl("https://google.com")
  ↓
Scan all tabs
  ↓
Not found!
  ↓
chrome.tabs.create({ url: "https://google.com" })
  ↓
New tab created: ID 281778269
  ↓
waitForTabLoad(281778269)
  ↓
Tab status: "loading" → keep checking
  ↓
Tab status: "complete" → proceed
  ↓
Attach debugger to tab 281778269
```

---

## 📝 Console Log Example

When running a script, you'll see:

```
📝 Executing script: Google Search Example
📋 Script steps: [8 steps]

🔍 Searching for tab with URL: https://www.google.com
   Scanning 12 open tabs...
   ✗ No matching tab found for: https://www.google.com

❌ Tab not found, creating new tab and navigating to: https://www.google.com
✨ Created new tab 281778269, waiting for page to load...
✅ Page loaded in tab 281778269

✅ Debugger attached to tab 281778269
   📄 Tab: "Google"
   🔗 URL: https://www.google.com
🎯 Debugger ready, returning tabId: 281778269

🚀 Starting to execute steps, tabId: 281778269, steps count: 8
📋 executeSteps called with: 8 steps for tabId: 281778269

▶️ Step 1/8: setViewport
🔧 Executing step: setViewport
✅ Viewport set: 1280x720

▶️ Step 2/8: navigate
🔧 Executing step: navigate
🌐 Navigating to: https://www.google.com
✅ Navigation complete

▶️ Step 3/8: waitForElement
🔧 Executing step: waitForElement
🔍 Waiting for element: input[name='q']
✅ Element found

... (more steps)

✅ All steps completed
🎉 Script execution completed
```

---

## 🔑 Key Points

1. **Tab Finding Order:**
   - Check if tab ID provided → use it
   - Check if URL pattern provided → search existing tabs
   - If not found → create new tab and navigate
   - If found → reuse existing tab

2. **URL Matching:**
   - Exact match: `tab.url === urlPattern`
   - Partial match: `tab.url.includes(urlPattern)`
   - Example: "google.com" matches "https://www.google.com/search?q=test"

3. **Page Load Wait:**
   - Creates new tab → waits for `tab.status === 'complete'`
   - Timeout: 30 seconds (configurable)
   - Polls every 100ms

4. **Debugger Attachment:**
   - Only one debugger per tab allowed
   - Checks if already attached (reuses connection)
   - Attaches using Chrome DevTools Protocol version 1.3

5. **Error Handling:**
   - Tab creation fails → throws error
   - Page load timeout → throws error
   - Debugger attach fails → throws error
   - All errors logged to console

---

## 🛠️ Troubleshooting with Logs

If script doesn't execute, check console for these indicators:

❌ **"No matching tab found"** → Will create new tab
✅ **"Found existing tab"** → Will reuse tab
⏳ **"Waiting for page to load"** → Tab created, waiting
✅ **"Debugger attached"** → Success!
📋 **"executeSteps called"** → Steps are running
▶️ **"Step X/Y: type"** → Individual step executing
