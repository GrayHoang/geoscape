import * as THREE from 'three';
import { Input } from '../input';
import { MovableCamera } from './camera';
import { ChunkManager } from '../core/chunkManager';

const VIEW_DIAMETER = 5; // Side length of the visible x-z rectangle of chunks
const CHUNK_SIZE = 32;   // Side length of a chunk in pixels?
const HEIGHTMAP_SIZE = VIEW_DIAMETER*CHUNK_SIZE; // in pixels

export class Renderer {
	webgl = new THREE.WebGLRenderer();
	clock = new THREE.Clock();
	scene = new THREE.Scene();
	input = new Input(this.webgl.domElement);
	camera = new MovableCamera(this.input);

	bbTransforms = new Float32Array(VIEW_DIAMETER**2 * 4);

	chunks = new ChunkManager(VIEW_DIAMETER, CHUNK_SIZE);
	heightmapData = new Float32Array(HEIGHTMAP_SIZE**2);
	heightmap = new THREE.DataTexture(
		this.heightmapData,
		HEIGHTMAP_SIZE,
		HEIGHTMAP_SIZE,
		THREE.RedFormat,
		THREE.FloatType,
	);
	material = new THREE.ShaderMaterial({
		// should actually read these from files, but we have no time
		uniforms: {
			scrSize: new THREE.Uniform(new THREE.Vector2()),
			heightmap: { value: this.heightmap },
		},
		vertexShader: `
			attribute vec4 transforms;

			// x,z after modulo
			flat varying vec2 bufIdx;
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
				bufIdx.x = float(uint(transforms.x) % VIEW_DIAMETER);
				bufIdx.y = float(uint(transforms.z) % VIEW_DIAMETER);

				invProjMat = inverse(projectionMatrix);
				invViewMat = inverse(modelViewMatrix);
			}
		`,
		fragmentShader: `
			uniform vec2 scrSize;
			uniform sampler2D heightmap;

			flat varying vec2 bufIdx;
			varying vec3 localPos;
			varying mat4 invProjMat;
			varying mat4 invViewMat;

			const float chunkSize = 5.0;

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
				// TODO
				// gl_FragColor = vec4(bufIdx / 5.0, 1.0, 1.0);
				// gl_FragColor = vec4(localPos, 1.0);
				// gl_FragColor = vec4(getPrimaryRay().dir, 1.0);
				vec2 uv = gl_FragCoord.xy / scrSize;
				uv += bufIdx;
				uv /= chunkSize;
				gl_FragColor = vec4(vec3(texture(heightmap, uv).r - 2.0), 1.0);

// Ray ray = getPrimaryRay();
// 	vec3 ro = ray.pos;
// 	vec3 rd = normalize(ray.dir);
//
// 	// Clamp ray direction so it doesn't break DDA
// 	if (abs(rd.x) < 1e-6) rd.x = 1e-6;
// 	if (abs(rd.z) < 1e-6) rd.z = 1e-6;
//
// 	// Heightmap UV scaling
// 	float mapSize = float(${HEIGHTMAP_SIZE}); // or pass as uniform
//
// 	// Current grid cell
// 	ivec2 cell = ivec2(floor(ro.x), floor(ro.z));
//
// 	// Step direction for x,z
// 	ivec2 step;
// 	step.x = rd.x > 0.0 ? 1 : -1;
// 	step.y = rd.z > 0.0 ? 1 : -1;
//
// 	// Compute initial tMax and tDelta for DDA
// 	vec2 tMax;
// 	vec2 tDelta;
//
// 	vec2 cellBorder = (vec2(cell) + vec2(step)) * 1.0;
// 	tMax.x = (cellBorder.x - ro.x) / rd.x;
// 	tMax.y = (cellBorder.y - ro.z) / rd.z;
//
// 	tDelta.x = 1.0 / abs(rd.x);
// 	tDelta.y = 1.0 / abs(rd.z);
//
// 	bool hit = false;
// 	uint steps = 0u;
// 	const uint MAX_STEPS = 512u; // safety
//
// 	for (uint i = 0u; i < MAX_STEPS; i++) {
// 		steps++;
//
// 		// Sample height at this cell
// 		vec2 uv = (vec2(cell) + 0.5) / mapSize;
// 		float h = texture(heightmap, uv).r;
//
// 		// Compute current point along ray at *bottom of this cell crossing*
// 		float t = min(tMax.x, tMax.y);
// 		vec3 p = ro + rd * t;
//
// 		// If ray is below terrain height at this cell => hit
// 		if (p.y <= h) {
// 			hit = true;
// 			break;
// 		}
//
// 		// Step to next cell along DDA
// 		if (tMax.x < tMax.y) {
// 			tMax.x += tDelta.x;
// 			cell.x += step.x;
// 		} else {
// 			tMax.y += tDelta.y;
// 			cell.y += step.y;
// 		}
// 	}
//
// 	if (hit) {
// 		// visualize steps — normalize a bit
// 		gl_FragColor = vec4(vec3(float(steps) / float(MAX_STEPS)) * 2.0, 1.0);
// 	} else {
// 		// gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
// discard;
// 	}
			}
		`,
	})
	bbGeom = new THREE.BoxGeometry(1, 1, 1);
	instance = new THREE.InstancedMesh(this.bbGeom, this.material, VIEW_DIAMETER**2);
	
