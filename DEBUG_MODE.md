# Debug Mode - Step-by-Step Delay

## 🐛 Purpose

When a script crashes Chrome, debug mode adds a configurable delay between each step so you can:
1. **See which step is executing** before the crash
2. **Identify the problematic step** that causes the crash
3. **Watch the automation** in slow motion

## 🔧 How to Enable

### Step 1: Open Settings
1. Click DeskAgent extension icon
2. Click the ⚙️ (settings/gear) icon
3. Or right-click extension → Options

### Step 2: Enable Debug Mode
1. Go to **Settings** tab
2. Find **"🐛 Debug Mode - Step Delay"** section
3. Check ✅ **"Enable Debug Delay"**
4. Set delay in seconds (default: 5 seconds)
5. Click **"Save Settings"**

### Step 3: Run Your Script
1. Go back to JSON Scripts tab
2. Click "Execute" on your script
3. Watch the background console

## 📊 What You'll See

With debug mode enabled, the console will show:

```
🐛 DEBUG MODE: 5s delay between steps

▶️ Step 1/8: setViewport
🔧 Executing: setViewport
✅ Completed: setViewport

⏸️ Debug delay: waiting 5s before executing...
[5 second pause]

▶️ Step 2/8: navigate
🔧 Executing: navigate
✅ Completed: navigate

⏸️ Debug delay: waiting 5s before executing...
[5 second pause]

▶️ Step 3/8: waitForElement
🔧 Executing: waitForElement
[CRASH HAPPENS HERE]
```

Now you know **Step 3 (waitForElement)** is causing the crash!

## 🎯 Recommended Settings

### For Debugging Crashes:
- **Delay**: 5-10 seconds
- **Purpose**: See each step clearly before crash

### For Watching Automation:
- **Delay**: 2-3 seconds
- **Purpose**: Follow along with what's happening

### For Production:
- **Delay**: Disabled (uncheck the box)
- **Purpose**: Run at full speed

## 📝 Console Log Format

### Without Debug Mode:
```
▶️ Step 1/8: setViewport
🔧 Executing: setViewport
✅ Completed: setViewport
▶️ Step 2/8: navigate
🔧 Executing: navigate
✅ Completed: navigate
```
(Runs fast, hard to see crashes)

### With Debug Mode (5s):
```
🐛 DEBUG MODE: 5s delay between steps

▶️ Step 1/8: setViewport
🔧 Executing: setViewport
✅ Completed: setViewport

⏸️ Debug delay: waiting 5s before executing...
[Browser pauses for 5 seconds]

▶️ Step 2/8: navigate
🔧 Executing: navigate
✅ Completed: navigate

⏸️ Debug delay: waiting 5s before executing...
[Browser pauses for 5 seconds]
```
(Runs slow, easy to see which step crashes)

## 🔍 Debugging Chrome Crashes

### Common Crash Causes:

1. **setViewport** - Device metrics override might crash
   - Try: Remove setViewport step
   - Or: Use standard sizes (1920x1080)

2. **navigate** - Too many navigations too fast
   - Try: Add waitAfter delays
   - Or: Reduce navigation frequency

3. **click** - Element not ready or invalid
   - Try: Add waitForElement before click
   - Or: Check selectors are correct

4. **DOM operations** - Too many queries
   - Try: Increase delays between steps
   - Or: Simplify selectors

### Example: Finding Crash Point

**Original script crashes:**
```json
{
  "steps": [
    {"type": "setViewport", "width": 1280, "height": 720},
    {"type": "navigate", "url": "https://google.com"},
    {"type": "click", "selectors": [["#button"]]}
  ]
}
```

**Enable debug mode (5s delay), run script:**
```
▶️ Step 1/8: setViewport
🔧 Executing: setViewport
✅ Completed: setViewport

⏸️ Debug delay: waiting 5s...

▶️ Step 2/8: navigate
🔧 Executing: navigate
[CRASH!]
```

**Result**: Navigate step causes crash!

**Fix**: The navigate step might be using Chrome Debugger Protocol which we disabled. Let's check the step implementation.

## 💡 Tips

1. **Start with 5 seconds** - Good balance between speed and visibility
2. **Watch the browser tab** - See what's happening visually
3. **Check console** - Last completed step before crash
4. **Reduce delay gradually** - Once you find the issue
5. **Disable for production** - No delays in final scripts

## 🚫 Disable Debug Mode

1. Go to Settings
2. Uncheck ✅ "Enable Debug Delay"
3. Click "Save Settings"
4. Scripts now run at full speed

## 📋 Quick Checklist

- [ ] Open extension settings
- [ ] Enable debug delay checkbox
- [ ] Set delay (5 seconds recommended)
- [ ] Save settings
- [ ] Run script
- [ ] Open background service worker console (`chrome://extensions/` → Service worker)
- [ ] Watch for last completed step before crash
- [ ] Note which step caused the issue
- [ ] Fix or remove that step
- [ ] Disable debug mode when done

## Example Output

When crash happens at step 3:

```
🔍 Searching for tab with URL: https://www.google.com
   Scanning 12 open tabs...
   ✗ No matching tab found for: https://www.google.com
❌ Tab not found, creating new tab
✨ Created new tab 123456789
✅ Page loaded in tab 123456789
✅ Debugger attached to tab 123456789
   📄 Tab: "Google"
   🔗 URL: https://www.google.com
🎯 Debugger ready, returning tabId: 123456789

🐛 DEBUG MODE: 5s delay between steps

▶️ Step 1/8: setViewport
🔧 Executing: setViewport
✅ Completed: setViewport

⏸️ Debug delay: waiting 5s before executing...

▶️ Step 2/8: navigate
🔧 Executing: navigate
✅ Completed: navigate

⏸️ Debug delay: waiting 5s before executing...

▶️ Step 3/8: waitForElement
🔧 Executing: waitForElement
[Chrome crashes here - you see this is the problem!]
```

Now you know: **waitForElement on step 3 crashes Chrome**

Fix: Check the selector or add a different wait mechanism.
