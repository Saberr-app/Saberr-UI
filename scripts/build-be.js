/* =============================================================================
 * build-be — backend-hosted build
 * -----------------------------------------------------------------------------
 * Same as `npm run build`, but:
 *   1. emits to `build_be/` (instead of `build/`), and
 *   2. forces VITE_API_BASE_URL empty so every API / asset call resolves
 *      against the frontend's own origin (the backend serves this SPA itself).
 *
 * ========================================================================== */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

console.log('build-be: building into build_be/ with an empty API base URL …');
execSync('npx vite build', {
	cwd: ROOT,
	stdio: 'inherit',
	env: { ...process.env, BUILD_DIR: 'build_be', VITE_API_BASE_URL: '' }
});
console.log('build-be: done. Backend-hosted bundle in build_be/.');
