// Generate simple chess icon PNGs using canvas
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Chess piece (knight symbol)
  ctx.fillStyle = "#e94560";
  ctx.font = `${size * 0.6}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♞", size / 2, size / 2 + size * 0.03);

  const buf = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(__dirname, "icons", `icon${size}.png`), buf);
  console.log(`Created icon${size}.png`);
}

[16, 48, 128].forEach(generateIcon);
