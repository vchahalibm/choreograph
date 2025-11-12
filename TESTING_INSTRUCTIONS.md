# Testing Instructions - sendMessage Architecture

## 🎯 Current Solution

The extension now uses **chrome.runtime.sendMessage** for all communication between popup, background, and offscreen contexts. This replaced the unreliable port-based architecture that caused disconnection errors.

---

## 📋 What Changed

### Previous Issues (Port-Based Architecture)
- ❌ Port disconnections during async AI processing
- ❌ Duplicate command processing
- ❌ Complex state management with port mappings
- ❌ "Attempting to use a disconnected port object" errors
- ❌ Responses generated but never delivered to UI

### Current Solution (sendMessage Architecture)
- ✅ Built-in request-response pattern
- ✅ No port lifecycle management needed
- ✅ Automatic async handling
- ✅ No state tracking required
- ✅ Reliable message delivery

---

## 🧪 How to Test

### 1. Pull Latest Code
```bash
cd /home/user/choreograph
git pull origin claude/update-granite-model-011CUs77jZMCEq5GdBKmC5HN
npm run build
```

### 2. Reload Extension
```
1. Open chrome://extensions/
2. Find "Choreograph"
3. Click reload icon (⟳)
```

### 3. Open Developer Consoles

**A. Popup Console**
```
Right-click popup → Inspect → Console tab
```

**B. Background Console**
```
chrome://extensions/ → Choreograph → "Inspect views: service worker"
```

**C. Offscreen Console**
```
chrome://extensions/ → Choreograph → "Inspect views: offscreen.html"
```

### 4. Test Commands

Type these commands in the popup and verify responses appear:

#### Test 1: Conversational
```
Input: hello
Expected: 💬 "Hello! I'm Choreograph AI. How can I help you today?"
```

#### Test 2: Meta
```
Input: what can you do
Expected: ℹ️ Capabilities list with browser automation, data extraction, etc.
```

#### Test 3: Informational
```
Input: what is machine learning
Expected: 💡 "Machine learning is a subset of artificial intelligence..."
```

#### Test 4: Help
```
Input: help
Expected: ℹ️ Help text with available commands
```

---

## 📊 What You Should See in Consoles

### Popup Console
```
🚀 [Popup] sendCommand() called
📝 [Popup] Command: hello
✅ [Popup] AI model available, sending to worker...
📨 [Popup] Sending via chrome.runtime.sendMessage
📬 [Popup] Received response via sendMessage
✅ [Popup] Result data: {intent_category: "CONVERSATIONAL", response: "..."}
🎯 [Popup] Handling intent result...
```

**Key indicators:**
- ✅ "Sending via chrome.runtime.sendMessage" (not ports!)
- ✅ "Received response via sendMessage"
- ✅ Response processed and displayed

### Background Console
```
🔄 [Background] Received PROCESS_COMMAND from popup
📤 [Background] Forwarding to offscreen via sendMessage
📥 [Background] Received response from offscreen
📤 [Background] Sending response back to popup
```

**Key indicators:**
- ✅ No port connection messages
- ✅ No port mapping messages
- ✅ Simple message forwarding

### Offscreen Console
```
📬 [Offscreen] Received message: PROCESS_COMMAND
📥 [Offscreen] Received PROCESS_COMMAND via sendMessage
🚀 [Offscreen] Processing command: "hello"
🔀 [Offscreen] Mapped workerMsgId 1
📊 [AI Worker] Intent classification: CONVERSATIONAL
📨 [Offscreen] Worker message: COMMAND_RESULT 1
📤 [Offscreen] Forwarding response via sendResponse
📦 [Offscreen] Response data: {matched: true, intent_category: 'CONVERSATIONAL', response: "Hello! I'm Choreograph AI..."}
```

**Key indicators:**
- ✅ "Received PROCESS_COMMAND via sendMessage" (not port!)
- ✅ Command processed once (not duplicated)
- ✅ "Forwarding response via sendResponse"
- ✅ No port disconnection errors

---

## ✅ Success Criteria

