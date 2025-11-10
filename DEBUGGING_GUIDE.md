# Comprehensive Debugging Guide

This guide will help diagnose why the model isn't responding to commands.

---

## Issue Description

- Model shows as "loaded" in status
- Commands like "hello" are typed but no response appears
- No console logs beyond initial connection messages
- Machine seems unresponsive

---

## Potential Root Causes

### 1. **Model Not Actually Loaded**
- Status check returns cached value
- Worker crashed after loading
- Model still loading but status says loaded

### 2. **Message Flow Breaking**
- Port communication failure
- Background script not relaying
- Offscreen document not receiving
- Worker not processing

### 3. **JavaScript Errors**
- Silent error in sendCommand()
- Error in processNLPCommand()
- Promise hanging without rejection

### 4. **Model Crashing**
- Out of memory
- GPU context lost
- Worker thread crashed

### 5. **Console Not Showing Logs**
- Looking at wrong console (popup vs offscreen vs background)
- Console cleared
- Logs filtered

---

## Step-by-Step Diagnostic

### Step 1: Check ALL Three Consoles

You MUST open all three console windows to see the complete picture:

#### A. Popup Console
```
1. Right-click the popup window
2. Select "Inspect"
3. Go to Console tab
```

**Expected logs when typing "hello":**
```
🚀 [Popup] sendCommand() called
📝 [Popup] Command: hello
🔒 [Popup] isProcessing: false
👤 [Popup] User message added to UI
⏳ [Popup] Processing state set to true
🔍 [Popup] Checking for special commands...
🔍 [Popup] Is special command: false
🤖 [Popup] Processing NLP command...
🧠 [Popup] processNLPCommand() START - command: hello
💬 [Popup] Added "Processing..." message to UI
📂 [Popup] Getting stored scripts...
📂 [Popup] Retrieved scripts: 0 scripts
🔍 [Popup] Checking AI model availability...
   modelLoaded: true
   aiWorkerPort: true
✅ [Popup] AI model available, sending to worker...
📤 [Popup] Calling sendWorkerMessage...
📨 [Popup] sendWorkerMessage() START
   Type: PROCESS_COMMAND
   Data keys: command, scripts, options
   Port connected: true
🆔 [Popup] Generated requestId: 1
💾 [Popup] Stored pending request: 1
📊 [Popup] Total pending requests: 1
📤 [Popup] Sending message through port...
✅ [Popup] Message sent successfully to port
```

**If you DON'T see these logs → Problem is in popup.js**

#### B. Background Console
```
1. Go to chrome://extensions/
2. Find "Choreograph"
3. Click "Inspect views: service worker"
4. Go to Console tab
```

**Expected logs:**
```
🔌 [Background] AI worker port connected from popup
🔄 [Background] Received PROCESS_COMMAND from popup, requestId: 1
📤 [Background] Forwarding to offscreen...
📥 [Background] Received response from offscreen: COMMAND_RESULT requestId: 1
📤 [Background] Forwarding response back to popup
```

**If you DON'T see "Received PROCESS_COMMAND" → Port connection broken**

#### C. Offscreen Console (MOST IMPORTANT!)
```
1. Go to chrome://extensions/
2. Find "Choreograph"
3. Click "Inspect views: offscreen.html"
4. Go to Console tab
```

**Expected logs:**
```
🚀 [Offscreen] Initializing offscreen document...
🔧 [Offscreen] Creating AI Worker...
✅ [Offscreen] AI Worker created
📥 [Offscreen] Auto-loading Granite 4.0 model...
[... model loading logs ...]
✅ [Offscreen] Model loaded successfully on webgpu
🔌 [Offscreen] Port connected: offscreen-relay
📥 [Offscreen] Port message: PROCESS_COMMAND, requestId: 1
🚀 [Offscreen] Processing command: "hello" (requestId: 1)
🔀 [Offscreen] Mapped requestId 1 → workerMsgId 1
📨 [Offscreen] Worker message: COMMAND_RESULT 1
📤 [Offscreen] Forwarding response to popup. RequestId: 1, Type: COMMAND_RESULT, HasData: true
📦 [Offscreen] Response data: {matched: true, intent_category: "CONVERSATIONAL", ...}
```

