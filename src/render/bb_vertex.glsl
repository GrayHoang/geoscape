attribute vec4 transforms;

// x,z after modulo
varying vec2 bufIdx;

const float CHUNK_RADIUS = 4.0;

void main() {
	// bufIdx = vec2(pos.x % CHUNK_RADIUS, pos.y % CHUNK_RADIUS);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x + transforms.x, (position.y + 0.5) * transforms.w + transforms.y - 0.5, position.z + transforms.z, 1.0);
}
