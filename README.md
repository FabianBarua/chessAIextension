<p align="center">
  <img src="icons/icon128.png" alt="Chess Trainer" width="96" height="96">
</p>

<h1 align="center">♞ Chess Trainer</h1>

<p align="center">
  <strong>Chrome extension that provides real-time Stockfish analysis on chess.com</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/stockfish-18-green" alt="Stockfish 18">
  <img src="https://img.shields.io/badge/react-18-61dafb" alt="React 18">
  <img src="https://img.shields.io/badge/typescript-strict-3178c6" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="MIT">
</p>

---

## Features

- **Live board detection** — Reads the board state directly from the chess.com DOM via MutationObserver
- **Stockfish 18 engine** — Runs locally in a Web Worker (WASM), depth 18 analysis
- **Best move arrows** — SVG overlay with animated arrow showing the recommended move
- **Win probability** — Lichess-style win percentage bar with verdict (Winning / Equal / Difficult / Losing)
- **Turn-aware** — Only analyzes on your turn, stays quiet during opponent's turn
- **Player color detection** — Automatically detects if you're playing white or black
- **Board flipping** — Renders correctly from both perspectives
- **Floating window** — Detach the popup into a standalone window
- **Customizable pieces** — Choose between image pieces (chess.com style), classic Unicode, solid, or outlined
- **Board themes** — Green, Blue, Brown, Purple, Gray
- **Move history** — Full move list with color-coded notation (captures, castling, en passant, promotions)
- **Settings persistence** — All preferences saved to `chrome.storage`

## Screenshots

| Board View | Move List | Settings |
|:---:|:---:|:---:|
| Live board with arrow overlay and win probability | Color-coded move history grid | Piece style and board theme picker |

## Installation

### From Release (recommended)

1. Download the latest `.zip` from [Releases](../../releases)
2. Unzip the file
3. Open `chrome://extensions/` in Chrome
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the unzipped `dist/` folder

### From Source

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/chess-trainer.git
cd chess-trainer

# Install dependencies
npm install

# Build
npm run build

# Load dist/ folder as unpacked extension in Chrome
```

## Usage

1. Go to [chess.com](https://www.chess.com) and start a game
2. Click the extension icon in the toolbar
3. The board view shows:
   - **Live board mirror** with your current position
   - **Blue arrow** indicating Stockfish's best move
   - **Highlighted squares** for the recommended move (from → to)
   - **Win probability bar** and evaluation score
   - **Verdict** (Winning / Equal / Difficult / Losing)
4. Use the tabs to switch between **Board**, **Moves**, and **⚙ Settings**
5. Click ⧉ to pop out into a **floating window**
6. Click ⏸/▶ to pause/resume the engine

## Project Structure

```
extension/
├── manifest.json              # Chrome MV3 manifest
├── tsconfig.json              # TypeScript strict config
├── webpack.config.js          # Build config (ts-loader, 3 entry points)
├── pieces/                    # Chess piece PNG images
├── icons/                     # Extension icons (16, 48, 128px)
├── src/
│   ├── types/
│   │   └── index.ts           # All type definitions
│   ├── utils/
│   │   ├── constants.ts       # Piece styles, board themes, settings
│   │   └── chess.ts           # FEN parsing, score formatting, piece logic
│   ├── services/
│   │   └── stockfish.ts       # Web Worker wrapper for Stockfish UCI
│   ├── hooks/
│   │   ├── useChessState.ts   # Board/moves/FEN state + chrome messaging
│   │   ├── useStockfish.ts    # Engine lifecycle + analysis state
│   │   └── useSettings.ts     # Settings persistence via chrome.storage
│   ├── content/
│   │   └── content.ts         # Injected into chess.com — board reading, FEN generation
│   ├── background/
│   │   └── background.ts      # Service worker — message relay, state storage
│   └── popup/
│       ├── index.tsx           # React entry point
│       ├── App.tsx             # Main app shell — tabs, header
│       ├── App.css             # All styles — responsive, dark theme
│       ├── popup.html          # HTML template
│       └── components/
│           ├── ArrowOverlay.tsx # SVG best-move arrow
│           ├── BoardView.tsx   # Board grid with themes
│           ├── InlineStats.tsx # Win probability bar + verdict
│           ├── MoveList.tsx    # CSS Grid move history
│           └── SettingsPanel.tsx# Piece/theme picker
└── dist/                       # Built extension (load this in Chrome)
```

## Tech Stack

| Component | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| UI | React 18, TypeScript (strict) |
| Engine | Stockfish 18 (WASM, single-threaded lite) |
| Build | Webpack 5, ts-loader |
| Styling | Plain CSS, CSS Grid, SVG |

## How It Works

1. **Content script** (`content.ts`) is injected into chess.com pages
2. A `MutationObserver` watches the `wc-chess-board` custom element for piece movements
3. Board state is converted to a **FEN string** with castling rights inference and en passant detection
4. The **background service worker** relays state between the content script and popup
5. Custom React hooks (`useChessState`, `useStockfish`, `useSettings`) manage all state reactively
6. The popup's **Stockfish Web Worker** analyzes the FEN position at depth 18
7. Results are displayed with an **SVG arrow overlay**, **win probability bar**, and **evaluation score**

## Development

```bash
cd extension

# Development build with source maps
npm run dev

# Watch mode (auto-rebuild on changes)
npm run watch

# Production build
npm run build
```

## Configuration

All settings are accessible from the ⚙ Settings tab:

| Setting | Options | Default |
|---|---|---|
| Piece Style | Images, Solid, Classic, Outlined | Images |
| Board Theme | Green, Blue, Brown, Purple, Gray | Green |

## License

[MIT](LICENSE)
