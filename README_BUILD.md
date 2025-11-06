# Build Instructions for Granite 4.0 AI Model

## Overview

This extension uses IBM's Granite 4.0 model via @huggingface/transformers. Since the npm package uses ES6 modules, we need webpack to bundle it for use in a Chrome extension Web Worker.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@huggingface/transformers@3.1.0` - Official HuggingFace transformers library with Granite 4.0 support
- `webpack` & `webpack-cli` - Build tools
- `copy-webpack-plugin` - For copying WASM files if needed

### 2. Build the AI Worker

```bash
npm run build
```

This creates `scripts/ai-worker.bundled.js` which bundles the transformers library with the worker code.

For development with auto-rebuild:
```bash
npm run watch
```

### 3. Update the Worker Reference

After building, update `scripts/ai-worker.js` to load the bundled file:

```javascript
self.importScripts('./ai-worker.bundled.js');
```

Or replace the entire `ai-worker.js` file with a simple loader that imports the bundled version.

## How It Works

### Source Structure

- `src/ai-worker-source.js` - Worker source code with ES6 imports
- `webpack.config.js` - Webpack configuration
- `package.json` - Dependencies and build scripts

### Build Process

1. Webpack reads `src/ai-worker-source.js`
2. Bundles `@huggingface/transformers` and all dependencies
3. Outputs to `scripts/ai-worker.bundled.js`
4. The bundled file exposes `Transformers` globally for the worker

### Why This Approach?

According to `GRANITE_MODEL_OPTIONS.md`:

**Option 1: Use Build Tool (Webpack/Vite) ✅ RECOMMENDED**
- ✅ Full Granite 4.0 support
- ✅ Proper module resolution
- ✅ This is what official examples use
- ✅ Production-ready

## Model Configuration

The worker is configured to use:
- **Model**: `onnx-community/granite-4.0-micro-ONNX-web`
- **Device**: WebGPU (with WASM fallback)
- **Quantization**: q4f16 (WebGPU) or q4 (WASM)

## Testing

1. Build the worker: `npm run build`
2. Load the extension in Chrome
3. Open the config page and click "Load NLP Model"
4. Check the console for:
   ```
   ✅ [AI Worker] Web Worker initialized and ready (Webpack bundled with Granite 4.0 support)
   🚀 [AI Worker] Loading Granite 4.0 model...
   ✅ [AI Worker] Granite 4.0 model loaded successfully on webgpu
   ```

## Troubleshooting

### Build fails
- Check Node.js version: `node --version` (should be v16+)
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`

### Model won't load
- Check browser console for errors
- Verify WebGPU support in `chrome://gpu`
- Clear browser cache (IndexedDB)

### Bundle too large
- The bundle will be ~400-500KB (minified)
- This is expected for the transformers library
- Most of the model data is downloaded at runtime

## References

- [Official Granite 4.0 Example](https://huggingface.co/spaces/ibm-granite/Granite-4.0-WebGPU)
- [@huggingface/transformers Documentation](https://huggingface.co/docs/transformers.js)
- [Webpack Documentation](https://webpack.js.org/)
