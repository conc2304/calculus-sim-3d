import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { SimplexNoise } from 'three/examples/jsm/Addons.js';

export class Attractor {
  constructor({ position, strength, range, boundingSize, speed, isVisible = true }) {
    this.position = position instanceof Vector3 ? position : new Vector3(...position);
    this.strength = strength;
    this.range = range;
    this.isVisible = isVisible;
    this.noise = new SimplexNoise();
    this.noiseScale = speed;
    this.bounds = {
      x: [-boundingSize, boundingSize],
      y: [-boundingSize, boundingSize],
      z: [-boundingSize, boundingSize]
    };

    // Create the visual representation as a red sphere
    const geometry = new SphereGeometry(5, 32, 32);
    const material = new MeshBasicMaterial({ color: 0xff0000 });
    this.mesh = new Mesh(geometry, material);
    this.mesh.position.copy(this.position);

    // Control visibility based on constructor argument
    this.mesh.visible = this.isVisible;
  }

  update(time) {
    // Update method to be called every frame, with 'time' being either performance.now() or similar
    this.moveWithNoise(time);
    this.mesh.position.copy(this.position);
  }

  moveWithNoise(time) {
    this.position.x = (this.noise.noise(time * this.noiseScale, 0) * 0.5 + 0.5) * (this.bounds.x[1] - this.bounds.x[0]) + this.bounds.x[0];
    this.position.y = (this.noise.noise(time * this.noiseScale, 1) * 0.5 + 0.5) * (this.bounds.y[1] - this.bounds.y[0]) + this.bounds.y[0];
    this.position.z = (this.noise.noise(time * this.noiseScale, 2) * 0.5 + 0.5) * (this.bounds.z[1] - this.bounds.z[0]) + this.bounds.z[0];
    this.mesh.position.copy(this.position);
  }

  calculateAttraction(boid) {
    const distanceVector = new Vector3().subVectors(this.position, boid.position);
    const distance = distanceVector.length();
    if (distance < this.range) {
      const force = distanceVector.normalize().multiplyScalar(this.strength);
      return force;
    }
    return new Vector3(0, 0, 0);
  }

  setVisible(isVisible) {
    this.mesh.visible = isVisible;
    this.isVisible = isVisible;
  }
}
