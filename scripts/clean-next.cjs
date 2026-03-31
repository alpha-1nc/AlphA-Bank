/**
 * 깨진 .next(webpack 청크 불일치 → Cannot find module './NNN.js') 방지용.
 * `npm run dev` 전 predev에서 실행됩니다.
 */
const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");
try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
  }
} catch {
  process.exit(0);
}