**If you DON'T see "Model loaded successfully" → Model never loaded!**

---

## Diagnostic Scenarios

### Scenario A: No Logs in Popup Console

**Symptoms:**
- Type "hello" and press send
- No logs appear at all
- Message doesn't appear in chat

**Diagnosis:**
- sendCommand() is not being called
- Button click handler not attached
- Input disabled

**Actions:**
1. Check if input field is enabled (not grayed out)
2. Check if send button is clickable
3. Open popup console BEFORE typing command
4. Try refreshing the extension
5. Check for JavaScript errors at the top of console

---

### Scenario B: Logs Stop at "Calling sendWorkerMessage"

**Symptoms:**
```
📤 [Popup] Calling sendWorkerMessage...
📨 [Popup] sendWorkerMessage() START
   Port connected: false  ← PROBLEM!
❌ [Popup] Worker port not connected!
```

**Diagnosis:**
- aiWorkerPort is null or undefined
- Port connection failed during initialization
- Port disconnected after initialization

**Actions:**
1. Check background console for port connection logs
2. Reload extension completely
3. Check if port disconnected (look for "Port disconnected" warning)
4. Restart Chrome (port system might be in bad state)

---

### Scenario B2: Message Sent But Never Resolves

**Symptoms:**
```
✅ [Popup] Message sent successfully to port
[... nothing more ...]
[After 5 minutes: ⏰ [Popup] Worker message TIMEOUT]
```

**Diagnosis:**
- Background not receiving message
- Offscreen not receiving message
- Response not coming back

**Actions:**
1. **CHECK BACKGROUND CONSOLE** - Do you see "Received PROCESS_COMMAND"?
   - NO → Port relay broken between popup and background
   - YES → Go to next check

2. **CHECK OFFSCREEN CONSOLE** - Do you see "Port message: PROCESS_COMMAND"?
   - NO → Port relay broken between background and offscreen
   - YES → Go to next check

3. **CHECK OFFSCREEN CONSOLE** - Do you see "Worker message: COMMAND_RESULT"?
   - NO → Worker never responded (crashed or stuck)
   - YES → Check if response is being forwarded back

---

### Scenario C: Model Never Loaded

**Symptoms:**
- Offscreen console shows:
```
🚀 [Offscreen] Initializing offscreen document...
🔧 [Offscreen] Creating AI Worker...
✅ [Offscreen] AI Worker created
📥 [Offscreen] Auto-loading Granite 4.0 model...
[... then nothing or errors ...]
```

**Diagnosis:**
- Worker crashed during model load
- Out of memory
- Model files not found
- WebGPU not available

**Actions:**
1. Check for error messages in offscreen console
2. Check chrome://gpu/ - is WebGPU available?
3. Check available RAM (model needs ~4GB)
4. Look for ONNX Runtime errors
5. Check Network tab for failed model downloads

---

### Scenario D: Model Loaded But Worker Crashed

**Symptoms:**
- Offscreen console shows model loaded successfully
- But subsequent commands get no response
- No worker logs after "Processing command"

**Diagnosis:**
- Worker thread crashed during processing
- Model inference crashed
- JavaScript error in worker

**Actions:**
1. Check offscreen console for uncaught errors
2. Look for WebGPU errors
3. Check if worker error listener fired:
   ```
   ❌ [Offscreen] AI Worker error: ...
   ```
4. Reload extension to restart worker

---

### Scenario E: Response Lost on Return Path

**Symptoms:**
- Offscreen shows successful response:
  ```
  📤 [Offscreen] Forwarding response to popup. RequestId: 1, Type: COMMAND_RESULT, HasData: true
  ```
- Background shows received response:
  ```
  📥 [Background] Received response from offscreen: COMMAND_RESULT requestId: 1
  📤 [Background] Forwarding response back to popup
  ```
- But popup never receives it

**Diagnosis:**
- Port to popup closed/disconnected
- Response format incorrect
- handleWorkerMessage not called

