import * as THREE from 'three';
import { Chunk } from "./chunk.ts"

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
     * Generate height map for a chunk using the given generator
     */
    public generateHeightMapForChunk(chunk: Chunk) {
        const minX = chunk.getMinX();
        const minZ = chunk.getMinZ();
        const chunkLength: number = chunk.getLength();
        let minY: number = chunk.getMinY();
        let maxY: number = chunk.getMaxY();
        
        // Generate height for each grid point
        for (let z = minZ; z < minZ + chunkLength; z++) {
            for (let x = minX; x < minX + chunkLength; x++) {
                // Generate height using the terrain function
                const worldPos = new THREE.Vector3(x/4, 0, z/4);
                let height = this.terrainHeightMap(worldPos)*2;
                // height = height * height * height;
                
                // Store in height map
                chunk.setHeightAt(x, z, height);

                // check min/max
                if (height < minY) {
                    chunk.setMinY(height);
                    minY = height;
                }
                if (height > maxY) {
                    chunk.setMaxY(height);
                    maxY = height;
                }
            }
        }
    }
}
