
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  PointLight,
  Clock,
  Vector2,
  PlaneGeometry,
  MeshBasicMaterial,
  CircleGeometry,
  SphereGeometry,
  Spherical,
  Vector3
} from 'three'
import { matrix, multiply } from 'mathjs';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { SampleShaderMaterial } from './materials/SampleShaderMaterial'
import { gltfLoader } from './loaders'
import { getAngle } from './utils/index.js'

class App {
  #resizeCallback = () => this.#onResize()

  constructor(container, opts = { physics: false, debug: false }) {
    this.container = document.querySelector(container)
    this.screen = new Vector2(this.container.clientWidth, this.container.clientHeight)

    this.hasPhysics = opts.physics
    this.hasDebug = opts.debug

    // Simulation Variables // TODO add ui
    this.lakeRadius = 5;
    this.duckSpeed = 0.3;
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

    // this.#createBox()
    // this.#createShadedBox()
    this.#createTarget();
    this.#createLake()
    this.#createDuck()
    this.#createFox()
    this.#createLight()
    this.#createFloor()
    this.#createClock()
    this.#addListeners()
    this.#createControls()

    // await this.#loadModel()

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

    console.log(this)
  }

  destroy() {
    this.renderer.dispose()
    this.#removeListeners()
  }

  #update() {
    const elapsed = this.clock.getElapsedTime()

    if (this.shadedBox) {
      this.shadedBox.rotation.y = elapsed
      this.shadedBox.rotation.z = elapsed * 0.6
    }

    this.#updateSimulation()

