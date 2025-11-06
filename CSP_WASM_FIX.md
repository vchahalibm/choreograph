# CSP WebAssembly Fix

## Problem

When trying to load the NLP model, you encountered this error:

```
WebAssembly.instantiate(): Refused to compile or instantiate WebAssembly module because neither 'wasm-eval' nor 'unsafe-eval' is an allowed source of script in the following Content Security Policy directive: "script-src 'self'"
```

## Root Cause

### Content Security Policy (CSP) in Chrome Extensions

Chrome extensions have a strict **Content Security Policy** by default that:
- ❌ Blocks `eval()`
- ❌ Blocks `new Function()`
- ❌ Blocks WebAssembly compilation

This is for security, but it also blocks legitimate use cases like ML models.

### Why WebAssembly is Blocked

WebAssembly (WASM) requires dynamic compilation, similar to `eval()`:
1. WASM binary is downloaded
2. Browser compiles it to native code
3. Code is executed

Without `wasm-unsafe-eval`, step 2 is blocked.

## Solution

### Updated manifest.json

Added Content Security Policy to allow WebAssembly:

```json
{
  "manifest_version": 3,
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  }
}
```

### What This Does

- `script-src 'self'`: Only allow scripts from extension itself
- `'wasm-unsafe-eval'`: Allow WebAssembly compilation
- `object-src 'self'`: Only allow objects from extension itself

### Security Implications

**Is this safe?** ✅ **Yes, for your use case**

1. **You control the WASM source**: Using trusted Transformers.js library
2. **WASM is sandboxed**: Runs in isolated memory space
3. **Extension-only**: CSP only applies to extension pages, not web pages
4. **Standard practice**: Many ML-powered extensions use this

**What it doesn't allow:**
- ❌ Arbitrary code execution from web pages
- ❌ Eval of string-based JavaScript
- ❌ Inline scripts (without hash)

## Testing the Fix

### Step 1: Reload Extension

1. Go to `chrome://extensions/`
2. Click the **reload icon** for DeskAgent
3. Verify no errors in console

### Step 2: Test Model Loading

Open the service worker console and run:

```javascript
chrome.runtime.sendMessage({ type: 'LOAD_NLP_MODEL' });
```

### Expected Output (Success)

```
🚀 Loading NLP model for text generation...
📦 Model: Xenova/distilgpt2
📥 Loading onnx/decoder_model_merged_quantized.onnx: 100%
✅ Loaded onnx/decoder_model_merged_quantized.onnx
✅ NLP model loaded successfully
🔥 Testing model...
✅ Model test complete
```

### What You Should NOT See

❌ `wasm streaming compile failed`
❌ `falling back to ArrayBuffer instantiation`
❌ `failed to asynchronously prepare wasm`
❌ `no available backend found`

## Alternative: Use a Web Worker

If CSP is still a concern, you can load the model in a Web Worker (not covered here):

```javascript
// worker.js
importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
// Load model in worker context
```

**Pros:**
- More isolated
- Doesn't block main thread

**Cons:**
- More complex message passing
- Still needs `wasm-unsafe-eval`

## Manifest V3 CSP Details

### Default CSP (without our changes)

```
script-src 'self'; object-src 'self';
```

This blocks:
- ❌ WebAssembly
- ❌ eval()
- ❌ new Function()
- ❌ Inline scripts

### Our CSP

```
script-src 'self' 'wasm-unsafe-eval'; object-src 'self';
```

This allows:
- ✅ WebAssembly compilation
- ✅ Scripts from extension
- ❌ eval() (still blocked)
- ❌ new Function() (still blocked)
- ❌ Inline scripts (still blocked)

### Other CSP Options (not used)

```
'wasm-eval'           # Old name, use 'wasm-unsafe-eval' instead
'unsafe-eval'         # Allows eval() - DON'T USE unless necessary
'unsafe-inline'       # Allows inline scripts - NOT ALLOWED in MV3
```

## Related Issues

### If You Still Get CSP Errors

1. **Check manifest syntax**
   ```bash
   # Validate JSON
   cat manifest.json | python -m json.tool
   ```

2. **Verify extension reloaded**
   - Hard refresh: Remove and re-add extension

3. **Check Chrome version**
   - `wasm-unsafe-eval` requires Chrome 95+
   - Update Chrome if needed

4. **Check service worker console**
   - Not browser console
   - Click "service worker" link in `chrome://extensions/`

### If Model Still Won't Load

1. **Check network**
   - Model downloads from HuggingFace CDN
   - Check Network tab for errors

2. **Check storage**
   - Model cached in IndexedDB
   - Clear if corrupted: DevTools → Application → IndexedDB

3. **Try smaller model**
   ```javascript
   // In loadNLPModel(), change to:
   const modelId = 'Xenova/gpt2';  // Even smaller
   ```

## Best Practices

### ✅ DO

1. **Use specific CSP**: Only add what you need
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
   }
   ```

2. **Document why**: Add comment in manifest
   ```json
   // Required for WebAssembly (Transformers.js ML models)
   "content_security_policy": { ... }
   ```

3. **Keep tight**: Don't add `unsafe-eval` unless absolutely necessary

### ❌ DON'T

1. **Don't use `unsafe-eval`** unless you need eval()
   ```json
   // BAD - too permissive
   "script-src 'self' 'unsafe-eval';"
   ```

2. **Don't try `unsafe-inline`** (not allowed in MV3)
   ```json
   // ERROR - will be rejected
   "script-src 'self' 'unsafe-inline';"
   ```

3. **Don't use for service worker only**
   ```json
   // WRONG - service worker has separate CSP
   "content_security_policy": {
     "service_worker": "..."  // This doesn't exist in MV3
   }
   ```

## Chrome Extension Store

### Will This Be Approved?

✅ **Yes**, `wasm-unsafe-eval` is allowed and common for:
- Machine Learning extensions
- Game engines
- Image/video processing
- Scientific computing

### Review Process

1. **Declare usage**: In store listing, mention AI/ML features
2. **Privacy policy**: Explain model is local (no data sent to servers)
3. **Permissions justification**: Explain why WASM is needed

### Example Justification

> "This extension uses WebAssembly to run machine learning models locally in the browser. The 'wasm-unsafe-eval' CSP directive is required to compile and run the ONNX Runtime for natural language processing. All computation happens locally; no user data is sent to external servers."

## References

- [Chrome Extensions CSP](https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/)
- [WebAssembly and CSP](https://webassembly.org/docs/security/)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-12 | Added `wasm-unsafe-eval` to CSP | Enable WebAssembly for ML models |

---

**Status**: ✅ Fixed
**Next Steps**: Reload extension and test model loading
