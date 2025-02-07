
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  Mesh,
  PointLight,
  Clock,
  Vector2,
  PlaneGeometry,
  MeshBasicMaterial,
} from 'three'


import { Boid } from './objects/boid.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import { OrthographicCamera } from 'three';
import { TorusGeometry } from 'three';

class App {

  #boidsQty = 50;
  #boids = [];
  #obstacles = [];
  #planesGroup = new Mesh();

  constructor(container, opts = { physics: false, debug: false }) {
    this.container = document.querySelector(container)
    this.screen = new Vector2(this.container.clientWidth, this.container.clientHeight)

    this.hasPhysics = opts.physics
    this.hasDebug = opts.debug

    // Simulation Variables // TODO add ui
    this.lakeRadius = 5;
    this.duckSpeed = 1;
    this.stepSize = 0.1;
    this.foxSpeed = 1;
  }

  async init() {
    this.#createScene()
    this.#createCamera()
    this.#createRenderer()

    if (this.hasPhysics) {
      const { Simulation } = await import('./physics/Simulation')
      this.simulation = new Simulation(this)

      const { PhysicsBox } = await import('./physics/Box')
      const { PhysicsFloor } = await import('./physics/Floor')

      Object.assign(this, { PhysicsBox, PhysicsFloor })
    }

    this.#createLight();
    this.#createClock();
    this.#addListeners();
    this.#createControls();

    const boundingBoxSize = 500;
    this.#createBoids(boundingBoxSize / 2);
    this.#createBoidsBox(boundingBoxSize);
    this.#createObstacles();


    if (this.hasDebug) {
      const { Debug } = await import('./Debug.js')
      new Debug(this)

      const { default: Stats } = await import('stats.js')
      this.stats = new Stats()
      document.body.appendChild(this.stats.dom)
    }

    this.renderer.setAnimationLoop(() => {
      this.stats?.begin()

      this.#update()
      this.#render()

      this.stats?.end()
    })

  }

  destroy() {
    this.renderer.dispose()
    this.#removeListeners()
  }

  #update() {
    const elapsed = this.clock.getElapsedTime()

    this.#updateSimulation(elapsed);

    this.simulation?.update()
  }

  #updateSimulation(elapsedTime) {
    for (const boid of this.#boids) {
      boid.update(this.#boids, this.#obstacles, elapsedTime);
    }

    this.#planesGroup.rotation.z = elapsedTime * 0.06;
    this.#planesGroup.rotation.x = elapsedTime * 0.06;
  }



  #createBoids(maxRange = 200) {

    for (let i = 0; i < this.#boidsQty; i++) {
      const boid = new Boid();
      const boidMesh = boid.createBoid(maxRange);

      this.#boids[i] = boid;
      this.scene.add(boidMesh);
    }
  }


  #createBoidsBox(size) {

    const halfSize = size / 2;
    const frameMaterial = new MeshBasicMaterial({
      color: 0x00ffff,
      opacity: 0.1,
      // side: DoubleSide, 
      wireframe: true,
      transparent: true
    });

    // Function to create a single plane rotated appropriately to form the box
    const createPlane = (width, height, rotation, position, name) => {
      const geometry = new PlaneGeometry(width, height, 10, 10);
      const plane = new Mesh(geometry, frameMaterial);
      plane.name = name;
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


    this.scene.add(this.#planesGroup)

    // Add planes to the scene
    planes.forEach((plane, i) => {
      plane.repulsion = 5;
      this.#obstacles.push(plane);
      // const helper = new VertexNormalsHelper(plane, 100, 0xff0000);
      this.#planesGroup.add(plane);
      // this.scene.add(helper);
    });
  }

  #createObstacles() {

    const frameMaterial = new MeshBasicMaterial({
      color: 0x00ffff,
      opacity: 0.05,
      // side: DoubleSide, 
      wireframe: true
    });

    const tMesh = new Mesh(
      new TorusGeometry(80, 10, 22, 22),
      new MeshBasicMaterial({
        color: 0x02aacd,
        opacity: 0.05,
      })
    );
    tMesh.name = "basicObstacle";
    this.scene.add(tMesh);
    this.#obstacles.push(tMesh);
  }

  #resizeCallback = () => this.#onResize()

  #render() {
    this.renderer.render(this.scene, this.camera)
  }

  #createScene() {
    this.scene = new Scene()
  }

  #createCamera() {
    this.camera = new PerspectiveCamera(75, this.screen.x / this.screen.y, 0.1, 10000)
    // this.camera = new OrthographicCamera(-500, 500, 500, -500);
    this.camera.position.set(0, 0, 800)
  }

  #createRenderer() {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: window.devicePixelRatio === 1
    })

    this.container.appendChild(this.renderer.domElement)

    this.renderer.setSize(this.screen.x, this.screen.y)
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
    this.renderer.setClearColor(0x121212)
    this.renderer.physicallyCorrectLights = true
  }

  #createLight() {
    this.pointLight = new PointLight(0xff0055, 500, 100, 2)
    this.pointLight.position.set(0, 10, 13)
    this.scene.add(this.pointLight)
  }

  #createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
  }

  #createClock() {
    this.clock = new Clock()
  }

  #addListeners() {
    window.addEventListener('resize', this.#resizeCallback, { passive: true })
  }

  #removeListeners() {
    window.removeEventListener('resize', this.#resizeCallback, { passive: true })
  }

  #onResize() {
    this.screen.set(this.container.clientWidth, this.container.clientHeight)

    this.camera.aspect = this.screen.x / this.screen.y
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.screen.x, this.screen.y)
  }
}

window._APP_ = new App('#app', {
  physics: window.location.hash.includes('physics'),
  debug: window.location.hash.includes('debug')
})

window._APP_.init()