**Actions:**
1. Check popup console for "handleWorkerMessage() called"
2. If missing, port was disconnected
3. Check for port disconnect warnings
4. Verify requestId matches in all logs

---

## Common Issues and Solutions

### Issue 1: "Model already loaded" But Actually Not

**Cause:**
- checkOffscreenModelStatus returns stale value
- modelLoaded flag set to true incorrectly

**Solution:**
1. Open offscreen console
2. Look for "✅ [Offscreen] Model loaded successfully"
3. If missing, model is NOT actually loaded
4. Reload extension to force fresh load

---

### Issue 2: Worker Crashes Silently

**Cause:**
- JavaScript error in worker
- Model inference error
- Out of memory

**Solution:**
1. Check offscreen console for errors
2. Look for memory warnings in Chrome Task Manager
3. Restart Chrome to free memory
4. Check if other tabs using lots of GPU

---

### Issue 3: Port Communication Broken

**Cause:**
- Background service worker restarted
- Port connections not re-established
- Chrome extension system in bad state

**Solution:**
1. Reload extension: chrome://extensions/ → Click reload icon
2. Close and reopen popup
3. Restart Chrome if needed

---

### Issue 4: Console Not Showing Logs

**Cause:**
- Looking at wrong console
- Console filters enabled
- Logs cleared

