# Quick Commands for DeskAgent Popup

## 🎯 Running Tasks

### Method 1: Quick Action Button (Recommended)
1. Click the **🎯 Tasks** button at the top of the popup
2. Click **Execute** next to any task

### Method 2: Natural Language Commands

#### Show All Tasks
```
show available tasks
show tasks
list tasks
```

#### Execute Specific Task by Name
```
run task WhatsApp Flow
execute task Google Search
run my WhatsApp task
execute the data scraping task
```

**Examples:**
- If your task is named "WhatsApp to Google":
  ```
  run task whatsapp to google
  ```

- If your task is named "Web Scraper":
  ```
  execute web scraper task
  ```

**Smart Matching:**
- The system will match task names intelligently
- Partial matches work (e.g., "whatsapp" matches "WhatsApp to Google")
- Case insensitive
- If no match found, shows all available tasks

## 📋 Running Scripts

### Show All Scripts
```
show available scripts
list scripts
```

### Execute Specific Script (Natural Language)
```
open whatsapp
search google
scrape website
```

## 🤖 AI Model

### Load AI Model
```
load model
```

## ❓ Help

### Get Help
```
help
```

## Complete Command Reference

| What You Want | Type This | Or Click |
|---------------|-----------|----------|
| See all tasks | `show tasks` | 🎯 Tasks |
| Run a task | `run task [name]` | Execute button |
| See all scripts | `show scripts` | 📋 Scripts |
| Run a script | Script name or description | Execute button |
| Load AI | `load model` | 🧠 Load AI |
| Get help | `help` | ❓ Help |
| Open settings | - | ⚙️ icon |

## Tips

1. **Task names are case-insensitive**: "WhatsApp" = "whatsapp"
2. **Partial matches work**: "web" matches "Web Scraper Task"
3. **Use Execute buttons** for fastest access
4. **Check console** (F12) for detailed execution logs
5. **Natural language** works for scripts, AI matching coming soon

## Examples

### Example 1: Running a Task
```
You: show tasks

Agent: Available Tasks:
       1. WhatsApp to Google (2 steps) [Execute]
       2. Web Scraping Flow (3 steps) [Execute]

You: run task whatsapp

Agent: Found task: WhatsApp to Google (2 steps)
       Executing now...
       ✅ Task execution started successfully!
```

### Example 2: Quick Task Execution
```
You: [Click 🎯 Tasks button]

Agent: Available Tasks:
       1. Daily News Scraper (4 steps) [Execute]
       2. Social Media Poster (2 steps) [Execute]

You: [Click Execute on Daily News Scraper]

Agent: ✅ Task execution started successfully!
```

### Example 3: Script Execution
```
You: show scripts

Agent: Available Scripts:
       1. WhatsApp Read Messages [Execute]
       2. Google Search [Execute]

You: [Click Execute on WhatsApp Read Messages]

Agent: ✅ Script execution started successfully!
```

## Keyboard Shortcuts

- **Enter** - Send command
- **↑** - Previous command (future)
- **Tab** - Autocomplete (future)

## Coming Soon

- ⏰ Schedule tasks (run every hour, daily, etc.)
- 🔍 Search tasks and scripts
- 📊 View task execution history
- ⏸️ Pause/Resume running tasks
- 🎨 Task templates library
- 🔗 Chain multiple tasks
- 📱 Mobile support

## Troubleshooting

**"No tasks available"**
- Create a task first in Settings → Tasks tab

**Task name not recognized**
- Try exact task name from task list
- Use Execute button instead
- Check task is saved in Settings

**Task executes but nothing happens**
- Open the target tab/website first
- Check console for errors
- Verify scripts in task are valid

Need help? Type `help` in the popup! 🚀
