import * as THREE from 'three';
import { Input } from '../input';
import { MovableCamera } from './camera';

const CHUNK_SZ = 1;     // Side length of a chunk in world units
const VIEW_DIAMETER = 5; // Side length of a "batch" of chunks in number of chunks

const RAYMARCH_MAT = new THREE.ShaderMaterial({
	// TODO actually read these from files
	vertexShader: `
		attribute vec4 transforms;

		// x,z after modulo
		varying vec2 bufIdx;

		const float CHUNK_RADIUS = 4.0;

		void main() {
			// bufIdx = vec2(pos.x % CHUNK_RADIUS, pos.y % CHUNK_RADIUS);
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x + transforms.x, (position.y + 0.5) * transforms.w + transforms.y - 0.5, position.z + transforms.z, 1.0);
		}
	`,
	fragmentShader: `
		varying vec2 bufIdx;
		void main() {
			gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
		}
	`,
});
const BB_GEOM = new THREE.BoxGeometry(CHUNK_SZ, CHUNK_SZ, CHUNK_SZ);
const DEBUG_GREEN = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const DEBUG_STD = new THREE.MeshStandardMaterial();

export class Renderer {
	webgl = new THREE.WebGLRenderer();
	clock = new THREE.Clock();
	scene = new THREE.Scene();
	input = new Input(this.webgl.domElement);
	camera = new MovableCamera(this.input);

	bbTransforms = new Float32Array(VIEW_DIAMETER * VIEW_DIAMETER * 4);

	instance = new THREE.InstancedMesh(BB_GEOM, RAYMARCH_MAT, VIEW_DIAMETER * VIEW_DIAMETER);
	
	constructor() {
		this.resize();
		this.webgl.setAnimationLoop(() => this.tick());
		document.body.appendChild(this.webgl.domElement);
		document.onresize = this.resize;

		this.input = new Input(this.webgl.domElement);
		this.camera = new MovableCamera(this.input);
		this.input.registerMouseCb(evt => this.camera.tickMouse(evt));

		this.instance.instanceMatrix.setUsage(THREE.StaticDrawUsage);
		this.scene.add(this.instance);

		for (let i = 0; i < VIEW_DIAMETER * VIEW_DIAMETER; i++) {
			this.bbTransforms[i * 4 + 0] = i % VIEW_DIAMETER;
			this.bbTransforms[i * 4 + 1] = 0; // y min
			this.bbTransforms[i * 4 + 2] = Math.floor(i / VIEW_DIAMETER);
			this.bbTransforms[i * 4 + 3] = (i + 1) * 0.1; // height
		}

		BB_GEOM.setAttribute(
			'transforms',
			new THREE.InstancedBufferAttribute(this.bbTransforms, 4),
		);
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