    this.simulation?.update()
  }

  #timeScale = 0.5;

  #updateSimulation() {
    // Update fox and duck position

    // Make the duck go in the opposite direction of the fox
    const duckDirection = new Vector3()
    duckDirection.copy(this.duck.position)
    duckDirection.sub(this.fox.position);
    duckDirection.y = 0;  // do not change the y direction
    duckDirection.normalize();

    const duckRotation = matrix([
      [this.duck.position.x], [this.duck.position.z]]
    );

    const movement = duckDirection.multiplyScalar(this.duck.speed * this.stepSize * this.#timeScale);
    // const movement = duckDirection.multiplyScalar(this.duck.speed * this.stepSize );
    this.duck.position.add(movement);

    // Get the point on the lake's radius where the duck is going towards
    const sphericalDuckPos = new Spherical();
    sphericalDuckPos.setFromVector3(this.duck.position);
    const duckAngle = getAngle(sphericalDuckPos.theta);
    const duckRadius = sphericalDuckPos.radius;

    // The point on the perimeter where the duck should head to
    const targetPoint = new Spherical(this.lakeRadius, Math.PI / 2, duckAngle);
    this.target.position.setFromSpherical(targetPoint);

    // Get the direction of the fox around the lake
    const sphericalFoxPos = new Spherical();
    sphericalFoxPos.setFromVector3(this.fox.position);
    const foxAngle = sphericalFoxPos.theta;
    const foxRotation = matrix(
      [
        [Math.cos(foxAngle), Math.sin(foxAngle)],
        [-Math.sin(foxAngle), Math.cos(foxAngle)]
      ]
    );

    // Calculate the change in direction, position of the duck
    const tempDuckRotation = multiply(foxRotation, duckRotation);
    const tempDuckPos = new Vector3(tempDuckRotation.get([0, 0]), 0, tempDuckRotation.get([1, 0]));
    const tempDuckPosSpherical = new Spherical().setFromVector3(tempDuckPos);
    const deltaTheta = tempDuckPosSpherical.theta;
    // if deltaTheta > PI || deltaTHea < 0 => move clockwise
    const direction = deltaTheta < 0 || deltaTheta > Math.PI ? -1 : 1;

    console.log({ direction, deltaTheta, foxAngle, deltaTheta });

    // Move the fox in the direction of the duck
    const angularVel = this.foxSpeed / this.lakeRadius
    const newFoxAngle = foxAngle + (direction * angularVel * this.stepSize * this.#timeScale)
    this.fox.position.setFromSpherical(new Spherical(this.lakeRadius, Math.PI / 2, newFoxAngle))
    this.fox.position.add(new Vector3(0, 0.25, 0));


    // TODO
    // Check if the duck can make it to the shore before the fox
    // If it can then just go straight

    // // Example Cartesian coordinates (x, y, z)
    // let point = new Vector3(10, 0, 10);
    // // Convert to spherical coordinates
    // let spherical = new Spherical();
    // spherical.setFromVector3(point);
    // // Convert to Cartesian coordinates using setFromSpherical()
    // let cartesian = new Vector3().setFromSpherical(spherical);


    if (duckRadius >= this.lakeRadius) {
      this.duck.position.add(new Vector3(0, 0.01, 0))
    }


  }



  #render() {
    this.renderer.render(this.scene, this.camera)
  }

  #createScene() {
    this.scene = new Scene()
  }

  #createCamera() {
    this.camera = new PerspectiveCamera(75, this.screen.x / this.screen.y, 0.1, 100)
    this.camera.position.set(0, 20, 0)
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

  /**
   * Create a box with a PBR material
   */
  #createBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1)

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.35
    })

    this.box = new Mesh(geometry, material)
    this.box.position.x = -1.5
    this.box.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    )

    this.scene.add(this.box)

    if (!this.hasPhysics) return

    const body = new this.PhysicsBox(this.box, this.scene)
    this.simulation.addItem(body)
  }

  /**
   * Create a box with a custom ShaderMaterial
   */
  #createShadedBox() {
    const geometry = new BoxGeometry(1, 1, 1, 1, 1, 1)

    this.shadedBox = new Mesh(geometry, SampleShaderMaterial)
    this.shadedBox.position.x = 1.5

    this.scene.add(this.shadedBox)
  }

  #createLake() {
    const radius = this.lakeRadius;
    const geometry = new CircleGeometry(radius, 32); // Radius 5 for diameter of 10
    const material = new MeshBasicMaterial({ color: 0x0000ff });
    const disc = new Mesh(geometry, material);
    this.lake = disc;
    this.lake.position.set(0, 0.01, 0);
    disc.rotation.x = -Math.PI / 2;
    this.scene.add(this.lake);
  }

  #createTarget() {
    const radius = 0.125;
    const geometry = new SphereGeometry(radius, 32)
    const material = new MeshBasicMaterial({ color: 0xff0000 });
    this.target = new Mesh(geometry, material)
    this.target.position.set(0, radius, 0)
    this.scene.add(this.target);
  }

  #createDuck() {
    const geometry = new SphereGeometry(0.25, 32, 32);
    const material = new MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new Mesh(geometry, material);
    this.duck = sphere;

    this.duck.speed = this.duckSpeed;
    this.duck.direction = new Vector3(0, 0, 0);

    this.duck.position.y = 0.25; // Adjust height above disc
    this.scene.add(this.duck);
  }

  #createFox() {
    const foxSize = 0.5;
    const geometry = new BoxGeometry(foxSize, foxSize, foxSize); // Create a thin square
    const material = new MeshBasicMaterial({ color: 0xffa500 });
    const square = new Mesh(geometry, material);
    this.fox = square;

    this.fox.speed = this.foxSpeed;
    this.fox.direction = new Vector3(0, 0, 0);

    this.fox.position.set(-this.lakeRadius, foxSize / 2, 0); // Position on the perimeter of the disc
    this.fox.rotation.y = Math.PI / 4; // Optional rotation for aesthetics
    this.scene.add(this.fox);
  }

  #createFloor() {
    if (!this.hasPhysics) return

    const geometry = new PlaneGeometry(20, 20, 1, 1)
    const material = new MeshBasicMaterial({ color: 0x629928 })

    this.floor = new Mesh(geometry, material)
    this.floor.rotateX(-Math.PI * 0.5)
    this.floor.position.set(0, 0, 0)

    this.scene.add(this.floor)

    const body = new this.PhysicsFloor(this.floor, this.scene)
    this.simulation.addItem(body)
  }

  /**
   * Load a 3D model and append it to the scene
   */
  async #loadModel() {
    const gltf = await gltfLoader.load('/suzanne.glb')

    const mesh = gltf.scene.children[0]
    mesh.position.z = 1.5

    mesh.material = SampleShaderMaterial.clone()
    mesh.material.wireframe = true

    this.scene.add(mesh)
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
