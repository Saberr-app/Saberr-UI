import { redirect } from '@sveltejs/kit';

// "/" always lands on Tracked Anime.
export function load() {
	redirect(307, '/tracked');
}
