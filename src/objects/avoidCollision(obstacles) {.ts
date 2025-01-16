    avoidCollision(obstacles) {
        const steer = new Vector3();

        this.raycaster.set(this.boidMesh.position, this.getHeadingVector(this.boidMesh));
        const intersects = this.raycaster.intersectObjects(obstacles);

        if (intersects.length > 0) {
            // The ray intersects an object, and intersects[0] is the closest one
            const closestIntersection = intersects[0];
            const distanceToCollision = closestIntersection.distance;

            if (distanceToCollision > this.collisionRadius) return steer;

            const normal = closestIntersection.face.normal;

            // To get the world normal:
            // Transform the normal to world coordinates
            const worldNormal = normal.clone().transformDirection(closestIntersection.object.matrixWorld);

            console.log("Normal of the hit face:", worldNormal);
            const repulsionStrength = Math.max(0, 1 - (distanceToCollision / this.collisionRadius)); // Adjust the divisor to control the range
            const repulsionForce = worldNormal.multiplyScalar(1);
            // console.log(repulsionForce);
            return repulsionForce;
        } else {
            console.log("No obstacles were hit by the ray.");
            return steer;
        }
    }

#obstacles = [];
#createBoidsBox() {

    const size = 500;
    const halfSize = size / 2;
    const frameMaterial = new MeshBasicMaterial({
        color: 0x00ffff,
        opacity: 0.05,
        // side: DoubleSide, 
        wireframe: true
    });

    // Function to create a single plane rotated appropriately to form the box
    const createPlane = (width, height, rotation, position, name) => {
        const geometry = new PlaneGeometry(width, height);
        const plane = new Mesh(geometry, frameMaterial);
        plane.rotation.x = rotation.x;
        plane.rotation.y = rotation.y;
        plane.rotation.z = rotation.z;
        plane.position.set(position.x, position.y, position.z);

        return plane;
    };

    // Create six planes to form an enclosed box
    const planes = [];
    planes.push(createPlane(size, size, { x: -Math.PI / 2, y: 0, z: 0 }, { x: 0, y: -halfSize, z: 0 }, "bottomWall"));
    planes.push(createPlane(size, size, { x: Math.PI / 2, y: 0, z: 0 }, { x: 0, y: halfSize, z: 0 }, "topWall"));
    planes.push(createPlane(size, size, { x: 0, y: Math.PI / 2, z: 0 }, { x: -halfSize, y: 0, z: 0 }, "leftWall"));
    planes.push(createPlane(size, size, { x: 0, y: -Math.PI / 2, z: 0 }, { x: halfSize, y: 0, z: 0, }, "rightWall"));
    planes.push(createPlane(size, size, { x: 0, y: Math.PI, z: 0 }, { x: 0, y: 0, z: halfSize }, "frontWall"));
    planes.push(createPlane(size, size, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -halfSize }, "backWall"));


    // Add planes to the scene
    planes.forEach((plane, i) => {
        this.#obstacles.push(plane);
        const helper = new VertexNormalsHelper(plane, 100, 0xff0000);
        this.scene.add(plane);
        this.scene.add(helper);
    });
}