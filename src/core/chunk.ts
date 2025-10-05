// cubic chunks, sent to the gpu
// GridSquare heightmap --> rendered geometry mesh

// CHUNK == COLUMN
// CUBE == BOUNDING BOX
export class Chunk {
	private length: number; // 16
	private heightMap: Float32Array;
	private minX: number;
	private maxX: number;
	private minZ: number;
	private maxZ: number;
	private minY: number;
	private maxY: number;

	constructor(minX: number, minZ: number, length: number) {
		this.minX = minX;
		this.maxX = minX + length - 1;
		this.minZ = minZ;
		this.maxZ = minZ + length - 1;
		this.length = length;
		this.heightMap =  new Float32Array(length * length); // 16x16 grid = 256 height entries
		this.minY = Infinity;
        this.maxY = 0;
	}

	getLength(): number {
		return this.length;
	}

	getHeightMap(): Float32Array {
		return this.heightMap;
	}

	setHeightMap(heightMap: Float32Array) {
		this.heightMap = heightMap;
	}

	getHeightAt(x: number, z: number): number {
		const index = (z - this.minZ) * this.length + (x - this.minX);
		return this.heightMap[index];
	}

	setHeightAt(x: number, z: number, height: number): void {
		const index = (z - this.minZ) * this.length + (x - this.minX);
		this.heightMap[index] = height;
	}

	getMinX(): number {
		return this.minX;
	}

	setMinX(x: number) {
		this.minX = x;
	}

	getMaxX(): number {
		return this.maxX;
	}

	setMaxX(x: number) {
		this.maxX = x;
	}

	getMinZ(): number {
		return this.minZ;
	}

	setMinZ(z: number) {
		this.minZ = z;
	}

	getMaxZ(): number {
		return this.maxZ;
	}

	setMaxZ(z: number) {
		this.maxZ = z;
	}

	getMinY(): number {
		return this.minY;
	}

	setMinY(y: number) {
		this.minY = y;
	}

	getMaxY(): number {
		return this.maxY;
	}

	setMaxY(y: number) {
		this.maxY = y;
	}
}
