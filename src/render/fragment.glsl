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
	ivec3 pos;
	uint steps;
};

Ray getPrimaryRay() {
	vec2 uv = (gl_FragCoord.xy / scrSize) * 2.0 - 1.0;
	vec4 targ = invProjMat * vec4(uv, 1.0, 1.0);
	vec4 dir = invViewMat * vec4(normalize(targ.xyz / targ.w), 0.0);
	return Ray(localPos, dir.xyz);
}

bool outOfChunk(ivec3 pos, int ofs) {
	int lo = -1 + ofs;
	int hi = 32 - ofs;
	return pos.x < lo
	|| pos.x > hi
	|| pos.z < lo
	|| pos.z > hi
	|| float(pos.y) < chunkMinY
	|| float(pos.y) > chunkMaxY;
}

const float TEXELS_PER_UNIT = 32.0;
const float UNITS_PER_TEXEL = 1.0 / TEXELS_PER_UNIT;
const uint MAX_STEPS = 512u;
const float EPS = 1e-6; // adjust if your world scale is large/small

float getHeight(vec2 xz) {
	xz += bufIdx;
	xz /= viewDiameter;
	return texture(heightmap, xz).r;
}

float getHeightFromCell(ivec2 cell) {
    vec2 uv = (vec2(cell) + 0.5) / float(HEIGHTMAP_SIZE);
    return texture(heightmap, uv).r;
}

Hit march(Ray primary) {
	// Convert ray to texel space
	vec3 ro_tex = primary.pos * TEXELS_PER_UNIT;
	vec3 rd_tex = normalize(primary.dir) * TEXELS_PER_UNIT;

	// Current voxel in texel space (x,z)
	ivec2 pos = ivec2(floor(ro_tex.x), floor(ro_tex.z));

	// Step direction for DDA
	ivec2 step;
	step.x = rd_tex.x > 0.0 ? 1 : -1;
	step.y = rd_tex.z > 0.0 ? 1 : -1;

	// Compute tMax and tDelta for DDA
	vec2 nextBorder;
	nextBorder.x = (step.x > 0) ? (float(pos.x) + 1.0) : float(pos.x);
	nextBorder.y = (step.y > 0) ? (float(pos.y) + 1.0) : float(pos.y);

	vec2 tMax;
	tMax.x = (nextBorder.x - ro_tex.x) / rd_tex.x;
	tMax.y = (nextBorder.y - ro_tex.z) / rd_tex.z;

	vec2 tDelta;
	tDelta.x = 1.0 / abs(rd_tex.x);
	tDelta.y = 1.0 / abs(rd_tex.z);

	// March through heightmap grid
	for (uint i = 0u; i < 64u; ++i) {
		if (outOfChunk(pos + step, 0)) { break; }

		// sample at cell center, and add a tiny epsilon to the float comparison
		float h = getHeightFromCell(ivec2(pos.x, pos.y)); // should sample at center
		if (h > float(pos.y) + 1e-5) {
			return Hit(true, ivec3(pos.x, 0, pos.y), i);
		}

		// find smallest tMax
		float minT = min(min(tMax.x, tMax.y), tMax.z);

		// step all axes that are (within EPS) equal to the minimum
		// this handles exact edge/vertex hits by advancing multiple axes
		bool steppedX = false;
		bool steppedY = false;
		bool steppedZ = false;

		if (abs(tMax.x - minT) <= EPS) {
			tMax.x += tDelta.x;
			pos.x += step.x;
			steppedX = true;
		}
		if (abs(tMax.y - minT) <= EPS) {
			tMax.y += tDelta.y;
			pos.y += step.y;
			steppedY = true;
		}
		if (abs(tMax.z - minT) <= EPS) {
			tMax.z += tDelta.z;
			pos.z += step.z;
			steppedZ = true;
		}

		// sanity: if none stepped because of missed epsilon, step the smallest axis
		if (!steppedX && !steppedY && !steppedZ) {
			if (tMax.x < tMax.y) {
				if (tMax.x < tMax.z) {
					tMax.x += tDelta.x; pos.x += step.x;
				} else {
					tMax.z += tDelta.z; pos.z += step.z;
				}
			} else {
				if (tMax.y < tMax.z) {
					tMax.y += tDelta.y; pos.y += step.y;
				} else {
					tMax.z += tDelta.z; pos.z += step.z;
				}
			}
		}
	}

	// No hit found
	return Hit(false, ivec3(pos.x, 0, pos.y), MAX_STEPS);
}


