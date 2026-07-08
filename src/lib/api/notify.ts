/* =============================================================================
 * SABERR TOASTS — thin svelte-sonner wrapper; nothing else imports the toast lib.
 * ========================================================================== */

import { toast } from 'svelte-sonner';

export function notifyError(message: string): void {
	toast.error(message);
}

export function notifySuccess(message: string): void {
	toast.success(message);
}

export function notifyInfo(message: string): void {
	toast(message);
}
