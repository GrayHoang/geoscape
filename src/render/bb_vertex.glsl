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
