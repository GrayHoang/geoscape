type MouseCallback = (evt: PointerEvent) => void;

export class Input {
	#pressed: Map<string, boolean> = new Map();
	#mouseCbs: MouseCallback[] = [];

	constructor(canvas: HTMLCanvasElement) {
		canvas.onpointerdown = evt => {
			canvas.onpointermove = evt => this.#mouseCbs.forEach(f => f(evt));
			canvas.setPointerCapture(evt.pointerId);
		};
		canvas.onpointerup = evt => {
			canvas.onpointermove = null;
			canvas.releasePointerCapture(evt.pointerId);
		};

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

	registerMouseCb(f: MouseCallback) {
		this.#mouseCbs.push(f);
	}
}
