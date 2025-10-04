import * as THREE from 'three';
import type { Input } from './input';

const UP_VEC = new THREE.Vector3(0.0, 1.0, 0.0);
const ROT_SPEED = 0.1;
const MOVE_SPEED = 1.0;

export class MovableCamera {
	inner: THREE.PerspectiveCamera;
	#dir = new THREE.Vector3();
	#dirR = new THREE.Vector3();
	#input: Input;
	#lastDt: number;

	constructor(input: Input) {
		this.inner = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			2000
		);
		this.inner.getWorldDirection(this.#dir);
		this.inner.position.z = 5;
		this.#input = input;
		this.#lastDt = 0.0;

		document.addEventListener('resize', _ => {
			this.inner.aspect = window.innerWidth / window.innerHeight;
			this.inner.updateProjectionMatrix();
		});
	}

	#move(v: THREE.Vector3, scale: number) {
		this.inner.position.x += v.x * MOVE_SPEED * scale;
		this.inner.position.y += v.y * MOVE_SPEED * scale;
		this.inner.position.z += v.z * MOVE_SPEED * scale;
	}

	#updateView() {
		this.inner.updateMatrix();
		this.inner.getWorldDirection(this.#dir);
		this.#dirR.x = UP_VEC.x;
		this.#dirR.y = UP_VEC.y;
		this.#dirR.z = UP_VEC.z;
		this.#dirR.cross(this.#dir);
	};

	// we use a handler instead of the centralized input system due to less stutter
	tickMouse(evt: PointerEvent) {
		// rotate around the y axis, which is left/right rotation
		this.inner.rotateY(evt.movementX * ROT_SPEED * this.#lastDt);
		this.inner.rotateX(evt.movementY * ROT_SPEED * this.#lastDt);
		// TODO: fix janky rolling, it should only be pitch and yaw
	}

	tick(dt: number) {
		this.#lastDt = dt;
		if (this.#input.isPressed('KeyW')) {
			this.#move(this.#dir, dt);
		}
		if (this.#input.isPressed('KeyA')) {
			this.#move(this.#dirR, dt);
		}
		if (this.#input.isPressed('KeyS')) {
			this.#move(this.#dir, -dt);
		}
		if (this.#input.isPressed('KeyD')) {
			this.#move(this.#dirR, -dt);
		}
		if (this.#input.isPressed('Space')) {
			this.#move(UP_VEC, dt);
		}
		if (this.#input.isPressed('LeftShift')) {
			this.#move(UP_VEC, -dt);
		}
		this.#updateView();
	}
}