### Before (Port Architecture - Broken)
- ❌ Command processed twice
- ❌ "Attempting to use a disconnected port object" errors
- ❌ Port connection/disconnection cycles in logs
- ❌ No response in UI - just "Processing your command..." forever
- ❌ Complex port mapping code

### After (sendMessage Architecture - Fixed)
- ✅ Command processed once
- ✅ No port-related errors at all
- ✅ No port messages in logs
- ✅ Response appears in UI immediately
- ✅ Simple, clean code (~200 lines removed)

---

## 🔍 Message Flow

### Simple Request-Response Pattern

```
User types "hello"
    ↓
Popup.sendCommand()
    ↓
chrome.runtime.sendMessage({type: 'PROCESS_COMMAND', data: {command: 'hello'}})
    ↓
Background receives message
    ↓
chrome.runtime.sendMessage({type: 'PROCESS_COMMAND', data: {command: 'hello'}}) → Offscreen
    ↓
Offscreen receives message
    ↓
Forward to AI Worker
    ↓
Worker processes (intent classification + response generation)
    ↓
Worker sends result back to Offscreen
    ↓
Offscreen calls sendResponse(result) → Background
    ↓
Background receives response
    ↓
Background calls sendResponse(result) → Popup
    ↓
Popup receives response
    ↓
Display in UI: 💬 "Hello! I'm Choreograph AI. How can I help you today?"
```

**No ports, no mappings, no disconnections - just clean async messaging!**

---

## 🐛 If You See Issues

### No response displayed
1. Check all three consoles are open
2. Verify you see "Received PROCESS_COMMAND via sendMessage" in offscreen console
3. Verify you see "Received response via sendMessage" in popup console
4. Check for JavaScript errors

### Model not loaded
```
Offscreen console should show:
✅ [Offscreen] Model loaded successfully on webgpu
```

If not, wait 30-60 seconds for initial model load, or reload the extension.

### Port-related errors
If you see ANY messages about ports or "disconnected port object":
- The code didn't update properly
- Run `npm run build` again
- Hard reload extension (remove and re-add)
- Clear Chrome's extension cache

---

## 📝 Technical Details

### Architecture Comparison

**Old (Ports):**
- Popup creates port → Background
- Background creates port → Offscreen
- Offscreen stores port reference
- Worker processes (async)
- Port disconnects during processing ❌
- Response can't be sent back ❌

**New (sendMessage):**
- Popup sends message → Background
- Background sends message → Offscreen
- Offscreen processes → Worker
- Worker responds
- Offscreen calls sendResponse()
- Response automatically routes back ✅

### Code Simplification

**Removed:**
- `aiWorkerPort` variable
- `workerMessageId` counter (in popup)
- `pendingWorkerMessages` Map (in popup)
- `offscreenPort` variable
- `offscreenPortReady` flag
- `popupPortMappings` Map
- `connectToOffscreen()` method (~50 lines)
- `handlePortConnection()` method (~50 lines)
- Port connection listeners
- Port disconnect handlers
- Port mapping logic

**Added:**
- Simple `chrome.runtime.sendMessage()` calls
- `sendResponse()` callbacks

**Net change:** ~200 lines of complex port management code → ~20 lines of simple sendMessage calls

---

## 🎉 Expected Outcome

When you test with "hello", you should see:

**In UI:**
```
hello
👤

💬 Hello! I'm Choreograph AI. How can I help you today?
🤖
```

**In Consoles:**
- ✅ No errors
- ✅ No port messages
- ✅ Clean message flow with sendMessage/sendResponse
- ✅ Response delivered successfully

**If you see this, the fix is working correctly!**

---

## 📚 Historical Context

Previous attempts to fix the communication issues:
1. **Port filtering fix** - Only accept specific port names to prevent duplicate processing
2. **Persistent port architecture** - Maintain long-lived port connections
3. **Final solution (current)** - Replace ports entirely with sendMessage

The sendMessage approach is the correct architecture for request-response patterns like AI command processing. Ports are designed for streaming data, not async request-response.

See `PORT_DISCONNECTION_FIX.md` for details on the intermediate solutions that led to this final architecture.
