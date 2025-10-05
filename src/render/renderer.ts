import * as THREE from 'three';
import { Input } from '../input';
import { MovableCamera } from './camera';
import { ChunkManager } from '../core/chunkManager';

const VIEW_DIAMETER = 5; // Side length of the visible x-z rectangle of chunks
const CHUNK_SIZE = 32;   // Side length of a chunk in pixels?

let chunks: ChunkManager = new ChunkManager(VIEW_DIAMETER, CHUNK_SIZE);

const RAYMARCH_MAT = new THREE.ShaderMaterial({
	// TODO actually read these from files
	uniforms: {
		scrSize: new THREE.Uniform(new THREE.Vector2()),
	},
	vertexShader: `
		attribute vec4 transforms;

		// x,z after modulo
		varying vec2 bufIdx;
		varying vec3 localPos;
		varying mat4 invProjMat;
		varying mat4 invViewMat;

		const uint VIEW_DIAMETER = 5u;

		void main() {
			vec3 posPre = position + vec3(0.5);

			vec3 pos = posPre;
			pos.xz += transforms.xz;
			pos.y = (pos.y) * transforms.w + transforms.y;

			localPos = posPre;
			localPos.xz = posPre.xz;
			localPos.y = (posPre.y) * transforms.w;

			gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

			// localPos.xz = posPre.xz;
			// localPos.y = pos.y;
			bufIdx.x = float(uint(pos.x) % VIEW_DIAMETER);
			bufIdx.y = float(uint(pos.z) % VIEW_DIAMETER);

			invProjMat = inverse(projectionMatrix);
			invViewMat = inverse(modelViewMatrix);
		}
	`,
	fragmentShader: `
		uniform vec2 scrSize;

		varying vec2 bufIdx;
		varying vec3 localPos;
		varying mat4 invProjMat;
		varying mat4 invViewMat;

		struct Ray {
			vec3 pos;
			vec3 dir;
		};

		// pos's value is undefined when hit is false
		struct Hit {
			bool hit;
			ivec3 pos;
			uint steps;
		};

		Ray getPrimaryRay() {
			vec2 uv = (gl_FragCoord.xy / scrSize) * 2.0 - 1.0;
			vec4 targ = invProjMat * vec4(uv, 1.0, 1.0);
			vec4 dir = invViewMat * vec4(normalize(targ.xyz / targ.w), 0.0);
			return Ray(localPos, dir.xyz);
		}

		void main() {
			// gl_FragColor = vec4(localPos, 1.0);
			gl_FragColor = vec4(getPrimaryRay().dir, 1.0);
		}
	`,
});
const BB_GEOM = new THREE.BoxGeometry(1, 1, 1);
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
		// ISSUE: when the base instance is outside the view frustum, the other instances also disappear. i don't think we can fix this, so just disable frustum culling entirely
		this.instance.frustumCulled = false;
		this.scene.add(this.instance);

		for (let i = 0; i < VIEW_DIAMETER * VIEW_DIAMETER; i++) {
            let x = i % VIEW_DIAMETER;
            let z = Math.floor(i/VIEW_DIAMETER);
			this.bbTransforms[i * 4 + 0] = x;
			this.bbTransforms[i * 4 + 1] = chunks.getMinY(x,z); // y min
			this.bbTransforms[i * 4 + 2] = z;
			this.bbTransforms[i * 4 + 3] = chunks.getHeight(x,z); // height
		}

		BB_GEOM.setAttribute(
			'transforms',
			new THREE.InstancedBufferAttribute(this.bbTransforms, 4),
		);
	}

	resize() {
		this.webgl.setSize(window.innerWidth, window.innerHeight);
		this.instance.material.uniforms.scrSize.value = new THREE.Vector2(
			window.innerWidth,
			window.innerHeight
		);
	}

	tick() {
		const dt = this.clock.getDelta();
		this.camera.tick(dt);
		this.webgl.render(this.scene, this.camera.inner);
	}
}
