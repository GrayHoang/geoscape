import * as THREE from 'three';
import type { Input } from './input';

const UP_VEC = new THREE.Vector3(0.0, 1.0, 0.0);

export class MovableCamera {
	inner: THREE.PerspectiveCamera;
	#dir = new THREE.Vector3();
	#dirRight = new THREE.Vector3();
	#input: Input;

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

		document.addEventListener('resize', _ => {
			this.inner.aspect = window.innerWidth / window.innerHeight;
			this.inner.updateProjectionMatrix();
		});
	}

	move(v: THREE.Vector3, scale: number) {
		this.inner.position.x += v.x * scale;
		this.inner.position.y += v.y * scale;
		this.inner.position.z += v.z * scale;
	}

	tick(dt: number) {
		if (this.#input.isPressed('KeyW')) {
			this.move(this.#dir, dt);
		}
		if (this.#input.isPressed('KeyA')) {
			this.move(this.#dirRight, dt);
		}
		if (this.#input.isPressed('KeyS')) {
			this.move(this.#dir, -dt);
		}
		if (this.#input.isPressed('KeyD')) {
			this.move(this.#dirRight, -dt);
		}
		if (this.#input.isPressed('Space')) {
			this.move(UP_VEC, dt);
		}
		if (this.#input.isPressed('LeftShift')) {
			this.move(UP_VEC, -dt);
		}
		this.updateView();
	}

	updateView() {
		this.inner.updateMatrix();
		this.inner.getWorldDirection(this.#dir);
		this.#dirRight.x = UP_VEC.x;
		this.#dirRight.y = UP_VEC.y;
		this.#dirRight.z = UP_VEC.z;
		this.#dirRight.cross(this.#dir);
		console.log(this.#dirRight);
	};
}
