import * as THREE from 'three';

// Constants
const PI = 3.14159;
const PI2 = 6.28318;
const HFPI = 1.57079;
const EPSILON = 1e-10;

export class GivenGenerator {
    
    /**
     * Quintic fade (C2 smooth) - TypeScript implementation
     * https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/perlin-noise-part-2/improved-perlin-noise.html
     */
    private quinticInterpolation(t: THREE.Vector2): THREE.Vector2 {
        const x = t.x * t.x * t.x * (t.x * (t.x * 6.0 - 15.0) + 10.0);
        const y = t.y * t.y * t.y * (t.y * (t.y * 6.0 - 15.0) + 10.0);
        return new THREE.Vector2(x, y);
    }

    /**
     * Random hash function - TypeScript implementation
     */
    private hash2(p: THREE.Vector2): THREE.Vector2 {
        const dot1 = p.x * 127.1 + p.y * 311.7;
        const dot2 = p.x * 269.5 + p.y * 183.3;
        const hash1 = Math.sin(dot1) * 43758.5453123;
        const hash2 = Math.sin(dot2) * 43758.5453123;
        return new THREE.Vector2(
            -1.0 + 2.0 * (hash1 - Math.floor(hash1)),
            -1.0 + 2.0 * (hash2 - Math.floor(hash2))
        );
    }

    /**
     * 2D Perlin noise - TypeScript implementation
     */
    public perlinNoise(P: THREE.Vector2): number {
        // Lattice coordinates and local position
        const Pi = new THREE.Vector2(Math.floor(P.x), Math.floor(P.y));
        const Pf = new THREE.Vector2(P.x - Pi.x, P.y - Pi.y);

        // Gradients at cell corners (unit-ish)
        const g00 = this.hash2(new THREE.Vector2(Pi.x, Pi.y)).normalize();
        const g10 = this.hash2(new THREE.Vector2(Pi.x + 1.0, Pi.y)).normalize();
        const g01 = this.hash2(new THREE.Vector2(Pi.x, Pi.y + 1.0)).normalize();
        const g11 = this.hash2(new THREE.Vector2(Pi.x + 1.0, Pi.y + 1.0)).normalize();

        // Dot products with corner-to-point offset vectors
        const n00 = g00.dot(new THREE.Vector2(Pf.x, Pf.y));
        const n10 = g10.dot(new THREE.Vector2(Pf.x - 1.0, Pf.y));
        const n01 = g01.dot(new THREE.Vector2(Pf.x, Pf.y - 1.0));
        const n11 = g11.dot(new THREE.Vector2(Pf.x - 1.0, Pf.y - 1.0));

        // Interpolate using quintic fade
        const u = this.quinticInterpolation(Pf);
        const nx0 = n00 + (n10 - n00) * u.x;
        const nx1 = n01 + (n11 - n01) * u.x;
        const nxy = nx0 + (nx1 - nx0) * u.y;

        return nxy * 0.5 + 0.5;
    }

    /**
     * Fractional Brownian Motion - TypeScript implementation
     */
    public fbm(uv: THREE.Vector2): number {
        let value = 0.0;
        let amplitude = 1.6;
        let freq = 1.0;
        
        for (let i = 0; i < 8; i++) {
            const scaledUV = new THREE.Vector2(uv.x * freq, uv.y * freq);
            value += this.perlinNoise(scaledUV) * amplitude;
            
            amplitude *= 0.4;
            freq *= 2.0;
        }
        
        return value;
    }

    /**
     * Terrain height map - TypeScript implementation
     */
    public terrainHeightMap(uv: THREE.Vector3): number {
        const scaledUV = new THREE.Vector2(uv.x * 0.5, uv.z * 0.5);
        return this.fbm(scaledUV);
    }

    /**
     * Step count cost color - TypeScript implementation
     */
    public stepCountCostColor(bias: number): THREE.Vector3 {
        const offset = new THREE.Vector3(0.938, 0.328, 0.718);
        const amplitude = new THREE.Vector3(0.902, 0.4235, 0.1843);
        const frequency = new THREE.Vector3(0.7098, 0.7098, 0.0824);
        const phase = new THREE.Vector3(2.538, 2.478, 0.168);

        const result = new THREE.Vector3();
        result.x = offset.x + amplitude.x * Math.cos(PI2 * (frequency.x * bias + phase.x));
        result.y = offset.y + amplitude.y * Math.cos(PI2 * (frequency.y * bias + phase.y));
        result.z = offset.z + amplitude.z * Math.cos(PI2 * (frequency.z * bias + phase.z));
        
        return result;
    }

