// cubic chunks, sent to the gpu
// GridSquare heightmap --> rendered geometry mesh

export interface ChunkPosition {
	x: number; // chunk coordinate on x-axis
	z: number; // chunk coordinate on z-axis (depth)
}

export interface ChunkDimensions {
	width: number;  // width in world units (x-axis)
	depth: number;  // depth in world units (z-axis)
	height: number; // height in world units (y-axis)
}

export interface HeightMap {
	data: Float32Array; // resolution x resolution height data entries
	resolution: number;  // resolution of height map (e.g., 16x16 = 256 entries)
}

export class Chunk {
	private position: ChunkPosition;
	private dimensions: ChunkDimensions;
	private heightMap: HeightMap;

	constructor(position: ChunkPosition, dimensions: ChunkDimensions) {
		this.position = position;
		this.dimensions = dimensions;
		this.heightMap = {
			data: new Float32Array(256), // 16x16 grid = 256 height entries
			resolution: 16
		};
	}

	// Getters for position and dimensions
	getPosition(): ChunkPosition {
		return this.position;
	}

	getDimensions(): ChunkDimensions {
		return this.dimensions;
	}

	// Height map management
	getHeightMap(): HeightMap {
		return {
			data: new Float32Array(this.heightMap.data),
			resolution: this.heightMap.resolution
		};
	}

	setHeightMap(heightMap: HeightMap): void {
		this.heightMap = {
			data: new Float32Array(heightMap.data),
			resolution: heightMap.resolution
		};
	}

	// Get height at specific local coordinates within the chunk
	getHeightAt(x: number, z: number): number {

		// Clamp coordinates to valid range
		const clampedX = Math.max(0, Math.min(this.heightMap.resolution - 1, x));
		const clampedZ = Math.max(0, Math.min(this.heightMap.resolution - 1, z));
		
		const index = clampedZ * this.heightMap.resolution + clampedX;
		return this.heightMap.data[index];
	}

	// Set height at specific local coordinates within the chunk
	setHeightAt(x: number, z: number, height: number): void {
		const clampedX = Math.max(0, Math.min(this.heightMap.resolution - 1, x));
		const clampedZ = Math.max(0, Math.min(this.heightMap.resolution - 1, z));
		
		const index = clampedZ * this.heightMap.resolution + clampedX;
		this.heightMap.data[index] = height;
	}

	// Get chunk bounds in world coordinates
	getBounds(): {
		minX: number;
		maxX: number;
		minZ: number;
		maxZ: number;
	} {
		return {
			minX: this.position.x * this.dimensions.width,
			maxX: (this.position.x + 1) * this.dimensions.width,
			minZ: this.position.z * this.dimensions.depth,
			maxZ: (this.position.z + 1) * this.dimensions.depth
		};
	}
}