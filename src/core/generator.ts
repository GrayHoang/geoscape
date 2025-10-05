import * as THREE from 'three';

// generates heightmap, abstraction around gpu based generation (framebuffer, populate with fragment shader, shader uniforms for chunk x,z position and seed)
// generates heightmap for a GridSquare (GPU noise, erosion)
export class Generator {
    
    /**
     * Smooth min, returns a smoothened minimum between point a and b
     * @param a param 1
     * @param b param 2
     * @param k smoothening factor
     * @returns a smoothened minimum
     */
    private smin(a: number, b: number, k: number): number
    {
        let h: number = Math.max(k-Math.abs(a-b),0.0);
        return Math.min(a, b) - h*h*0.25/k;
    }
    
    /**
     * Smooth max, returns a smoothened maximum between point a and b
     * @param a param 1
     * @param b param 2
     * @param k smoothening factor
     * @returns a smoothened maximum
     */
    private smax(a: number, b: number, k: number): number
    {
        let h: number = Math.max(k-Math.abs(a-b),0.0);
        return Math.max(a, b) + h*h*0.25/k;
    }

    /**
     * returns the fractional components of v
     * @param v the vector
     * @returns everything after the decimal point for each element of v
     */
    private fractVec3(v: THREE.Vector3) : THREE.Vector3{
        let out: THREE.Vector3 = new THREE.Vector3();
        let floored: THREE.Vector3 = new THREE.Vector3();
        floored.copy(v).floor();
        
        return out.subVectors(v,floored);
    }
    
    /**
     * Gets the fractional component of a number
     * @param f number
     * @returns fraction (everything after the decimal point)
     */
    private fractFloat(f: number): number {
        return f-Math.floor(f);
    }

    /**
     * Returns the distance between the point i+f and a sphere of random radius at point i+c.
     * i is used as a hash to generate a 'random' sized sphere.
     * @param origin integer displacement from origin
     * @param point the point (as a fractional offset from origin)
     * @param offset the point to build the sphere at
     * @returns distance from f to the sphere at c
     */
    private sph(origin: THREE.Vector3, point: THREE.Vector3, offset: THREE.Vector3): number
    {
        // random radius at grid vertex i+c (please replace this hash by
        // something better if you plan to use this for a real application)
        let p: THREE.Vector3 = this.fractVec3( new THREE.Vector3().addVectors(origin,offset).multiplyScalar(0.3183099).add(new THREE.Vector3(0.11,0.17,0.13) )).multiplyScalar(17.0);
        let w: number = this.fractFloat( p.x*p.y*p.z*(p.x+p.y+p.z) );
        let r: number = 0.7*w*w;
        // distance to sphere at grid vertex i+c
        return new THREE.Vector3().subVectors(point,offset).length() - r; 
    }

    /**
     * Produces 8 spheres at the vertices of a cube centered at p and returns the minimum distance to any of those spheres.
     * @param p the point
     * @returns the minimum distance
     */
    private sdBase(p: THREE.Vector3): number
    {
        // The nearest point on the grid to p
        let origin: THREE.Vector3 = new THREE.Vector3().copy(p).floor();
        // The fractional component of p
        let fraction: THREE.Vector3 = this.fractVec3(p);
        return Math.min(Math.min(Math.min(this.sph(origin,fraction,new THREE.Vector3(0,0,0)),
                        this.sph(origin,fraction,new THREE.Vector3(0,0,1))),
                    Math.min(this.sph(origin,fraction,new THREE.Vector3(0,1,0)),
                        this.sph(origin,fraction,new THREE.Vector3(0,1,1)))),
                    Math.min(Math.min(this.sph(origin,fraction,new THREE.Vector3(1,0,0)),
                        this.sph(origin,fraction,new THREE.Vector3(1,0,1))),
                    Math.min(this.sph(origin,fraction,new THREE.Vector3(1,1,0)),
                        this.sph(origin,fraction,new THREE.Vector3(1,1,1)))));
    }

    
    private sdFbm(p: THREE.Vector3,th: number, minDist: number): THREE.Vector2 
    {
        // rotation and 2x scale matrix
        const transformationMatrix: THREE.Matrix3= new THREE.Matrix3( 0.00,  1.60,  1.20,
                                                -1.60,  0.72, -0.96,
                                                -1.20, -0.96,  1.28 );
        let transformedPoint: THREE.Vector3 = new THREE.Vector3().copy(p);
        let accumedDistortion: number = 0.0;
        let scale: number = 1.0;
        const ioct: number = 11;
        for(let i=0; i<ioct; i++ )
        {
            if(minDist > scale*0.866) break; // early exit
            if(scale < th) break;      // lod
            
            let newDist: number = scale*this.sdBase(transformedPoint);
            newDist = this.smax(newDist,minDist-0.1*scale,0.3*scale);
            minDist = this.smin(newDist,minDist          ,0.3*scale);
            transformedPoint.applyMatrix3(transformationMatrix);
            scale = 0.415*scale;

            accumedDistortion += minDist; 
            transformedPoint.z += -4.33*accumedDistortion*scale; // deform things a bit
        }
        return new THREE.Vector2( minDist, accumedDistortion );
    }

}