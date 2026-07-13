import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BG = '#1c1f23';
const CORNER = 0.2;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = `${ROOT}static/logo.svg`;
const OUT = `${ROOT}static/pwa`;
const svg = readFileSync(SRC);
mkdirSync(OUT, { recursive: true });

const background = (size) => {
	const c = Math.round(size * CORNER);
	return Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
			`<path fill="${BG}" fill-rule="evenodd" d="M0 0H${size}V${size}H0Z ` +
			`M0 0H${c}V${c}H0Z M${size - c} ${size - c}H${size}V${size}H${size - c}Z"/></svg>`
	);
};

const render = async (size, file) => {
	const logo = await sharp(svg, { density: 512 })
		.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png()
		.toBuffer();
	await sharp(background(size))
		.composite([{ input: logo }])
		.png()
		.toFile(`${OUT}/${file}`);
};

await Promise.all([
	render(192, 'icon-192.png'),
	render(512, 'icon-512.png'),
	render(180, 'apple-touch-icon.png')
]);
console.log('gen-icons: wrote static/pwa/{icon-192,icon-512,apple-touch-icon}.png');
