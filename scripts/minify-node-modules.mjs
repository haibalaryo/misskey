/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * This script minifies JavaScript files in node_modules to reduce memory usage.
 * V8 keeps script source code in memory, so minifying reduces memory consumption.
 *
 * Usage:
 *   node scripts/minify-node-modules.mjs
 *
 * Environment variables:
 *   MISSKEY_MINIFY_NODE_MODULES - Set to 'true' to enable minification (default: true in production)
 *   NODE_ENV - When set to 'development', minification is skipped
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import glob from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configuration constants
const BATCH_SIZE = 100;
const MIN_FILE_SIZE_BYTES = 50;

/** @type {import('esbuild').TransformOptions} */
const esbuildOptions = {
	loader: 'js',
	minifyWhitespace: true,
	// Keep identifiers to preserve compatibility with reflection-based code
	minifyIdentifiers: false,
	minifySyntax: false,
};

// Skip minification in development mode unless explicitly enabled
const isDevelopment = process.env.NODE_ENV === 'development';
const shouldMinify = process.env.MISSKEY_MINIFY_NODE_MODULES === 'true' ||
	(process.env.MISSKEY_MINIFY_NODE_MODULES !== 'false' && !isDevelopment);

if (!shouldMinify) {
	console.log('Skipping node_modules minification (development mode or disabled via MISSKEY_MINIFY_NODE_MODULES=false)');
	process.exit(0);
}

console.log('Minifying node_modules JavaScript files...');

const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');

// Check if pnpm directory exists
try {
	await fs.access(pnpmDir);
} catch {
	console.log('No pnpm node_modules found, skipping minification');
	process.exit(0);
}

// Find all JavaScript files in node_modules/.pnpm
// Use followSymbolicLinks: false to avoid following symlinks to workspace packages
const jsFiles = await glob('**/*.js', {
	cwd: pnpmDir,
	absolute: true,
	followSymbolicLinks: false,
	ignore: [
		// Ignore already minified files
		'**/*.min.js',
		// Ignore source maps
		'**/*.js.map',
		// Ignore TypeScript declaration files that might be named .js
		'**/*.d.js',
		// Ignore workspace package symlinks
		'node_modules/backend/**',
		'node_modules/frontend/**',
		'node_modules/frontend-embed/**',
		'node_modules/frontend-shared/**',
		'node_modules/frontend-builder/**',
		'node_modules/icons-subsetter/**',
		'node_modules/sw/**',
		'node_modules/misskey-js/**',
		'node_modules/misskey-js-type-generator/**',
		'node_modules/misskey-reversi/**',
		'node_modules/misskey-bubble-game/**',
	],
});

console.log(`Found ${jsFiles.length} JavaScript files to minify`);

// Process files in parallel batches for efficiency
let processed = 0;
let errors = 0;

for (let i = 0; i < jsFiles.length; i += BATCH_SIZE) {
	const batch = jsFiles.slice(i, i + BATCH_SIZE);

	await Promise.all(batch.map(async (filePath) => {
		try {
			const content = await fs.readFile(filePath, 'utf-8');

			// Skip empty files or very small files (likely not worth minifying)
			if (content.length < MIN_FILE_SIZE_BYTES) {
				processed++;
				return;
			}

			const result = await esbuild.transform(content, esbuildOptions);

			await fs.writeFile(filePath, result.code);
			processed++;
		} catch (err) {
			// Some files may have syntax that esbuild doesn't handle well, skip them
			errors++;
			if (process.env.DEBUG) {
				console.error(`Failed to minify ${filePath}: ${err.message}`);
			}
		}
	}));

	// Progress update every 10 batches
	if ((i / BATCH_SIZE) % 10 === 0) {
		console.log(`Progress: ${processed}/${jsFiles.length} files processed...`);
	}
}

console.log(`Minification complete: ${processed} files processed, ${errors} files skipped due to errors`);
