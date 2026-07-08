import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: { __UI_VERSION__: JSON.stringify(pkg.version) }
});
