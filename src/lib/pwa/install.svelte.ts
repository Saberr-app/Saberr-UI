type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

class InstallController {
	installed = $state(false);
	dismissed = $state(false);
	#deferred: BIPEvent | null = $state(null);
	#started = false;

	visible = $derived(!this.installed && !this.dismissed && this.#deferred !== null);

	init() {
		if (this.#started || typeof window === 'undefined') return;
		this.#started = true;

		this.dismissed = localStorage.getItem('saberr_pwa_install_dismissed') === '1';
		this.installed =
			window.matchMedia('(display-mode: standalone)').matches ||
			// @ts-expect-error iOS-only Safari flag
			window.navigator.standalone === true;

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.#deferred = e as BIPEvent;
		});
		window.addEventListener('appinstalled', () => {
			this.installed = true;
			this.#deferred = null;
		});
	}

	async install() {
		if (!this.#deferred) return;
		await this.#deferred.prompt();
		await this.#deferred.userChoice;
		this.#deferred = null;
	}

	dismiss() {
		this.dismissed = true;
		localStorage.setItem('saberr_pwa_install_dismissed', '1');
	}
}

export const install = new InstallController();