**Solution:**
1. Verify you have ALL THREE consoles open:
   - Popup (right-click popup → Inspect)
   - Background (chrome://extensions/ → service worker)
   - Offscreen (chrome://extensions/ → offscreen.html)
2. Check console filter (should show "All levels")
3. Disable "Selected context only" filter
4. Clear console and try again

---

## Expected Complete Log Flow

When you type "hello" and everything works correctly, you should see this across all three consoles:

### POPUP CONSOLE:
```
🚀 [Popup] sendCommand() called
📝 [Popup] Command: hello
🔒 [Popup] isProcessing: false
👤 [Popup] User message added to UI
⏳ [Popup] Processing state set to true
🔍 [Popup] Checking for special commands...
🔍 [Popup] Is special command: false
🤖 [Popup] Processing NLP command...
🧠 [Popup] processNLPCommand() START - command: hello
💬 [Popup] Added "Processing..." message to UI
📂 [Popup] Getting stored scripts...
📂 [Popup] Retrieved scripts: 0 scripts
🔍 [Popup] Checking AI model availability...
   modelLoaded: true
   aiWorkerPort: true
✅ [Popup] AI model available, sending to worker...
📤 [Popup] Calling sendWorkerMessage...
📨 [Popup] sendWorkerMessage() START
   Type: PROCESS_COMMAND
   Data keys: ["command", "scripts", "options"]
   Port connected: true
🆔 [Popup] Generated requestId: 1
💾 [Popup] Stored pending request: 1
📊 [Popup] Total pending requests: 1
📤 [Popup] Sending message through port...
✅ [Popup] Message sent successfully to port
📬 [Popup] handleWorkerMessage() called
   Message: {requestId: 1, type: "COMMAND_RESULT", data: {...}}
🆔 [Popup] Message ID: 1 Type: COMMAND_RESULT
🔍 [Popup] Checking pending requests for msgId: 1
📊 [Popup] Pending requests: [1]
✅ [Popup] Found pending request for msgId: 1
✅ [Popup] Resolving with data
🔍 [Popup] Received response from worker: {type: "COMMAND_RESULT", data: {...}}
✅ [Popup] Result data: {matched: true, intent_category: "CONVERSATIONAL", response: "Hello! I'm Choreograph AI..."}
🎯 [Popup] Handling intent result...
📊 Intent: CONVERSATIONAL {...}
✅ [Popup] Intent result handled
🧠 [Popup] processNLPCommand() END
✅ [Popup] NLP command processing complete
🏁 [Popup] Finally block - setting processing to false
```

### BACKGROUND CONSOLE:
```
🔌 [Background] AI worker port connected from popup
🔄 [Background] Received PROCESS_COMMAND from popup, requestId: 1
📤 [Background] Forwarding to offscreen...
📥 [Background] Received response from offscreen: COMMAND_RESULT requestId: 1
📤 [Background] Forwarding response back to popup
```

### OFFSCREEN CONSOLE:
```
🔌 [Offscreen] Port connected: offscreen-relay
📥 [Offscreen] Port message: PROCESS_COMMAND, requestId: 1
🚀 [Offscreen] Processing command: "hello" (requestId: 1)
🔀 [Offscreen] Mapped requestId 1 → workerMsgId 1
🤖 [AI Worker] Processing command: hello
📊 [AI Worker] Intent classification: CONVERSATIONAL
📨 [Offscreen] Worker message: COMMAND_RESULT 1
📤 [Offscreen] Forwarding response to popup. RequestId: 1, Type: COMMAND_RESULT, HasData: true
📦 [Offscreen] Response data: {matched: true, intent_category: "CONVERSATIONAL", response: "Hello! I'm Choreograph AI. How can I help you today?", classification: {...}}
```

---

## Quick Diagnostic Checklist

Open all three consoles side-by-side, type "hello", and check:

- [ ] Popup console shows "sendCommand() called"
- [ ] Popup console shows "Message sent successfully to port"
- [ ] Background console shows "Received PROCESS_COMMAND from popup"
- [ ] Background console shows "Forwarding to offscreen"
- [ ] Offscreen console shows "Port message: PROCESS_COMMAND"
- [ ] Offscreen console shows "Processing command: hello"
- [ ] Offscreen console shows "Worker message: COMMAND_RESULT"
- [ ] Offscreen console shows "Forwarding response to popup"
- [ ] Background console shows "Received response from offscreen"
- [ ] Background console shows "Forwarding response back to popup"
- [ ] Popup console shows "handleWorkerMessage() called"
- [ ] Popup console shows "Found pending request"
- [ ] Popup console shows "Result data"
- [ ] UI shows response: 💬 "Hello! I'm Choreograph AI..."

**Find the FIRST checkbox that is unchecked - that's where it's breaking!**

---

## Actions to Take

### If Logs Stop in Popup Console:
1. Check for JavaScript errors
2. Reload extension
3. Restart Chrome

### If Background Console Shows No Logs:
1. Port connection broken
2. Reload extension
3. Check if background service worker is active

### If Offscreen Console Shows No Logs:
1. Offscreen document not receiving messages
2. Check if offscreen.html is loaded (should see in chrome://extensions/)
3. Reload extension

### If Offscreen Shows "Processing" But No "Worker message":
1. Worker crashed or stuck
2. Model inference failed
3. Check for errors in offscreen console
4. Reload extension to restart worker

### If Response Not Reaching Popup:
1. Port disconnected
2. RequestId mismatch
3. Check all console logs for the requestId
4. Reload extension

---

## Critical File Locations for Debugging

- **popup.js** (lines 243-290): sendCommand() and error handling
- **popup.js** (lines 487-551): processNLPCommand() - main flow
- **popup.js** (lines 147-185): sendWorkerMessage() - port communication
- **popup.js** (lines 187-241): handleWorkerMessage() - response handling
- **background.js** (lines 98-126): handlePortConnection() - relay logic
- **offscreen-manager.js** (lines 129-168): Port message handling
- **offscreen-manager.js** (lines 59-103): Worker message handling
- **ai-worker-source.js** (lines 130-153): handleProcessCommand() - worker processing

---

## Emergency Reset

If nothing works:

```bash
# 1. Kill Chrome completely
killall chrome

# 2. Clear extension state
rm -rf ~/.config/google-chrome/Default/Extensions/[extension-id]

# 3. Rebuild
cd choreograph
npm run build

# 4. Restart Chrome
# 5. Load extension fresh
# 6. Open all three consoles BEFORE testing
# 7. Type "hello" and watch logs
```

---

## Report Findings

When reporting the issue, include:

1. **Which logs appear** in each console
2. **First missing log** - where does it stop?
3. **Any error messages** - full text
4. **Chrome version** - Help → About Google Chrome
5. **System RAM** - How much is available?
6. **GPU status** - Visit chrome://gpu/ - is WebGPU enabled?

This will help pinpoint the exact failure point!
