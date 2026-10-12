// 아이콘을 다시 만들려면 npm i -D sharp 후 node scripts/gen-icons.mjs
// 원본: public/logo-symbol.svg (1098x894, 심볼만, 자체 여백 0 → 심볼이 캔버스를 꽉 채움).
// 긴 변(가로)이 캔버스의 ratio 가 되도록 줄여 가운데 배치. 원본보다 키우지 않는다.
// 전부 흰색(#FFFFFF) 불투명 PNG(알파 없음). 모서리는 깎지 않는다(iOS/안드로이드가 마스킹).
import sharp from "sharp";

const SRC = "public/logo-symbol.svg";
const targets = [
  ["public/apple-icon.png", 180, 0.72],
  ["public/icon-192.png", 192, 0.72],
  ["public/icon-512.png", 512, 0.72],
  ["public/icon-maskable-512.png", 512, 0.6],
  ["public/favicon-32x32.png", 32, 0.84],
  ["public/favicon-16x16.png", 16, 0.84],
];

for (const [out, size, ratio] of targets) {
  const inner = Math.round(size * ratio);
  const symbol = await sharp(SRC, { density: 72 }) // 원본 해상도(1098px)로 래스터화
    .resize({ width: inner, withoutEnlargement: true })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: symbol, gravity: "center" }])
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .png()
    .toFile(out);
}
