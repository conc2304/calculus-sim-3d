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

export class Boid {
    constructor() {
        this.neighborhoodRadius = 150;
        this.neighborhoodAngle = 20;
        this.crowdingRadius = 30;

        this.boidMesh;

        this.updateAngle = -Math.PI / 2; // account for initial position of 0
        this.startAngle = this.neighborhoodAngle + this.updateAngle; // Start angle in radians
        this.endAngle = -this.neighborhoodAngle + this.updateAngle; // End angle in radians

        this.boidSpeed = 0.2;
        this.initialVelocity = 1;
        this.rotationSpeed = 0.02;

        this.weightOld = 0.5;
        this.weightAvg = 0.5;

        this.id = generateUUID();
    }

    createBoid() {
        const boidHeight = 10;
        const boidWidth = 2.5;
        const geometry = new ConeGeometry(boidWidth, boidHeight, 32);
        const material = new MeshBasicMaterial({ color: 0xffff00 });
        const boid = new Mesh(geometry, material);

        const neighborhood = this.createBoidSector(this.neighborhoodRadius, this.startAngle, this.endAngle, { color: 0x00ff00, opacity: 0.1 });
        const crowdingArea = this.createBoidSector(this.crowdingRadius, this.startAngle, this.endAngle, { color: 0xff0000, opacity: 0.45 });

        const debugLine = this.createAngleLine();

        boid.add(neighborhood);
        boid.add(crowdingArea);
        boid.add(debugLine); // shows where angle 0 is

        boid.position.set(getRandomInRange(-200, 200), getRandomInRange(-200, 200), 0)
        boid.rotation.set(0, 0, getRandomInRange(-Math.PI, Math.PI))

        this.boidMesh = boid;
        return boid;
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

        return boidInAngle;
    }

    update(boidsList, elapsedTime) {

        // Move the boid forward in the direction of the heading
        const currentHeading = this.getHeadingVector(this.boidMesh);

        const avgHeading = this.getAverageHeading(boidsList);
        const WaHa = avgHeading.clone().multiplyScalar(this.weightAvg);
        const WoHc = currentHeading.clone().multiplyScalar(this.weightOld);
        const WoWa = this.weightOld + this.weightAvg;

        const numerator = new Vector3().addVectors(WoHc, WaHa);
        const newHeading = numerator.clone().divideScalar(WoWa).normalize();  // Ensure it's a unit vector

        // Calculate current and target quaternions
        const currentQuaternion = this.boidMesh.quaternion.clone();
        const targetQuaternion = new Quaternion();
        targetQuaternion.setFromUnitVectors(new Vector3(0, 1, 0), newHeading);

        // Spherical Linear Interpolation (slerp)
        this.boidMesh.quaternion.slerpQuaternions(currentQuaternion, targetQuaternion, this.rotationSpeed * elapsedTime);

        // Move the boid in the direction of the new heading
        this.boidMesh.position.add(newHeading.multiplyScalar(this.boidSpeed * elapsedTime));


    }

    getAverageHeading(boids) {
        let headingSum = new Vector3(0, 0, 0);
        let count = 0;
        boids.forEach((boid) => {
            // Don't add self to average
            if (boid.id === this.id) return;
            // Only average boids in 
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