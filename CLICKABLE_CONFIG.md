# Configurable Clickable Elements

## Overview

The DeskAgent extension now supports configurable clickable element detection, allowing you to customize which HTML elements should be considered clickable when the automation script needs to find click targets. This eliminates the need to modify code for different websites.

## Why This Feature?

Different websites use different patterns for clickable elements:
- **Google**: Uses standard `<a>` and `<button>` tags
- **WhatsApp Web**: Uses `<div role="row">` for chat rows
- **React Apps**: Often use `data-testid` or `data-action` attributes
- **Custom Apps**: May use specific class names or roles

Instead of hardcoding these patterns and modifying code for each new website, you can now configure them through the UI.

## Configuration Options

### 1. HTML Tags
**Default**: `a, button`

Specify which HTML tag names should be considered clickable.

**Examples**:
- `a, button` - Standard links and buttons
- `a, button, div, span` - Include divs and spans (useful for custom components)

### 2. ARIA Roles
**Default**: `button, link, row, listitem, option, menuitem`

Specify which ARIA role attribute values indicate clickable elements.

**Examples**:
- `button, link` - Standard ARIA roles
- `button, link, row, listitem, option, menuitem` - Include WhatsApp-style rows and list items
- `tab, treeitem, gridcell` - Add more complex widget roles

### 3. Data Attribute Keywords
**Default**: `click, action, cell, row, item, chat`

Keywords to search for in `data-*` attributes (like `data-testid`, `data-action`, etc.).

**Examples**:
- `click, action` - Basic action attributes
- `cell, row, item, chat` - Grid/list structures
- `button, link, select` - Component identifiers

**How it works**: If an element has `data-testid="chat-row"`, it matches because `"chat-row"` contains the keyword `"chat"`.

### 4. Class Name Keywords
**Default**: `click, link, button, action`

Keywords to search for in CSS class names.

**Examples**:
- `click, link, button` - Common clickable classes
- `action, interactive, selectable` - Custom app classes
- `item, card, tile` - Component classes

**How it works**: If an element has `class="user-item clickable"`, it matches because the class contains the keyword `"click"`.

## How to Configure

1. **Open Configuration Page**:
   - Click the DeskAgent extension icon
   - Click "Configuration" or navigate to the configuration page

2. **Go to Settings Tab**:
   - Click on the "Settings" tab
   - Scroll to "Clickable Element Detection" section

3. **Update Configuration**:
   - Modify any of the four configuration fields
   - Use comma-separated values
   - Click "Save Settings"

4. **Reset to Defaults**:
   - Click "Reset to Defaults" button to restore original settings

## Technical Details

### How It Works

When a script tries to click an element (e.g., clicking text that's not directly clickable), the content script searches up the DOM tree to find a clickable ancestor using these steps:

1. **Check HTML Tags**: Is the current element's tag in the configured list?
2. **Check ARIA Roles**: Does the element have a `role` attribute matching the configured list?
3. **Check Click Handlers**: Does the element have onclick handlers or cursor:pointer? (always checked)
4. **Check Class Names**: Do any configured keywords appear in the element's class names?
5. **Check Data Attributes**: Do any configured keywords appear in data-* attribute values?

If any check passes, that element is considered clickable and will be clicked.

### Configuration Storage

- Settings are stored in `chrome.storage.local`
- Configuration is loaded when content scripts initialize
- Changes are immediately broadcast to all open tabs

### Fallback Behavior

If configuration fails to load or settings are missing:
- Default values are automatically used
- The extension continues to work with standard patterns

## Examples

### Example 1: Adding Support for a Custom App

**Scenario**: Your app uses `<div class="app-card-item">` for clickable cards.

**Solution**:
1. Add `"card"` to **Class Name Keywords**: `click, link, button, action, card`
2. Save settings
3. Scripts can now click elements inside `.app-card-item` containers

### Example 2: WhatsApp Web

**Already Configured by Default**:
- **ARIA Roles**: Includes `row` for chat rows
- **Data Attributes**: Includes `chat` for chat-related elements

### Example 3: Material-UI Application

**Scenario**: App uses `data-testid` extensively.

**Already Configured**:
- **Data Attributes**: Default includes common keywords like `button`, `action`

**To Add More**:
- Add `"mui"` to Data Attribute Keywords if your testids use that prefix
- Add `"menu"` or `"dialog"` for other component types

## Best Practices

1. **Start Conservative**: Begin with defaults and add only what you need
2. **Be Specific**: Use distinctive keywords to avoid false positives
3. **Test Changes**: After updating configuration, test your scripts
4. **Document Custom Settings**: Keep notes on which settings work for which sites
5. **Use Reset**: If something breaks, use "Reset to Defaults" to start over

## Backward Compatibility

This feature maintains full backward compatibility:
- **Existing scripts continue to work** without any changes
- **Default configuration** matches the previous hardcoded behavior
- **All previous click detection methods** still work (onclick handlers, cursor:pointer, etc.)

## Troubleshooting

### Click Not Working After Configuration Change

1. **Check if element is in DOM**: Use browser DevTools to inspect the element
2. **Verify attribute values**: Check the actual role/class/data-testid values
3. **Check keyword matching**: Keywords must be substring matches (case-insensitive)
4. **Reset to defaults**: Try resetting to see if custom config caused the issue
5. **Check console logs**: Content script logs show which config is loaded

### Configuration Not Taking Effect

1. **Reload the page**: Content scripts load config on initialization
2. **Check extension reload**: After changing config.js code, reload the extension
3. **Verify save**: Check that "Settings saved successfully" message appears

## Future Enhancements

Potential future improvements:
- Regular expression support for more complex matching
- Per-script configuration overrides
- Visual configuration builder with live preview
- Export/import configuration presets for different websites
