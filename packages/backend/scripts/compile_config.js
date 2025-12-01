/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as yaml from 'js-yaml';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const dir = `${_dirname}/../../../.config`;

const configYmlPath = process.env.MISSKEY_CONFIG_YML
	? resolve(dir, process.env.MISSKEY_CONFIG_YML)
	: process.env.NODE_ENV === 'test'
		? resolve(dir, 'test.yml')
		: resolve(dir, 'default.yml');

// Change extension from .yml to .json
const configJsonPath = configYmlPath.replace(/\.yml$/, '.json');

if (!fs.existsSync(configYmlPath)) {
	console.error(`Configuration file not found: ${configYmlPath}`);
	process.exit(1);
}

const yamlContent = fs.readFileSync(configYmlPath, 'utf-8');
const config = yaml.load(yamlContent);
fs.writeFileSync(configJsonPath, JSON.stringify(config, null, '\t'), 'utf-8');

console.log(`Compiled config: ${configYmlPath} -> ${configJsonPath}`);
