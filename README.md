# DeskAgent - Browser Automation Chrome Extension

DeskAgent is a powerful Chrome extension that enables automated browser actions using the Chrome Debugger API, driven by JSON automation scripts and natural language processing.

## Features

### 🤖 Natural Language Command Interface
- Chat-based popup interface for user commands
- AI-powered NLP using Transformers.js to map natural language to automation scripts
- Intelligent script matching based on semantic similarity

### 📋 JSON Automation Scripts
- Upload and manage JSON automation scripts
- Support for all Chrome DevTools Recorder actions:
  - `setViewport`, `navigate`, `click`, `doubleClick`, `hover`
  - `keyDown`, `keyUp`, `change`, `scroll`
  - `waitForElement`, `waitForExpression`
  - Custom `FIND_ELEMENT` and `GOTO_ELEMENT` actions

### 🔄 Advanced Script Features
- **Child Scripts**: Nest scripts within scripts for modular automation
- **Loops**: Repeat actions with configurable iterations
- **Wait Controls**: Add delays between actions
- **Conditional Branching**: Rule-based constraints to control flow
- **Variable Storage**: Store and reuse element references

### 🎯 Debugger API Integration
- Attach debugger to specific tabs, pages, or URLs
- Automatic tab discovery and navigation
- Full Chrome DevTools Protocol access
- Background execution of automation scripts

### ⚙️ Configuration Management
- Upload JSON automation scripts
- Upload JavaScript code for injection
- Configure extension settings
- Manage script library

### 💉 Script Injection
- Inject JavaScript into target pages
- Content script for page interaction
- Helper utilities for common operations

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `DeskAgent` folder
5. The extension icon will appear in your browser toolbar

## Usage

### 1. Configuration
Click the extension icon and then the settings gear (⚙️) to:
- Upload JSON automation scripts
- Upload JavaScript files for injection
- Configure default settings
- Load the NLP model for natural language commands

### 2. Upload JSON Scripts
Create a JSON automation script following this format:

```json
{
  "title": "My Automation Script",
  "description": "Description of what this script does",
  "targetUrl": "https://example.com",
  "steps": [
    {
      "type": "navigate",
      "url": "https://example.com"
    },
    {
      "type": "waitForElement",
      "selectors": [["#myElement"]],
      "visible": true
    },
    {
      "type": "click",
      "selectors": [["#myButton"]],
      "offsetX": 10,
      "offsetY": 10
    }
  ]
}
```

### 3. Advanced Script Features

#### Loops
```json
{
  "type": "childSteps",
  "loop": {
    "iterations": 5,
    "waitBetween": 1000,
    "steps": [
      { "type": "click", "selectors": [["button"]] }
    ]
  }
}
```

#### Conditional Branching
```json
{
  "type": "click",
  "selectors": [["button"]],
  "condition": {
    "operator": "exists",
    "field": "#targetElement"
  }
}
```

#### Find and Goto Element
```json
{
  "type": "FIND_ELEMENT",
  "selectors": [["#myElement"]],
  "storeAs": "targetElement"
},
{
  "type": "GOTO_ELEMENT",
  "variableName": "targetElement",
  "smooth": true
}
```

### 4. Natural Language Commands
Click the extension icon to open the chat interface. Try commands like:
- "show available scripts"
- "load model" (to enable NLP)
- "navigate to google and search for cats"
- Any command that matches your uploaded scripts

### 5. Execute Scripts
- From the configuration page: Click "Execute" on any script
- From the popup: Use natural language or select from available scripts
- Scripts will automatically attach the debugger and run

## JSON Script Reference

### Supported Step Types

| Type | Description | Properties |
|------|-------------|------------|
| `setViewport` | Set browser viewport | `width`, `height`, `deviceScaleFactor`, `isMobile`, `hasTouch`, `isLandscape` |
| `navigate` | Navigate to URL | `url`, `assertedEvents` |
| `click` | Click element | `selectors`, `offsetX`, `offsetY`, `button`, `duration` |
| `doubleClick` | Double-click element | `selectors`, `offsetX`, `offsetY`, `button` |
| `hover` | Hover over element | `selectors` |
| `change` | Change input value | `selectors`, `value` |
| `keyDown` | Key press down | `key`, `target` |
| `keyUp` | Key press up | `key`, `target` |
| `scroll` | Scroll page | `x`, `y` |
| `waitForElement` | Wait for element | `selectors`, `visible`, `timeout` |
| `waitForExpression` | Wait for JS expression | `expression`, `timeout` |
| `FIND_ELEMENT` | Find and store element | `selectors`, `storeAs` |
| `GOTO_ELEMENT` | Scroll to element | `selectors` or `variableName`, `smooth` |
| `executeScript` | Execute JS script | `scriptId` |
| `childSteps` | Nested steps | `steps`, `loop` |

