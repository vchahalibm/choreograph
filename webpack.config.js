const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    'ai-worker': './src/ai-worker-source.js'
  },
  output: {
    path: path.resolve(__dirname, 'scripts'),
    filename: '[name].bundled.js',
    libraryTarget: 'var',
    library: 'Transformers',
    publicPath: ''
  },
  resolve: {
    extensions: ['.js'],
    fallback: {
      "fs": false,
      "path": false,
      "url": false
    }
  },
  optimization: {
    minimize: true
  },
  performance: {
    maxAssetSize: 25000000,
    maxEntrypointSize: 25000000
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/onnxruntime-web/dist/*.wasm',
          to: '[name][ext]'
        },
        {
          from: 'node_modules/onnxruntime-web/dist/*.mjs',
          to: '[name][ext]'
        }
      ]
    })
  ]
};