    /**
     * Get normal vector - TypeScript implementation
     */
    public getNormal(rayTerrainIntersection: THREE.Vector3, t: number): THREE.Vector3 {
        const eps = new THREE.Vector3(0.001 * t, 0.0, 0.0);
        
        const h1 = this.terrainHeightMap(new THREE.Vector3(
            rayTerrainIntersection.x - eps.x,
            rayTerrainIntersection.y,
            rayTerrainIntersection.z
        ));
        
        const h2 = this.terrainHeightMap(new THREE.Vector3(
            rayTerrainIntersection.x + eps.x,
            rayTerrainIntersection.y,
            rayTerrainIntersection.z
        ));
        
        const h3 = this.terrainHeightMap(new THREE.Vector3(
            rayTerrainIntersection.x,
            rayTerrainIntersection.y,
            rayTerrainIntersection.z - eps.x
        ));
        
        const h4 = this.terrainHeightMap(new THREE.Vector3(
            rayTerrainIntersection.x,
            rayTerrainIntersection.y,
            rayTerrainIntersection.z + eps.x
        ));
        
        const n = new THREE.Vector3(
            h1 - h2,
            2.0 * eps.x,
            h3 - h4
        );
        
        return n.normalize();
    }

    /**
     * Compute look-at matrix - TypeScript implementation
     */
    public computeLookAtMatrix(cameraOrigin: THREE.Vector3, target: THREE.Vector3, roll: number): THREE.Matrix3 {
        const rr = new THREE.Vector3(Math.sin(roll), Math.cos(roll), 0.0);
        const ww = new THREE.Vector3().subVectors(target, cameraOrigin).normalize();
        const uu = new THREE.Vector3().crossVectors(ww, rr).normalize();
        const vv = new THREE.Vector3().crossVectors(uu, ww).normalize();

        return new THREE.Matrix3().setFromMatrix4(
            new THREE.Matrix4().makeBasis(uu, vv, ww)
        );
    }

    /**
     * Convert to linear color space - TypeScript implementation
     */
    public toLinear(inputColor: THREE.Vector3): THREE.Vector3 {
        return new THREE.Vector3(
            Math.pow(inputColor.x, 2.2),
            Math.pow(inputColor.y, 2.2),
            Math.pow(inputColor.z, 2.2)
        );
    }

    /**
     * Convert to sRGB color space - TypeScript implementation
     */
    public tosRGB(inputColor: THREE.Vector3): THREE.Vector3 {
        return new THREE.Vector3(
            Math.pow(inputColor.x, 1.0 / 2.2),
            Math.pow(inputColor.y, 1.0 / 2.2),
            Math.pow(inputColor.z, 1.0 / 2.2)
        );
    }

    /**
     * Generate height map for a chunk using the given generator
     */
    public generateHeightMapForChunk(
        chunkPosition: { x: number; z: number },
        chunkDimensions: { width: number; depth: number; height: number },
        resolution: number = 16
    ): Float32Array {
        const heightData = new Float32Array(resolution * resolution);
        
        // Calculate world bounds for this chunk
        const minX = chunkPosition.x * chunkDimensions.width;
        const minZ = chunkPosition.z * chunkDimensions.depth;

        // Generate height for each grid point
        for (let z = 0; z < resolution; z++) {
            for (let x = 0; x < resolution; x++) {
                // Convert grid coordinates to world coordinates
                const worldX = minX + (x / (resolution - 1)) * chunkDimensions.width;
                const worldZ = minZ + (z / (resolution - 1)) * chunkDimensions.depth;
                
                // Generate height using the terrain function
                const worldPos = new THREE.Vector3(worldX, 0, worldZ);
                const height = this.terrainHeightMap(worldPos);
                
                // Store in height map
                const index = z * resolution + x;
                heightData[index] = height;
            }
        }

        return heightData;
    }
}