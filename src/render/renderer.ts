import * as THREE from 'three';
import { Input } from '../input';
import { MovableCamera } from './camera';

const CHUNK_SZ = 16; // Side length of a chunk in world units
const BATCH_SZ = 4;  // Side length of a "batch" of chunks in number of chunks

const RAYMARCH_MAT = new THREE.ShaderMaterial({
	// TODO
	// vertexShader = ,
});
const BB_GEOM = new THREE.BoxGeometry(CHUNK_SZ, CHUNK_SZ, CHUNK_SZ);
const BB_MESH = new THREE.InstancedMesh(BB_GEOM, RAYMARCH_MAT, BATCH_SZ * BATCH_SZ);

export class Renderer {
	#webgl = new THREE.WebGLRenderer();
	#clock = new THREE.Clock();
	#scene = new THREE.Scene();
	#input = new Input(this.#webgl.domElement);
	#camera = new MovableCamera(this.#input);
	
	constructor() {
		this.#resize();
		this.#webgl.setAnimationLoop(this.#tick);
		this.#input.registerMouseCb(this.#camera.tickMouse);
		document.onresize = this.#resize;
	}

	#resize() {
		this.#webgl.setSize(window.innerWidth, window.innerHeight);
	}

	#tick() {
		const dt = this.#clock.getDelta();
		this.#camera.tick(dt);
		this.#webgl.render(this.#scene, this.#camera.inner);
	}
}
