import {
    Mesh,
    MeshBasicMaterial,
    ConeGeometry,
    Shape,
    ShapeGeometry,
    DoubleSide,
    Vector3,
    LineBasicMaterial,
    Line,
    BufferGeometry,
    Quaternion
} from 'three'

import { getRandomInRange } from '../utils';
import { Spherical } from 'three';
import { generateUUID } from 'three/src/math/MathUtils.js';
import { Raycaster } from 'three';

export class Boid {
    constructor() {
        this.neighborhoodRadius = 150;
        this.neighborhoodAngle = 20;
        this.crowdingRadius = 30;
        this.collisionRadius = 60;

        this.boidMesh;

        this.updateAngle = -Math.PI / 2; // account for initial position of 0
        this.startAngle = this.neighborhoodAngle + this.updateAngle; // Start angle in radians
        this.endAngle = -this.neighborhoodAngle + this.updateAngle; // End angle in radians

        this.boidSpeed = 2;
        this.rotationSpeed = 0.1;

        this.weightOld = 0.5;
        this.weightAvg = 0.5;

        this.raycaster = new Raycaster();

        this.id = generateUUID();
    }

    createBoid() {
        const boidHeight = 10;
        const boidWidth = 2.5;
        const geometry = new ConeGeometry(boidWidth, boidHeight, 32);
        const material = new MeshBasicMaterial({ color: 0xffff00 });
        const boid = new Mesh(geometry, material);


        // this.addDebugging()

        boid.position.set(getRandomInRange(-200, 200), getRandomInRange(-200, 200), getRandomInRange(-200, 200))
        boid.rotation.set(getRandomInRange(-Math.PI, Math.PI), getRandomInRange(-Math.PI, Math.PI), getRandomInRange(-Math.PI, Math.PI))

        this.boidMesh = boid;
        return boid;
    }

    addDebugging() {
        const neighborhood = this.createBoidSector(this.neighborhoodRadius, this.startAngle, this.endAngle, { color: 0x00ff00, opacity: 0.1 });
        const crowdingArea = this.createBoidSector(this.crowdingRadius, this.startAngle, this.endAngle, { color: 0xff0000, opacity: 0.45 });
        const debugLine = this.createAngleLine();

        boid.add(neighborhood);
        boid.add(crowdingArea);
        boid.add(debugLine); // shows where angle 0 is
    }

    update(boidsList, obstacles) {

        // Move the boid forward in the direction of the heading
        const headingCurrent = this.getHeadingVector(this.boidMesh);

        // Calculate the avg heading based on general flock direction
        const headingFlockAvg = this.getAverageHeading(boidsList);
        const WaHa = headingFlockAvg.clone().multiplyScalar(this.weightAvg);
        const WoHc = headingCurrent.clone().multiplyScalar(this.weightOld);
        const WoWa = this.weightOld + this.weightAvg;

        const numerator = new Vector3().addVectors(WoHc, WaHa);
        let heading = numerator.clone().divideScalar(WoWa).normalize();

        // Avoid obstacles via repulsion
        heading = this.getAvoidanceHeading(obstacles, heading);

        // Add Flocking Separation to boid
        heading = this.getSeparationHeading(boidsList, heading);


        // Calculate current and target quaternions
        const currentQuaternion = this.boidMesh.quaternion.clone();
        const targetQuaternion = new Quaternion();
        targetQuaternion.setFromUnitVectors(new Vector3(0, 1, 0), heading);

        // Spherical Linear Interpolation (slerp)
        this.boidMesh.quaternion.slerpQuaternions(
            currentQuaternion,
            targetQuaternion,
            this.rotationSpeed
        );

        // Move the boid in the direction of the new heading
        this.boidMesh.position.add(heading.multiplyScalar(this.boidSpeed));
    }

    getSeparationHeading(boidsList, heading) {

        let position = this.boidMesh.position;
        const separationHeading = new Vector3().add(heading);

        const repulsionPower = 4;
        const forceVector = new Vector3(0, 0, 0);

        boidsList.forEach((otherBoid, i) => {
            // Don't add self to average
            if (otherBoid.id === this.id) return;

            // Only separate boids in sector
            const boidInCrowdingArea = this.isBoidInSector(otherBoid.boidMesh, this.crowdingRadius, this.startAngle)
            if (!boidInCrowdingArea) return;

            let positionOther = otherBoid.boidMesh.position;
            const distanceVector = new Vector3().subVectors(position, positionOther);
            const distance = distanceVector.length();

            if (distance > 0) {
                const repulsionStrength = 1 / Math.pow(distance / this.crowdingRadius, repulsionPower)
                distanceVector.normalize().multiplyScalar(repulsionStrength);
                forceVector.add(distanceVector);
            }
        });

        let tempSH = separationHeading.clone().add(forceVector);
        // console.log('before', { tempSH })

        let tempAfter = tempSH.clone().normalize();

        // console.log('after', { tempAfter })

        return tempAfter;
    }

