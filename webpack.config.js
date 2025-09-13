const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  // Add 'image-selector' as a new entry point
  entry: {
    background: path.resolve(__dirname, 'src/background.ts'),
    sidebar: path.resolve(__dirname, 'src/sidebar/sidebar.ts'),
    'image-selector': path.resolve(__dirname, 'src/content/image-selector.ts'),
    'content-script': path.resolve(__dirname, 'src/content/content-script.ts'), // <-- 新增这一行
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'manifest.json', to: '.' }
      ],
    }),
  ],
};