import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { build } from 'esbuild';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);
const _package = JSON.parse(fs.readFileSync(_dirname + '/package.json', 'utf-8'));

/** @type {import('esbuild').BuildOptions} */
const options = {
	entryPoints: ['./src/boot/entry.ts'],
	//minify: process.env.NODE_ENV === 'production',
	minify: false,
	bundle: true,
	outdir: './built',
	target: 'node22',
	platform: 'node',
	format: 'esm',
	sourcemap: false,
	banner: {
		js: 'import { createRequire as topLevelCreateRequire } from "module"; import ___url___ from "url"; const require = topLevelCreateRequire(import.meta.url); const __filename = ___url___.fileURLToPath(import.meta.url); const __dirname = ___url___.fileURLToPath(new URL(".", import.meta.url));',
	},
	external: [
		'*.node',
		'*.html',
		'class-transformer',
		'class-validator',
		'@sentry/*',
		'@nestjs/websockets/socket-module',
		'@nestjs/microservices/microservices-module',
		'@nestjs/microservices',
		'@napi-rs/canvas-win32-x64-msvc',
		'slacc-win32-x64-msvc',
		'mock-aws-s3',
		'aws-sdk',
		'nock',
		'sharp',
		'jsdom',
		're2',
		'@napi-rs/canvas',
	],
};

const args = process.argv.slice(2).map(arg => arg.toLowerCase());

if (!args.includes('--no-clean')) {
	fs.rmSync('./built', { recursive: true, force: true });
}

await buildSrc();

async function buildSrc() {
	console.log(`[${_package.name}] start building...`);

	await build(options)
		.then(() => {
			console.log(`[${_package.name}] build succeeded.`);
		})
		.catch((err) => {
			process.stderr.write(err.stderr);
			process.exit(1);
		});

	console.log(`[${_package.name}] finish building.`);
}