    getDistanceToObstacle(obstacle) {
        const boidPos = this.boidMesh.position.clone();

        // Ensure the obstacle has geometry and vertices
        if (!obstacle.geometry || !obstacle.geometry.attributes.position) {
            console.error('Obstacle must have geometry with vertices');
            return {
                distance: Infinity,
                closestPoint: null,
            };
        }

        // Get the vertices of the obstacle in world space
        const positionAttribute = obstacle.geometry.attributes.position;
        const matrixWorld = obstacle.matrixWorld;
        let closestPoint = null;
        let minDistance = Infinity;

        for (let i = 0; i < positionAttribute.count; i++) {
            // Get vertex in local space
            const vertex = new Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            );

            // Transform vertex to world space
            vertex.applyMatrix4(matrixWorld);

            // Calculate distance to the boid
            const distance = boidPos.distanceTo(vertex);

            // Update closest point if this vertex is nearer
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = vertex.clone();
            }
        }

        // Return the closest distance and point
        return {
            distance: minDistance,
            closestPoint: closestPoint,
        };
    }

    avoidCollision(obstacles) {
        const steer = new Vector3();
        new Vector3()
        obstacles.map((obstacle) => {
            obstacle.material.color.setHex(0x00ffff);
        });

        this.raycaster.set(this.boidMesh.position, this.getHeadingVector(this.boidMesh));
        const intersects = this.raycaster.intersectObjects(obstacles);

        if (intersects.length > 0) {
            // The ray intersects an object, and intersects[0] is the closest one
            const closestIntersection = intersects[0];
            const distanceToCollision = closestIntersection.distance;

            console.log(intersects[0].object.name);

            // To get the world normal:
            // Transform the normal to world coordinates
            const normal = closestIntersection.face.normal;
            const worldNormal = normal
                .clone()
                .transformDirection(closestIntersection.object.matrixWorld)
                .normalize();

            return {
                normal: worldNormal,
                obstacle: intersects[0],
                distance: distanceToCollision
            };

        } else {
            console.log("No obstacles were hit by the ray.");
            return {
                normal: steer,
                obstacle: null,
                distance: 0
            };
        }
    }

    createAngleLine() {
        const points = [];
        points.push(new Vector3(0, 0, 0));
        points.push(new Vector3(0, this.neighborhoodRadius, 0));

        const geometry = new BufferGeometry().setFromPoints(points);
        const material = new LineBasicMaterial({ color: 0xff0000 });
        const line = new Line(geometry, material);

        return line;
    }

    createBoidSector(radius, startAngle, endAngle, materialConf) {

        // Define and create the arc shape
        const shape = new Shape();
        const centerX = 0; // X coordinate of the center of the arc
        const centerY = 0; // Y coordinate of the center of the arc

        // Move to the center
        shape.moveTo(centerX, centerY);

        // Line to the start of the arc
        shape.lineTo(centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle));
        // shape.lineTo(centerX + radius * Math.cos(this.startAngle), centerY + radius * Math.sin(this.startAngle));

        // Arc
        shape.absarc(centerX, centerY, radius, startAngle, endAngle, false);

        // Line back to the center
        shape.lineTo(centerX, centerY);

        const geometry = new ShapeGeometry(shape);
        const material = new MeshBasicMaterial({
            color: 0xff0000,
            opacity: 0.15,
            side: DoubleSide,
            transparent: true,
            ...materialConf
        });
        const mesh = new Mesh(geometry, material);

        return mesh;
    }

    isBoidInSector(boidOther, radius, startAngle) {

        // Check if inside radius
        const distanceToBoid = boidOther.position.distanceTo(this.boidMesh.position)
        const boidInRadius = distanceToBoid < radius;
        if (!boidInRadius) return false;

        const relativePos = new Vector3()
        relativePos.subVectors(this.boidMesh.position, boidOther.position);

        // Define the axis to rotate around = Z
        const axis = new Vector3(0, 0, 1);

        // Define the angle of rotation in radians
        const angle = -this.boidMesh.rotation.z;

        const tempSpherical = new Spherical();
        tempSpherical.setFromVector3(relativePos)
        const { theta } = tempSpherical;

        // Rotate the vector
        relativePos.applyAxisAngle(axis, angle);

        const boidInAngle = Math.abs(theta) < Math.abs(startAngle)
        // console.log({ boidInAngle }) 
        return boidInAngle;
    }

    getAvoidanceHeading(obstacles, currentHeading) {
        // avoid obstacles via repulsion
        let newHeading = currentHeading;

        obstacles.forEach(obstacle => {
            const { distance, closestPoint } = this.getDistanceToObstacle(obstacle);

            if (distance < this.collisionRadius) {
                // raycast at closest point to get the normal of the face that it hits
                const rayDirection = new Vector3().subVectors(closestPoint, this.boidMesh.position).normalize();
                this.raycaster.set(this.boidMesh.position, rayDirection);
                const intersects = this.raycaster.intersectObjects(obstacles);

                let worldNormal = new Vector3();
                if (intersects.length > 0) {

                    const closestIntersection = intersects[0];
                    const normal = closestIntersection.face.normal;
                    worldNormal = normal
                        .clone()
                        .transformDirection(closestIntersection.object.matrixWorld)
                        .normalize();
                }
                const repulsionScale = 1 - (distance / this.collisionRadius);
                const repulsionVector = new Vector3().add(worldNormal).multiplyScalar((obstacle.repulsion || 5) * repulsionScale);
                newHeading = newHeading.add(repulsionVector);
            }
        });

        return newHeading;
    }

    getAverageHeading(boids) {
        let headingSum = new Vector3(0, 0, 0);
        let count = 0;
        boids.forEach((boid) => {
            // Don't add self to average
            if (boid.id === this.id) return;
            // Only average boids in sector
            if (!this.isBoidInSector(boid.boidMesh, this.neighborhoodRadius, this.startAngle)) return;

            // console.log(`${boid.id} is in sector of ${this.id}`);

            const headingVector = this.getHeadingVector(boid.boidMesh);

            headingSum.add(headingVector);
            count++
        });

        // console.log({headingSum, count})
        if (count === 0) return this.getHeadingVector(this.boidMesh);;

        const avgHeading = headingSum.clone().divideScalar(count);

        return avgHeading;
    }

    getHeadingVector(meshObject) {
        // Create a vector pointing up the Y-axis (local forward direction)
        const forward = new Vector3(0, 1, 0);
        forward.normalize();

        // Apply the object's rotation to this vector
        forward.applyQuaternion(meshObject.quaternion);

        return forward.normalize();
    }

}