### Selector Types
- CSS: `"#id"`, `".class"`, `"tag"`
- XPath: `"xpath///div[@id='test']"`
- ARIA: `"aria/Button label"`
- Text: `"text/Click here"`
- Pierce (shadow DOM): `"pierce/#shadow-element"`

## Architecture

```
DeskAgent/
├── manifest.json           # Extension manifest
├── scripts/
│   ├── background.js       # Service worker with debugger API
│   ├── content.js          # Content script for page interaction
│   ├── popup.js            # Popup chat interface
│   ├── config.js           # Configuration page logic
│   └── injected.js         # Helper utilities for injection
├── pages/
│   ├── popup.html          # Chat interface UI
│   └── config.html         # Configuration page UI
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

1. **Background Service Worker**:
   - Manages debugger attachment/detachment
   - Loads and runs Transformers.js NLP model
   - Executes JSON automation scripts
   - Handles all Chrome Debugger Protocol commands

2. **Script Executor**:
   - Parses JSON scripts
   - Executes steps sequentially
   - Handles loops, conditions, and branching
   - Manages element finding and interaction

3. **NLP Processing**:
   - Uses Transformers.js (all-MiniLM-L6-v2 model)
   - Computes semantic similarity between commands and scripts
   - Returns best matching script with confidence score

4. **Debugger API**:
   - Attaches to tabs using Chrome DevTools Protocol
   - Enables Runtime, Page, and DOM domains
   - Sends commands for automation

## Example Scripts

### Simple Navigation and Click
```json
{
  "title": "Open Google and Search",
  "description": "Navigate to Google and perform a search",
  "steps": [
    {
      "type": "navigate",
      "url": "https://www.google.com"
    },
    {
      "type": "waitForElement",
      "selectors": [["input[name='q']"]]
    },
    {
      "type": "change",
      "selectors": [["input[name='q']"]],
      "value": "Chrome DevTools"
    },
    {
      "type": "keyDown",
      "key": "Enter"
    }
  ]
}
```

### Form Fill with Loop
```json
{
  "title": "Fill Multiple Forms",
  "steps": [
    {
      "type": "childSteps",
      "loop": {
        "iterations": 3,
        "waitBetween": 2000,
        "steps": [
          {
            "type": "change",
            "selectors": [[".form-input"]],
            "value": "Test Data"
          },
          {
            "type": "click",
            "selectors": [[".submit-btn"]]
          }
        ]
      }
    }
  ]
}
```

## Troubleshooting

### Model Loading Issues
- Ensure you have a stable internet connection
- The model downloads ~22MB on first load
- Check browser console for errors

### Script Execution Failures
- Verify selectors are correct
- Check if debugger is properly attached
- Look for console errors in background service worker

### Debugger Not Attaching
- Close other DevTools instances
- Ensure no other extensions are using the debugger
- Try reloading the extension

## Security Notes

- The extension requires debugger permission for automation
- Scripts run with full page access
- Only upload trusted JSON/JS scripts
- Review scripts before execution

## Development

To modify or extend DeskAgent:

1. Edit files in the `DeskAgent` folder
2. Reload the extension in `chrome://extensions/`
3. Test changes in the popup or configuration page
4. Check console logs in background service worker

## Future Enhancements

- [ ] Visual script recorder
- [ ] More NLP models for better matching
- [ ] Script marketplace/sharing
- [ ] Advanced debugging tools
- [ ] Performance metrics
- [ ] Export/import script collections
- [ ] Multi-tab orchestration

## License

MIT License - Feel free to modify and improve!

## Credits

- Built with Chrome Extensions Manifest V3
- NLP powered by [Transformers.js](https://huggingface.co/docs/transformers.js)
- Chrome Debugger API documentation
