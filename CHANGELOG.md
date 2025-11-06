# Changelog

## [Unreleased] - 2025-10-11

### Added

#### 1. Script Parameterization System
- **Variable substitution** in JSON scripts using `{{variableName}}` syntax
- **Default parameters** in script definitions via `parameters` object
- **Runtime parameter override** when executing scripts
- **Recursive substitution** for nested objects and arrays
- **Detailed logging** showing all variable substitutions
- Console indicators: `🔄 Substituting {{varName}} with "value"`

**Files Modified:**
- `scripts/background.js`: Added `substituteVariables()` method to `ScriptExecutor` class
- `scripts/background.js`: Updated `execute()` to merge default and runtime parameters
- `scripts/background.js`: Modified `executeStep()` to process variables before execution
- `WhatsappReadMsg-Fixed.json`: Updated to use `{{searchText1}}` and `{{searchText2}}` variables

**Example Usage:**
```json
{
  "parameters": {
    "searchText1": "R94",
    "searchText2": "Rustambagh"
  },
  "steps": [
    {
      "type": "change",
      "value": "{{searchText1}}"
    }
  ]
}
```

#### 2. Granite 4.0 LLM Integration
- **IBM Granite 4.0 micro model** for natural language processing
- **WebGPU acceleration** with automatic fallback to WASM
- **Smart script matching** from natural language commands
- **Parameter extraction** from user queries
- **Progress tracking** during model download and initialization
- **Shader compilation** and model warmup
- **Fallback text matching** if model fails

**Files Modified:**
- `scripts/background.js`: Updated imports to include `AutoTokenizer` and `AutoModelForCausalLM`
- `scripts/background.js`: Completely rewrote `loadNLPModel()` for Granite 4.0
- `scripts/background.js`: Rewrote `processNLPCommand()` for LLM-based processing
- `scripts/background.js`: Added `fallbackScriptMatching()` method

**Model Details:**
- Model ID: `onnx-community/granite-4.0-micro-ONNX-web`
- Quantization: q4f16 (WebGPU) / q4 (WASM)
- Size: ~2.3 GB
- Device: WebGPU (if available) or WASM

**Example Usage:**
```javascript
const result = await processNLPCommand("Search for John in WhatsApp", {
  maxTokens: 256,
  temperature: 0.7,
  topP: 0.9
});
// Returns: { matched: true, script: {...}, parameters: {...}, confidence: 0.85 }
```

#### 3. Debugger Persistence
- **Auto-reattachment** when debugger detaches during script execution
- **Persistent connection** after script completion (unless explicitly detached)
- **Configurable detachment** via `detachDebugger` parameter
- **Smart detection** of script execution state
- **Detailed logging** of detach/reattach events

**Files Modified:**
- `scripts/background.js`: Added `keepDebuggerAttached` flag to `DeskAgentBackground`
- `scripts/background.js`: Completely rewrote `handleDebuggerDetach()` with auto-reattachment
- `scripts/background.js`: Updated `execute()` to keep debugger attached by default
- `scripts/background.js`: Added delayed cleanup of execution context

**Features:**
- Prevents script interruption from unexpected debugger detachment
- Allows continued interaction with page after script completion
- Optional explicit detachment: `parameters.detachDebugger = true`
- 100ms delay before reattachment attempt
- 5-second cleanup delay for execution context

**Console Indicators:**
```
⚠️ Debugger detached from tab 123, reason: target_closed
🔄 Attempting to reattach debugger to tab 123...
✅ Debugger reattached to tab 123
🔗 Keeping debugger attached for further interaction
```

### Changed

#### Background Script Improvements
- Environment config updated with `env.backends.onnx.wasm.proxy = false`
- Model loading returns model object instead of void
- `processNLPCommand()` now accepts `options` parameter for generation config
- Execute function now returns `{ success: true, tabId }` instead of just `{ success: true }`

#### Logging Enhancements
- Added emoji indicators for better log readability
- Variable substitution logs: `🔄`
- Model loading logs: `🚀`, `📥`, `✅`, `❌`
- Debugger events: `⚠️`, `🔄`, `✅`, `🔌`, `🔗`
- Script execution: `📝`, `✅`

### Documentation

#### New Files
- `FEATURES_UPDATE.md`: Comprehensive guide for all three new features
- `CHANGELOG.md`: This file, documenting all changes

#### Updated Files
- `WhatsappReadMsg-Fixed.json`: Example of parameterized script

### Technical Details

#### Code Statistics
- **Lines added**: ~350
- **Lines modified**: ~150
- **Methods added**: 3 (`substituteVariables`, `fallbackScriptMatching`, auto-reattach logic)
- **Methods modified**: 4 (`loadNLPModel`, `processNLPCommand`, `execute`, `handleDebuggerDetach`)

#### Dependencies
- `@xenova/transformers@2.17.1` (existing, new imports added)
  - `AutoTokenizer`
  - `AutoModelForCausalLM`

#### Browser Requirements
- **WebGPU** (optional): Chrome 113+ for GPU acceleration
- **Memory**: 2.5+ GB RAM for Granite model
- **Storage**: ~2.3 GB for model cache

### Migration Notes

#### For Existing Scripts
1. **No breaking changes** - existing scripts work as-is
2. **Optional parameterization** - add `parameters` object to enable
3. **Backward compatible** - hardcoded values still work

#### For Users
1. **First model load** takes 30-60 seconds (one-time per session)
2. **Debugger behavior** changed - now stays attached by default
3. **Console logs** more detailed with emoji indicators

### Testing Checklist
- [x] Variable substitution with default parameters
- [x] Variable substitution with runtime parameters
- [x] Variable substitution with nested objects
- [x] Granite model loading with WebGPU
- [x] Granite model loading with WASM fallback
- [x] NLP command processing with model
- [x] Fallback text matching when model fails
- [x] Debugger auto-reattachment during execution
- [x] Debugger persistence after completion
- [x] Explicit debugger detachment
- [x] WhatsApp script with parameterized search

### Known Issues
None at this time.

### Future Improvements
See [FEATURES_UPDATE.md](FEATURES_UPDATE.md#future-enhancements) for planned features.

---

## Previous Versions

### [1.0.0] - Previous
- Initial DeskAgent implementation
- Basic script execution
- Content script click handling
- Configurable clickable elements
- WhatsApp Web automation support
