#!/usr/bin/env node
/**
 * Build script for FetchTML library
 * Generates ESM, IIFE, and minified bundles
 */

import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const builds = [
  {
    name: 'ESM',
    outfile: 'dist/fetchtml.esm.js',
    format: 'esm',
  },
  {
    name: 'IIFE',
    outfile: 'dist/fetchtml.js',
    format: 'iife',
    globalName: 'fetchtml',
  },
  {
    name: 'IIFE (minified)',
    outfile: 'dist/fetchtml.min.js',
    format: 'iife',
    globalName: 'fetchtml',
    minify: true,
    sourcemap: true,
  },
];

async function build() {
  // Ensure dist directory exists
  try {
    await fs.mkdir('dist', { recursive: true });
  } catch (err) {
    // Directory already exists
  }

  console.log('Building FetchTML...\n');

  for (const config of builds) {
    try {
      const result = await esbuild.build({
        entryPoints: ['src/index.js'],
        bundle: true,
        format: config.format,
        globalName: config.globalName,
        outfile: config.outfile,
        minify: config.minify || false,
        sourcemap: config.sourcemap || false,
        target: ['es2015'],
        logLevel: 'info',
      });

      console.log(`✓ ${config.name}: ${config.outfile}`);
    } catch (err) {
      console.error(`✗ ${config.name} failed:`, err);
      process.exit(1);
    }
  }

  console.log('\nBuild complete!');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
