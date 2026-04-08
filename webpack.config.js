const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    popup: "./src/popup/index.tsx",
    content: "./src/content/content.ts",
    background: "./src/background/background.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/popup/popup.html",
      filename: "popup.html",
      chunks: ["popup"],
    }),
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "icons", to: "icons" },
        {
          from: "node_modules/stockfish/bin/stockfish-18-lite-single.js",
          to: "stockfish-18-lite-single.js",
        },
        {
          from: "node_modules/stockfish/bin/stockfish-18-lite-single.wasm",
          to: "stockfish-18-lite-single.wasm",
        },
        { from: "pieces", to: "pieces" },
      ],
    }),
  ],
  devtool: false,
};
