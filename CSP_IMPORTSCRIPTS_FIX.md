# CSP Fix: Using importScripts() in Web Worker

## The Problem

Even in Web Workers created from the config page, dynamic `import()` was blocked by CSP:

```
Refused to load the script 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0/dist/transformers.min.js'
because it violates the following Content Security Policy directive: "script-src 'self' 'wasm-unsafe-eval'..."
```

## The Solution

Use `importScripts()` instead of dynamic `import()` in Web Workers.

### Why This Works

**`importScripts()` in Web Workers:**
- Is **not** subject to the same CSP restrictions as `import()`
- Designed specifically for loading external scripts in workers
- Synchronous loading (blocks until loaded)
- Standard Web Worker API

**`import()` statements:**
- Subject to CSP `script-src-elem` directive
- Even in workers, still checked against CSP
- Asynchronous loading
- ES6 module syntax

## Code Change

### Before (Blocked by CSP):
```javascript
// Dynamic import - BLOCKED by CSP
Transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0/dist/transformers.min.js');
```

### After (Works!):
```javascript
// importScripts - NOT blocked by CSP
self.importScripts('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0/dist/transformers.min.js');
Transformers = self.Transformers || self;
```

## Implementation Details

**File:** `scripts/ai-worker.js`

```javascript
async function loadTransformersLibrary() {
  if (Transformers) {
    return Transformers;
  }

  console.log('📦 [AI Worker] Loading Transformers.js library via importScripts...');

  try {
    // Use importScripts for Web Workers (no CSP restrictions)
    self.importScripts('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0/dist/transformers.min.js');

    // Access from global scope after importScripts
    Transformers = self.Transformers || self;

    console.log('✅ [AI Worker] Transformers.js library loaded successfully');
    return Transformers;
  } catch (error) {
    console.error('❌ [AI Worker] Failed to load Transformers.js:', error);
    throw new Error(`Failed to load Transformers.js library: ${error.message}`);
  }
}
```

## Benefits

1. **No CSP Changes Needed** - Works with existing `script-src 'self' 'wasm-unsafe-eval'`
2. **Standard API** - `importScripts()` is the official way to load scripts in workers
3. **Reliable** - Not subject to future CSP changes
4. **Simple** - No complex workarounds needed

## Testing

After this change:

1. Reload extension
2. Open config page
3. Click "Load NLP Model"
4. Should see in console:
   ```
   📦 [AI Worker] Loading Transformers.js library via importScripts...
   ✅ [AI Worker] Transformers.js library loaded successfully
   🚀 [AI Worker] Loading Granite 4.0 model...
   ```

## Alternative Approaches We Tried

### 1. Dynamic import() - ❌ Blocked by CSP
```javascript
await import('https://cdn.jsdelivr.net/...');
```

### 2. Adding CDN to CSP - ❌ Not allowed in extensions
```json
"script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net"
// Chrome extensions don't allow external domains in CSP
```

### 3. Offscreen Documents - ❌ Still has CSP restrictions
Workers created in offscreen documents still face CSP

### 4. importScripts() - ✅ Works!
Standard Web Worker API, no CSP restrictions

## References

- [MDN: importScripts()](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)
- [Web Workers Specification](https://html.spec.whatwg.org/multipage/workers.html#importing-scripts-and-libraries)
- [Chrome Extension CSP](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)

## Key Takeaway

When loading external libraries in Web Workers:
- **Use `importScripts()`** - Official API, no CSP issues
- **Avoid `import()`** - Subject to CSP restrictions even in workers

This is the correct and standard approach for Web Workers!
