// VAPID 키 쌍 생성: node scripts/gen-vapid.cjs
// 출력을 .env 에 붙여넣는다. (DB·파일에는 아무것도 쓰지 않음)
const webpush = require("web-push");

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log("VAPID_SUBJECT=mailto:betays1001@gmail.com");