	constructor() {
		this.resize();
		this.webgl.setAnimationLoop(() => this.tick());
		document.body.appendChild(this.webgl.domElement);
		document.onresize = this.resize;

		this.input = new Input(this.webgl.domElement);
		this.camera = new MovableCamera(this.input);
		this.input.registerMouseCb(evt => this.camera.tickMouse(evt));

		this.heightmap.needsUpdate = true;
		this.heightmap.minFilter = THREE.NearestFilter;
		this.heightmap.magFilter = THREE.NearestFilter;
		this.heightmap.wrapS = THREE.ClampToEdgeWrapping;
		this.heightmap.wrapT = THREE.ClampToEdgeWrapping;

		this.instance.instanceMatrix.setUsage(THREE.StaticDrawUsage);
		// ISSUE: when the base instance is outside the view frustum, the other instances also disappear. i don't think we can fix this, so just disable frustum culling entirely
		this.instance.frustumCulled = false;
		this.scene.add(this.instance);

		// METHOD 2:
		// const gl = this.webgl.getContext();
		// const props = this.webgl.properties.get(this.heightmap);
		// const heightmapTex = props.__webglTexture;
		// gl.bindTexture(gl.TEXTURE_2D, heightmapTex);
		for (let i = 0; i < VIEW_DIAMETER * VIEW_DIAMETER; i++) {
			let x = i % VIEW_DIAMETER;
			let z = Math.floor(i/VIEW_DIAMETER);
			this.bbTransforms[i * 4 + 0] = x;
			this.bbTransforms[i * 4 + 1] = this.chunks.getMinY(x,z); // y min
			this.bbTransforms[i * 4 + 2] = z;
			this.bbTransforms[i * 4 + 3] = this.chunks.getBBHeight(x,z); // height
			// METHOD 1:
			this.updateRegion(x, z);

			// METHOD 2:
			// gl.texSubImage2D(
			// 	gl.TEXTURE_2D, 0,
			// 	x, z, CHUNK_SIZE, CHUNK_SIZE,
			// 	gl.RGBA, gl.FLOAT,
			// 	this.chunks.getChunkData(x,z),
			// );
		}
		// METHOD 2:
		// gl.bindTexture(gl.TEXTURE_2D, null);

		this.bbGeom.setAttribute(
			'transforms',
			new THREE.InstancedBufferAttribute(this.bbTransforms, 4),
		);
	}

	private updateRegion(x: number, z: number) {
		const patch = Renderer.createChunkPatchTex(this.chunks.getChunkData(x, z));
		const ofs = new THREE.Vector2(x * CHUNK_SIZE, z * CHUNK_SIZE);
		this.webgl.copyTextureToTexture(patch, this.heightmap, null, ofs);
	}

	private static createChunkPatchTex(chunk: Float32Array): THREE.DataTexture {
		const patch = new THREE.DataTexture(
			chunk,
			CHUNK_SIZE,
			CHUNK_SIZE,
			THREE.RedFormat,
			THREE.FloatType,
		);
		patch.needsUpdate = true;
		return patch;
	}

	private resize() {
		this.webgl.setSize(window.innerWidth, window.innerHeight);
		this.instance.material.uniforms.scrSize.value = new THREE.Vector2(
			window.innerWidth,
			window.innerHeight
		);
	}

	private tick() {
		const dt = this.clock.getDelta();
		this.camera.tick(dt);
		this.webgl.render(this.scene, this.camera.inner);
	}
}