// Hit march(Ray primary) {
// 	vec3 dir = primary.dir;
// 	vec3 sgn = sign(dir);
// 	vec3 posf = floor(primary.pos);
// 	ivec3 step = ivec3(sgn);
// 	ivec3 pos = ivec3(posf);
// 	vec3 dt = vec3(
// 		(abs(dir.x) > 1e-8) ? abs(1.0 / dir.x) : 1e30,
// 		(abs(dir.y) > 1e-8) ? abs(1.0 / dir.y) : 1e30,
// 		(abs(dir.z) > 1e-8) ? abs(1.0 / dir.z) : 1e30
// 	);
// 	// vec3 tSide = ((sgn * (posf - primary.pos)) + (sgn * 0.5) + 0.5) * dt;
// 	vec3 nextVoxelBorder;
// 	nextVoxelBorder.x = (step.x > 0) ? (posf.x + 1.0) : posf.x; // posf is floor(primary.pos)
// 	nextVoxelBorder.y = (step.y > 0) ? (posf.y + 1.0) : posf.y;
// 	nextVoxelBorder.z = (step.z > 0) ? (posf.z + 1.0) : posf.z;
//
// 	vec3 tSide = vec3(
// 			(abs(dir.x) > 1e-8) ? ((nextVoxelBorder.x - primary.pos.x) / dir.x) : 1e30,
// 			(abs(dir.y) > 1e-8) ? ((nextVoxelBorder.y - primary.pos.y) / dir.y) : 1e30,
// 			(abs(dir.z) > 1e-8) ? ((nextVoxelBorder.z - primary.pos.z) / dir.z) : 1e30
// 	);
//
// 	bvec3 mask;
// 	uint i;
//
// 	for (i = 0u; i < 64u; i++) {
// 		if (outOfChunk(pos + step, 0)) {
// 			break;
// 		}
// 		if (getHeight(vec2(pos.xz)) > float(pos.y) && !outOfChunk(pos, 1)) {
// 			return Hit(true, pos, i);
// 		}
// 		if (tSide.x < tSide.y) {
// 			if (tSide.x < tSide.z) {
// 				tSide.x += dt.x;
// 				pos.x += step.x;
// 				mask = bvec3(true, false, false);
// 			} else {
// 				tSide.z += dt.z;
// 				pos.z += step.z;
// 				mask = bvec3(false, false, true);
// 			}
// 		} else {
// 			if (tSide.y < tSide.z) {
// 				tSide.y += dt.y;
// 				pos.y += step.y;
// 				mask = bvec3(false, true, false);
// 			} else {
// 				tSide.z += dt.z;
// 				pos.z += step.z;
// 				mask = bvec3(false, false, true);
// 			}
// 		}
// 	}
//
// 	return Hit(false, pos, i);
// }

void main() {
	vec2 uv = gl_FragCoord.xy / scrSize;
	uv += bufIdx;
	uv /= viewDiameter;
	gl_FragColor = vec4(vec3(texture(heightmap, uv).r - 2.0), 1.0);

	Ray ray = getPrimaryRay();
	Hit hit = march(ray);

	if (hit.hit) {
		gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
		// gl_FragColor = vec4(vec3(float(hit.steps) / float(16)) * 2.0, 1.0);
	} else {
		// gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
		discard;
	}
}
