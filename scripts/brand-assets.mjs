import sharp from "sharp";

await sharp(new URL("../public/icon.svg", import.meta.url).pathname)
	.resize(512, 512)
	.png()
	.toFile(new URL("../public/icon.png", import.meta.url).pathname);

const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#f5f4ed"/>
<path d="M80 100h1040" stroke="#d9cfb9" stroke-width="2"/>
<text x="80" y="280" fill="#25201b" font-family="serif" font-size="112">akn20</text>
<text x="84" y="380" fill="#4a4239" font-family="sans-serif" font-size="36">A technical notebook.</text>
<text x="84" y="500" fill="#8a4423" font-family="monospace" font-size="24">Think carefully. Build small. Write it down.</text>
</svg>`;
await sharp(Buffer.from(card))
	.png()
	.toFile(new URL("../public/social-card.png", import.meta.url).pathname);
