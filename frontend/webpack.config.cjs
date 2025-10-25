const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './src/main.tsx',
  mode: isDevelopment ? 'development' : 'production',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
    clean: true,
    publicPath: '/',
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    // Provide fallbacks for node modules
    fallback: {
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser.js'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      url: require.resolve('url/'),
      querystring: require.resolve('querystring-es3'),
      fs: false,
      crypto: false,
      os: false,
      http: false,
      https: false,
      assert: false,
      net: false,
      tls: false,
      child_process: false,
    }
  },

  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.app.json',
            transpileOnly: true, // Skip type checking for faster builds
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: (resourcePath) => resourcePath.includes('.module.css'),
                localIdentName: isDevelopment 
                  ? '[name]__[local]__[hash:base64:5]'
                  : '[hash:base64]',
                namedExport: false,
              },
              importLoaders: 1,
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: 'body',
      scriptLoading: 'blocking',
    }),
    new MiniCssExtractPlugin(),
    // Polyfill node globals
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production'),
      'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY || ''),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || ''),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID || ''),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET || ''),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID || ''),
      'process.env.FIREBASE_APP_ID': JSON.stringify(process.env.FIREBASE_APP_ID || ''),
    }),
  ],

  // Exclude problem modules that need Node.js APIs
  externals: {
    'electron': 'commonjs electron',
    'electron-store': 'commonjs electron-store',
    'electron-is-dev': 'commonjs electron-is-dev',
    '@electron/remote': 'commonjs @electron/remote',
    'canvas': 'commonjs canvas',
  },

  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
    proxy: [{
      context: ['/api'],
      target: 'http://localhost:8000',
      changeOrigin: true,
    }],
  },

  devtool: isDevelopment ? 'eval-source-map' : false,
};
