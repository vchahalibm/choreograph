# DeskAgent Installation Guide

## Prerequisites
- Google Chrome browser (version 88 or higher)
- Developer mode enabled in Chrome

## Step-by-Step Installation

### 1. Download/Clone the Extension
```bash
# If using git
git clone <repository-url>

# Or download and extract the ZIP file
```

### 2. Prepare Icons (Temporary)
Since the extension requires icon files, create temporary placeholder icons:

```bash
cd DeskAgent/icons

# Create a simple colored square as placeholder
# You can use any 128x128 PNG image for now
# Or use the provided icon.svg and convert it
```

**Quick icon generation options:**
- Use an online tool like https://www.favicon-generator.org/
- Create icons in sizes: 16x16, 48x48, 128x128
- Save them as `icon16.png`, `icon48.png`, `icon128.png` in the `icons/` folder

### 3. Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click: Menu (⋮) → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch in top-right corner

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to the `DeskAgent` folder
   - Click "Select Folder"

4. **Verify Installation**
   - DeskAgent should appear in your extensions list
   - Pin the extension icon to toolbar for easy access

### 4. Initial Setup

1. **Click the DeskAgent Icon**
   - This opens the chat popup interface

2. **Open Settings**
   - Click the gear icon (⚙️) in the popup
   - Or right-click extension icon → Options

3. **Load NLP Model (Optional but Recommended)**
   - In the popup, type: "load model"
   - Or use the quick action button
   - Wait for model to download (~22MB, first time only)

4. **Upload Your First Script**
   - Go to Settings → JSON Scripts tab
   - Upload the included `example-script.json`
   - Or create your own JSON automation script

### 5. Test the Extension

1. **Using the Example Script**
   ```
   - Open DeskAgent popup
   - Type: "show available scripts"
   - Click "Execute" on "Google Search Example"
   ```

2. **Using Natural Language**
   ```
   - First ensure model is loaded
   - Type: "search google for chrome devtools"
   - The extension will match your command to the script
   ```

## Troubleshooting

### Extension Won't Load
- **Error: "Manifest file is missing or unreadable"**
  - Ensure you selected the correct folder containing `manifest.json`
  - Check that all files are properly saved

- **Error: "Could not load icon"**
  - Create placeholder PNG icons in the `icons/` folder
  - Or temporarily remove icon references from `manifest.json`

### Model Won't Load
- **Check internet connection** - Model downloads from CDN
- **Check console errors** - Open DevTools on background page
  - Go to `chrome://extensions/`
  - Click "Service Worker" under DeskAgent
  - Check for errors in console

### Script Won't Execute
- **Debugger already attached**
  - Close Chrome DevTools on target tab
  - Detach other debuggers

- **Tab not found**
  - Ensure target URL is accessible
  - Check script's `targetUrl` is correct

### Permissions Issues
- Extension requires these permissions:
  - `debugger` - For automation
  - `tabs` - For tab management
  - `storage` - For saving scripts
  - `scripting` - For code injection
  - `downloads` - For script downloads

## Quick Start Checklist

- [ ] Chrome installed and updated
- [ ] Developer mode enabled
- [ ] Extension folder downloaded
- [ ] Icon files created/added
- [ ] Extension loaded in Chrome
- [ ] Extension icon visible in toolbar
- [ ] Settings page accessible
- [ ] Example script uploaded
- [ ] NLP model loaded (optional)
- [ ] Test script executed successfully

## Temporary Icon Creation

If you don't have icons, use this quick method:

### Using ImageMagick (if installed):
```bash
cd DeskAgent/icons
convert -size 128x128 xc:#667eea -pointsize 100 -gravity center -annotate +0+0 "🤖" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

### Using Online Tool:
1. Go to https://www.favicon-generator.org/
2. Upload any image or create one
3. Download all sizes
4. Rename to `icon16.png`, `icon48.png`, `icon128.png`
5. Place in `DeskAgent/icons/` folder

### Or Temporarily Modify Manifest:
Comment out icon references in `manifest.json` temporarily:
```json
// "icons": {
//   "16": "icons/icon16.png",
//   "48": "icons/icon48.png",
//   "128": "icons/icon128.png"
// },
```

## Next Steps

After successful installation:

1. **Read the README.md** - Understand all features
2. **Upload more scripts** - Build your automation library
3. **Customize settings** - Set default timeouts and URLs
4. **Create JavaScript files** - For custom page interactions
5. **Experiment with NLP** - Try different command phrases

## Getting Help

- Check browser console for errors
- Review background service worker logs
- Check the README.md for detailed documentation
- Ensure all dependencies are loaded

## Uninstallation

To remove DeskAgent:
1. Go to `chrome://extensions/`
2. Find DeskAgent
3. Click "Remove"
4. Confirm removal

All local data (scripts, settings) will be deleted.
