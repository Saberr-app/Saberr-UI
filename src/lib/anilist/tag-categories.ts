/* =============================================================================
 * SABERR ANILIST TAG CATEGORIES — known categories in display order + label transform
 * (first hyphen → " / "). Unknown categories sort after the known ones, alphabetically.
 * ========================================================================== */

export const TAG_CATEGORY_ORDER: string[] = [
	'Cast-Main Cast',
	'Cast-Traits',
	'Demographic',
	'Setting-Scene',
	'Setting-Time',
	'Setting-Universe',
	'Technical',
	'Theme-Action',
	'Theme-Arts',
	'Theme-Arts-Music',
	'Theme-Comedy',
	'Theme-Drama',
	'Theme-Fantasy',
	'Theme-Game',
	'Theme-Game-Card & Board Game',
	'Theme-Game-Sport',
	'Theme-Other',
	'Theme-Other-Organisations',
	'Theme-Other-Vehicle',
	'Theme-Romance',
	'Theme-Sci-Fi',
	'Theme-Sci-Fi-Mecha',
	'Theme-Slice of Life',
	'Sexual Content'
];

/** Display label for a tag category: first hyphen → " / ". */
export const categoryLabel = (category: string): string => category.replace('-', ' / ');

/** Sort comparator placing known categories in their fixed order, others after. */
export function compareCategories(a: string, b: string): number {
	const ia = TAG_CATEGORY_ORDER.indexOf(a);
	const ib = TAG_CATEGORY_ORDER.indexOf(b);
	if (ia !== -1 && ib !== -1) return ia - ib;
	if (ia !== -1) return -1;
	if (ib !== -1) return 1;
	return a.localeCompare(b);
}
