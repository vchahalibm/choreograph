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
    library: 'Transformers'
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
    maxAssetSize: 5000000,
    maxEntrypointSize: 5000000
  }
};
