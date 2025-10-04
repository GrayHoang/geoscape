export class Input {
	#pressed: Map<string, boolean>;

	constructor() {
		this.#pressed = new Map();

		document.addEventListener('keydown', evt => {
			this.#pressed.set(evt.code, true);
		});
		document.addEventListener('keyup', evt => {
			this.#pressed.delete(evt.code);
		});
	}

	isPressed(key: string): boolean {
		return this.#pressed.get(key) ?? false;
	}
}
