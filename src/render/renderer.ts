import * as THREE from 'three';
import { Input } from '../input';
import { MovableCamera } from './camera';

const CHUNK_SZ = 1;     // Side length of a chunk in world units
const VIEW_DIAMETER = 4; // Side length of a "batch" of chunks in number of chunks

const RAYMARCH_MAT = new THREE.ShaderMaterial({
	// TODO actually read these from files
	vertexShader: `
		attribute vec3 pos;

		uniform mat4 projMat;
		uniform mat4 viewMat;

		// x,z after modulo
		varying vec2 bufIdx;

		const float CHUNK_RADIUS = 4.0;

		void main() {
			bufIdx = vec2(pos.x % CHUNK_RADIUS, pos.y % CHUNK_RADIUS);
			gl_Position = projMat * viewMat * vec4(pos, 1.0)
		}
	`,
	fragmentShader: `

	`,
});
const BB_GEOM = new THREE.BoxGeometry(CHUNK_SZ, CHUNK_SZ, CHUNK_SZ);
// const BB_MESH = new THREE.InstancedMesh(BB_GEOM, RAYMARCH_MAT, VIEW_DIAMETER * VIEW_DIAMETER);

const DEBUG_GREEN_MAT = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const DEBUG_CUBE = new THREE.Mesh(BB_GEOM, DEBUG_GREEN_MAT);

export class Renderer {
	webgl = new THREE.WebGLRenderer();
	clock = new THREE.Clock();
	scene = new THREE.Scene();
	input = new Input(this.webgl.domElement);
	camera = new MovableCamera(this.input);
	
	constructor() {
		this.resize();
		this.webgl.setAnimationLoop(() => this.tick());
		document.body.appendChild(this.webgl.domElement);
		document.onresize = this.resize;

		this.input = new Input(this.webgl.domElement);
		this.camera = new MovableCamera(this.input);
		this.input.registerMouseCb(evt => this.camera.tickMouse(evt));
		this.scene.add(DEBUG_CUBE);
	}

	resize() {
		this.webgl.setSize(window.innerWidth, window.innerHeight);
	}

	tick() {
		const dt = this.clock.getDelta();
		this.camera.tick(dt);
		this.webgl.render(this.scene, this.camera.inner);
	}
}
