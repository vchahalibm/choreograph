# The Real Problem and Fix

## 🐛 What Was Actually Broken

### The Issue
The offscreen-manager was catching **ALL** port connections indiscriminately:

```javascript
// offscreen-manager.js (BROKEN)
chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name);
  // Processes ANY connection! ❌
  port.onMessage.addListener((message) => {
    // Handle PROCESS_COMMAND...
  });
});
```

This caught:
1. **'ai-worker-port'** - Popup → Background (should NOT reach offscreen!)
2. **'offscreen-relay'** - Background → Offscreen (correct)

### The Result
Every command was processed **TWICE**:

```
User types "hello"
  ↓
Popup → Background (ai-worker-port)
  ↓
Offscreen sees it ❌ (shouldn't!)
  → Processes command (workerMsgId 6)
  ↓
Background → Offscreen (offscreen-relay)
  ↓
Offscreen sees it again ✅
  → Processes command AGAIN (workerMsgId 7)
  ↓
Two responses generated
Port confusion
❌ Error: Attempting to use a disconnected port object
❌ No response reaches user
```

---

## ✅ The Fix

Added port name filtering:

```javascript
// offscreen-manager.js (FIXED)
chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connection attempt:', port.name);

  // ONLY handle offscreen-relay connections
  if (port.name !== 'offscreen-relay') {
    console.log('Ignoring port:', port.name);
    return; // ✅ Reject non-offscreen ports
  }

  console.log('Accepted offscreen-relay connection');
  port.onMessage.addListener((message) => {
    // Handle PROCESS_COMMAND...
  });
});
```

Now offscreen ONLY processes messages from background, not from popup.

---

## 🧪 How to Test

### 1. Pull Latest Code
```bash
cd /path/to/choreograph
git pull origin claude/update-granite-model-011CUs77jZMCEq5GdBKmC5HN
npm run build
```

### 2. Reload Extension
```
1. Open chrome://extensions/
2. Find "Choreograph"
3. Click reload icon (⟳)
```

### 3. Open ALL THREE Consoles

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

### 4. Test Command: "hello"

Type "hello" in the popup and press Send.

---

## 📊 What You Should See

### Offscreen Console (IMPORTANT!)
```
🔌 [Offscreen] Port connection attempt: ai-worker-port
⚠️ [Offscreen] Ignoring port connection: ai-worker-port (not offscreen-relay)
🔌 [Offscreen] Port connection attempt: offscreen-relay
✅ [Offscreen] Accepted offscreen-relay connection
📥 [Offscreen] Port message: PROCESS_COMMAND, requestId: 1
🚀 [Offscreen] Processing command: "hello" (requestId: 1)
🔀 [Offscreen] Mapped requestId 1 → workerMsgId 1  ← ONLY ONE!
📊 [AI Worker] Intent classification: CONVERSATIONAL
📨 [Offscreen] Worker message: COMMAND_RESULT 1
📤 [Offscreen] Forwarding response to popup. RequestId: 1, Type: COMMAND_RESULT, HasData: true
📦 [Offscreen] Response data: {matched: true, intent_category: 'CONVERSATIONAL', response: "Hello! I'm Choreograph AI. How can I help you today?"}
```

**Key changes:**
- ✅ Sees ai-worker-port but **IGNORES** it
- ✅ Accepts offscreen-relay connection
- ✅ Processes command **ONCE** (workerMsgId 1, not 6 and 7!)
- ✅ No "disconnected port" error
- ✅ Response data is correct

### Background Console
```
🔌 [Background] AI worker port connected from popup
🔄 [Background] Received PROCESS_COMMAND from popup, requestId: 1
💾 [Background] Stored popup port mapping for requestId: 1
📤 [Background] Forwarding to offscreen via persistent port...
📥 [Background] Received from offscreen: COMMAND_RESULT requestId: 1
📤 [Background] Forwarding response to popup
```

**Key indicators:**
- ✅ Receives from popup
- ✅ Stores mapping
- ✅ Forwards to offscreen
- ✅ Receives response
- ✅ Forwards to popup

### Popup Console
```
🚀 [Popup] sendCommand() called
📝 [Popup] Command: hello
✅ [Popup] AI model available, sending to worker...
📨 [Popup] sendWorkerMessage() START
✅ [Popup] Message sent successfully to port
📬 [Popup] handleWorkerMessage() called
✅ [Popup] Found pending request for msgId: 1
✅ [Popup] Result data: {intent_category: "CONVERSATIONAL", response: "..."}
🎯 [Popup] Handling intent result...
```

**Key indicators:**
- ✅ Message sent
- ✅ Response received
- ✅ Request matched
- ✅ Result processed

### Popup UI
Should display:
```
hello
👤

💬 Hello! I'm Choreograph AI. How can I help you today?
🤖
```

---

## ✅ Success Criteria

**Before (Broken):**
- ❌ Command processed twice (workerMsgId 6 and 7)
- ❌ "Attempting to use a disconnected port object"
- ❌ No response in UI
- ❌ Just shows "Processing your command..." forever

**After (Fixed):**
- ✅ Command processed once (workerMsgId 1)
- ✅ No port errors
- ✅ Response appears in UI
- ✅ Shows: 💬 "Hello! I'm Choreograph AI..."

---

## 🧪 Additional Tests

Try these commands to verify all intent types work:

### Test 1: Conversational
```
Input: hello
Expected: 💬 "Hello! I'm Choreograph AI. How can I help you today?"
```

### Test 2: Meta
```
Input: what can you do
Expected: ℹ️ "I'm Choreograph AI! I can help you with:
🤖 Browser Automation...
📊 Data Extraction...
💬 Questions...
⚙️ Configuration..."
```

### Test 3: Informational
```
Input: what is machine learning
Expected: 💡 "Machine learning is a subset of artificial intelligence..."
```

### Test 4: Help
```
Input: help
Expected: ℹ️ Help text with commands
```

---

## 🔍 Debugging Tips

### If Still No Response:

**1. Check Offscreen Console First**
- Do you see "Ignoring port connection: ai-worker-port"? ✅ Good
- Do you see "Accepted offscreen-relay connection"? ✅ Good
- Do you see workerMsgId appearing ONCE? ✅ Good
- Do you see "Forwarding response to popup"? ✅ Good

**2. If offscreen processes twice:**
- The fix didn't apply - rebuild and reload

**3. If still get port errors:**
- Clear Chrome extension cache
- Restart Chrome
- Reload extension

**4. If response generated but not displayed:**
- Check popup console for "handleWorkerMessage() called"
- Check background console for "Forwarding response to popup"
- Verify requestId matches across all consoles

---

## 📝 Summary

**Root Cause:** Offscreen catching all ports → duplicate processing → wrong port references → no response

**Fix:** Filter ports by name → only process offscreen-relay → single processing → correct ports → responses work!

**Test:** Pull → Build → Reload → Type "hello" → See response! ✅

The fix is simple but critical - offscreen now only handles connections meant for it, eliminating the duplicate processing and port confusion that prevented responses from reaching the user.
