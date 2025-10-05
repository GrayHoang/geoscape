import { Chunk } from './chunk';
import { GivenGenerator } from '../core/given_generator';

// manages loading/unloading and querying visible chunks
export class ChunkManager {
    private numChunks: number; // width/height of the chunk array
    private array_chunks: Chunk[]; // the square array of chunks
    private numPixels;
    
    constructor(dim: number, pixels: number){
        let generator = new GivenGenerator();
        this.numChunks = dim;
        this.numPixels = pixels;
        this.array_chunks = new Array(this.numChunks**2);
        for (let i = 0; i < dim*dim; i++){
            this.array_chunks[i] = new Chunk((i%dim)*pixels, (Math.floor(i/dim))*pixels, pixels)
            generator.generateHeightMapForChunk(this.array_chunks[i]);
        }
    } //build a square array side length numChunks

    getChunkData(chunkx: number, chunkz: number): Float32Array {
        return this.array_chunks[chunkz*this.numChunks + chunkx].getHeightMap();
    }

    getMinY(chunkx: number, chunkz: number): number {
        return this.array_chunks[chunkz*this.numChunks + chunkx].getMinY()/this.numPixels;
    } // get the miny at chunkx and chunk z
    // getmaxy(chunkx,chunkz) // get the maxy at chunkx and chunkz
    getBBHeight(chunkx: number, chunkz: number): number {
        
        return (this.array_chunks[chunkz*this.numChunks + chunkx].getMaxY() - this.array_chunks[chunkz*this.numChunks + chunkx].getMinY() +  1);
    } // get the height of the chunk at x and z
    
    // getchunkdata(chunkx, chunkz) //get the data 
}
