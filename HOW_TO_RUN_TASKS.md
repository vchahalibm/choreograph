# How to Run Tasks from Chat Popup

## Method 1: Using Quick Action Button (Easiest)

1. **Open the DeskAgent popup** (click the extension icon)
2. **Click the "🎯 Tasks" button** at the top
3. You'll see a list of all your saved tasks
4. **Click "Execute" button** next to any task to run it

## Method 2: Using Natural Language Commands

Open the popup and type any of these commands:

### Show All Tasks
```
show available tasks
```
or
```
list tasks
```
or
```
show tasks
```

This displays all your tasks with Execute buttons.

### Execute Specific Task (Coming Soon)
In the future, you'll be able to type:
```
run task "Task Name"
```
or
```
execute "Task Name" task
```

## Current Task Execution Flow

```
┌─────────────────────────────────────────┐
│  1. Open Popup                          │
│     Click extension icon                │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  2. Click "🎯 Tasks" Button             │
│     (Top quick action bar)              │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  3. View Task List                      │
│     • Task 1 [Execute]                  │
│     • Task 2 [Execute]                  │
│     • Task 3 [Execute]                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  4. Click "Execute" Button              │
│     Task starts running!                │
└─────────────────────────────────────────┘
```

## What You'll See

### Before Execution:
```
You: show available tasks

Agent: Available Tasks:

1. WhatsApp to Google Search
   2 steps
   [Execute]

2. Web Scraping Flow
   3 steps
   [Execute]
```

### During Execution:
```
System: Executing task...

Agent: ✅ Task execution started successfully!
```

### Check Console for Details:
Open DevTools (F12) → Console to see:
```
🎯 Starting task execution: task_123...
📋 Task: WhatsApp to Google Search
📊 Steps: 2

▶️  Step 1/2
   📄 Script: WhatsApp Read Messages
   📥 Parameters: {...}
   ✅ Step completed

▶️  Step 2/2
   📄 Script: Google Search
   📥 Parameters: {...}
   ✅ Step completed

✅ Task completed: WhatsApp to Google Search
```

## Creating Tasks First

Before you can run tasks, you need to create them:

1. **Open Settings** → Click ⚙️ in popup
2. **Go to Tasks Tab** → Between "JS Scripts" and "Settings"
3. **Click "Create New Task"** button
4. **Drag scripts** from left palette to canvas
5. **Configure each step** (click to select, edit properties on right)
6. **Save the task** → Give it a name and click Save

## Example Task Creation

### Simple 2-Step Task:

**Step 1: WhatsApp Read Messages**
- Parameters: `{"searchText1": "John"}`
- Outputs: `$.chat.username`, `$.chat.messages`

**Step 2: Google Search**
- Data Mapping: `{"query": "$.chat.username"}`
- This searches Google for the WhatsApp username

### How to Configure:

1. Drag "WhatsApp Read Messages" to canvas
2. Drag "Google Search" below it
3. Click Google Search step
4. In properties panel, see "Available Data from Previous Step"
5. Click `username` field to copy `$.chat.username`
6. In Data Mapping field, paste:
   ```json
   {
     "query": "$.chat.username"
   }
   ```
7. Save the task

## Task Execution Features

### ✅ What Works:
- Sequential step execution
- Data passing between steps (via data mapping)
- Loop execution (forEach, while, fixed count)
- Conditional execution (skip, stop, continue)
- Parameter passing to first step
- Execution from popup with one click

### 🔄 Coming Soon:
- Natural language task execution ("run my WhatsApp task")
- Task scheduling (run every hour, daily, etc.)
- Task result display in popup
- Pause/Resume task execution
- Step-by-step debugging

## Troubleshooting

### "No tasks available"
- You haven't created any tasks yet
- Go to Settings → Tasks tab → Create New Task

### "Task execution failed"
- Check console for error details
- Verify all scripts in the task exist
- Check that data mappings are correct
- Ensure previous steps output the expected data

### Task runs but doesn't do anything
- Open the tab that the task should affect
- Check debugger is attached (you may need to refresh)
- Look for script execution errors in console

### Can't find my task
- Refresh the popup
- Go to Settings → Tasks tab to verify it's saved
- Check the task has steps (not empty)

## Tips

1. **Test individual scripts first** before creating tasks
2. **Use output schemas** in scripts for easier data mapping
3. **Check console logs** for detailed execution info
4. **Start with simple 2-step tasks** before complex workflows
5. **Name tasks clearly** (e.g., "WhatsApp to Google", not "Task 1")

## Quick Reference

| Action | Command | Button |
|--------|---------|--------|
| Show all tasks | `show available tasks` | 🎯 Tasks |
| Show all scripts | `show available scripts` | 📋 Scripts |
| Open settings | Click ⚙️ icon | ⚙️ |
| Create new task | Settings → Tasks → Create | - |
| Execute task | Click Execute button | Execute |

## Advanced: Executing with Parameters

Currently, tasks execute with default parameters from each step. To pass custom parameters to the first step (future feature):

```javascript
// This will be available soon
window.executeTaskById('task_123', {
  "searchText1": "Custom Value",
  "searchText2": "Another Value"
});
```

## Need Help?

1. Check the console (F12) for detailed logs
2. Review task configuration in Settings → Tasks
3. Test individual scripts first
4. Verify data mappings use correct JSON paths (e.g., `$.field.name`)
5. Check that all required scripts exist

Happy automating! 🚀
