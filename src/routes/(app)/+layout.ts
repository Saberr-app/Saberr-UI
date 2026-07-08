import { redirect } from '@sveltejs/kit';
import { isAuthed } from '$lib/stores/auth';

// Route guard for the whole dashboard: no token -> go to login.
// Runs in the browser (SPA), so localStorage is available.
export function load() {
	if (!isAuthed()) {
		redirect(307, '/login');
	}
}
