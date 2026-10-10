import sharp from "sharp";
import { readFile } from "node:fs/promises";
const { title } = JSON.parse(await readFile(new URL("../src/data/site-settings.json", import.meta.url), "utf8"));
const escapedTitle = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

await sharp(new URL("../public/icon.svg", import.meta.url).pathname)
	.resize(512, 512)
	.png()
	.toFile(new URL("../public/icon.png", import.meta.url).pathname);

const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#f5f4ed"/>
<path d="M80 100h1040" stroke="#d9cfb9" stroke-width="2"/>
<text x="80" y="280" fill="#25201b" font-family="serif" font-size="64">${escapedTitle}</text>
</svg>`;
await sharp(Buffer.from(card))
	.png()
	.toFile(new URL("../public/social-card.png", import.meta.url).pathname);
