// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/** Injected by Vite `define` (see config/version.ts). */
	const __UI_VERSION__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
