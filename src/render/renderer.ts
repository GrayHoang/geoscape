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
			varying float chunkMinY;
			varying float chunkMaxY;
			varying vec3 localPos;
			varying mat4 invProjMat;
			varying mat4 invViewMat;

			const uint VIEW_DIAMETER = 5u;

			void main() {
				vec3 posPre = position + vec3(0.5);

				vec3 pos = posPre;
				pos.xz += transforms.xz;
				pos.y = (pos.y) * transforms.w + transforms.y;

				chunkMinY = transforms.y;
				chunkMaxY = transforms.y + transforms.w;

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
			varying float chunkMinY;
			varying float chunkMaxY;
			varying vec3 localPos;
			varying mat4 invProjMat;
			varying mat4 invViewMat;

			const float viewDiameter = 5.0;

			struct Ray {
				vec3 pos;
				vec3 dir;
			};

			// pos's value is undefined when hit is false
			struct Hit {
				bool hit;
				vec3 pos;
				uint steps;
			};

			Ray getPrimaryRay() {
				vec2 uv = (gl_FragCoord.xy / scrSize) * 2.0 - 1.0;
				vec4 targ = invProjMat * vec4(uv, 1.0, 1.0);
				vec4 dir = invViewMat * vec4(normalize(targ.xyz / targ.w), 0.0);
				return Ray(localPos, normalize(dir.xyz));
			}

			bool outOfChunk(vec3 pos) {
				return pos.x < 0.0
						|| pos.x > 1.0
						|| pos.z < 0.0
						|| pos.z > 1.0
						|| pos.y < chunkMinY
						|| pos.y > chunkMaxY;
			}

			// xz between zero and one, representing pos in chunk
			float getHeight(vec2 xz) {
				xz += bufIdx;
				xz /= viewDiameter;
				return texture(heightmap, xz).r;
			}

			bool sampleHeight(vec3 pos) {
				float y = pos.y;
				vec2 uv = (floor(pos.xz * 32.0) + 0.5) / 32.0;
				uv += bufIdx;
				uv /= viewDiameter;
				float height = texture(heightmap, uv).r;
				return height > y + 1e-4;
			}

Hit marchXZ(Ray primary) {
    vec3 P = primary.pos;
    vec3 D = primary.dir;

    // Project ray onto XZ plane
    vec2 pos2 = P.xz;
    vec2 dir2 = D.xz;

    // Handle rays with near-zero XZ direction (straight up/down)
    if (abs(dir2.x) < 1e-8 && abs(dir2.y) < 1e-8) {
        return Hit(false, vec3(0.0), 0u);
    }

    vec2 invDir2 = 1.0 / max(abs(dir2), vec2(1e-8));
    vec2 step2 = sign(dir2);

    vec2 voxelPos2 = pos2 * 32.0;
    vec2 voxelBase2 = floor(voxelPos2);
    vec2 voxelFrac2 = voxelPos2 - voxelBase2;

    vec2 tDelta2 = invDir2 / 32.0;
    vec2 tMax2;
    tMax2.x = (step2.x > 0.0 ? 1.0 - voxelFrac2.x : voxelFrac2.x) * invDir2.x / 32.0;
    tMax2.y = (step2.y > 0.0 ? 1.0 - voxelFrac2.y : voxelFrac2.y) * invDir2.y / 32.0;

    float t = 0.0;

    for (uint i = 0u; i < 128u; i++) { // 128 is safe for a 32×32 grid
        // Compute current world-space position
        vec3 currPos = P + t * D;

        if (outOfChunk(currPos)) break;

        // Sample height at XZ
        float h = getHeight(currPos.xz);

        // Check if ray is below terrain at this point
        if (currPos.y <= h + 1e-4) { // epsilon to avoid flicker
            return Hit(true, currPos, i);
        }

        // Step to next voxel boundary in X or Z
        if (tMax2.x < tMax2.y) {
            t = tMax2.x;
            tMax2.x += tDelta2.x;
        } else {
            t = tMax2.y;
            tMax2.y += tDelta2.y;
        }
    }

    return Hit(false, vec3(0.0), 0u);
}

			Hit march(Ray primary) {
				vec3 P = primary.pos;
				vec3 D = primary.dir;

				vec3 voxelFrac = fract(P * 32.0);

				vec3 invD = 1.0 / max(abs(D), vec3(1e-8));
				vec3 tDelta = invD / 32.0;
				vec3 stepDir = sign(D);

				vec3 tMax;
				tMax.x = (stepDir.x > 0.0 ? 1.0 - voxelFrac.x : voxelFrac.x) * invD.x / 32.0;
				tMax.y = (stepDir.y > 0.0 ? 1.0 - voxelFrac.y : voxelFrac.y) * invD.y / 32.0;
				tMax.z = (stepDir.z > 0.0 ? 1.0 - voxelFrac.z : voxelFrac.z) * invD.z / 32.0;

				for (uint i = 0u; i < max(64u, uint(chunkMaxY * 32.0) + 64u); i++) {
					if (outOfChunk(P)) break;
					if (sampleHeight(P)) return Hit(true, P, i);
					if (tMax.x < tMax.y && tMax.x < tMax.z) {
						P.x += stepDir.x / 32.0;
						tMax.x += tDelta.x;
					} else if (tMax.y < tMax.z) {
						P.y += stepDir.y / 32.0;
						tMax.y += tDelta.y;
					} else {
						P.z += stepDir.z / 32.0;
						tMax.z += tDelta.z;
					}
				}

				return Hit(false, P, 0u);
			}

            vec3 heightColor(float h) {
                if (h < 0.3) {
                    return mix(vec3(0.2, 0.1, 0.05), vec3(0.33, 0.27, 0.13), h / 0.3);
                } else if (h < 0.5) {
                    return mix(vec3(0.33, 0.27, 0.13), vec3(0.1, 0.2, 0.1), (h - 0.3) / 0.2);
                } else if (h < 0.65) {
                    return mix(vec3(0.1, 0.2, 0.1), vec3(0.0, 0.4, 0.0), (h - 0.5) / 0.15);
                } else if (h < 0.8) {
                    return mix(vec3(0.0, 0.4, 0.0), vec3(0.0, 0.278, 0.0), (h - 0.65) / 0.15);
                } else {
                    return mix(vec3(0.0, 0.278, 0.0), vec3(0.2, 0.6, 0.2), (h - 0.8) / 0.2);
                }
            }

            const vec3 DOWN = vec3(0, -1, 0);

			void main() {
				vec2 uv = gl_FragCoord.xy / scrSize;
				uv += bufIdx;
				uv /= viewDiameter;
				gl_FragColor = vec4(vec3(texture(heightmap, uv).r - 2.0), 1.0);
               
				Ray ray = getPrimaryRay();
				Hit hit;
				hit = march(ray);
                // if (dot(ray.dir, DOWN) >= sqrt(2.0)/2.0) {
                //     hit = marchXZ(ray);
                // } else {
                //     hit = march(ray);
                // }

				if (hit.hit) {

                    float normY = clamp((hit.pos.y - chunkMinY) / (chunkMaxY - chunkMinY), 0.0, 1.0);
                    vec3 baseColor = heightColor(normY);
                    vec3 lightDir = normalize(vec3(0.5, 2.0, 0.5));
                    float lightIntensity = clamp(dot(normalize(vec3(0.5, 1.0, 0.5)), lightDir), 0.0, 1.0);
                    vec3 shadowTint = vec3(0.2, 0.5, 0.1);
                    vec3 finalColor = mix(shadowTint, baseColor, lightIntensity);
                    gl_FragColor = vec4(finalColor, 1.0);


					// gl_FragColor = vec4(hit.pos, 1.0);
					// gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
					// gl_FragColor = vec4(vec3(float(hit.steps) / float(64)) * 2.0, 1.0);
				} else {
					// gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
					discard;
				}
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
        this.scene.background = new THREE.Color(0x87CEFA);
        this.webgl.setClearColor(0x87CEFA, 1);
        document.body.style.background = '#87CEFA';

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
