import * as THREE from 'three';
import { CELL_SIZE, COLORS, ANIMAL_SIZE } from '../constants';
import { GridPos, AnimalType } from '../types';
import { gridToWorld } from '../world/Grid';
import { createToonMaterial, addOutlineToGroup } from '../shaders/ToonMaterial';

export class Animal {
  group: THREE.Group;
  gridPos: GridPos;
  type: AnimalType;
  collected: boolean = false;
  private bobPhase: number = Math.random() * Math.PI * 2;
  private wanderTimer: number = 0;

  constructor(type: AnimalType, pos: GridPos) {
    this.type = type;
    this.gridPos = { ...pos };
    this.group = new THREE.Group();
    this.buildMesh();

    const world = gridToWorld(pos.x, pos.z);
    this.group.position.set(world.x, 0, world.z);
  }

  private buildMesh(): void {
    if (this.type === 'chicken') {
      this.buildChicken();
    } else {
      this.buildCat();
    }
    addOutlineToGroup(this.group, 0.03);
  }

  private buildChicken(): void {
    const bodyMat = createToonMaterial(COLORS.chicken);
    const combMat = createToonMaterial(COLORS.chickenComb);
    const beakMat = createToonMaterial(COLORS.chickenBeak);

    // Body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(ANIMAL_SIZE, 8, 6),
      bodyMat,
    );
    body.position.y = ANIMAL_SIZE + 0.05;
    body.scale.set(1, 0.9, 1.1);
    this.group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(ANIMAL_SIZE * 0.6, 8, 6),
      bodyMat,
    );
    head.position.set(0, ANIMAL_SIZE * 2 + 0.05, ANIMAL_SIZE * 0.3);
    this.group.add(head);

    // Comb
    const comb = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.1, 0.08),
      combMat,
    );
    comb.position.set(0, ANIMAL_SIZE * 2 + 0.2, ANIMAL_SIZE * 0.3);
    this.group.add(comb);

    // Beak
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.08, 4),
      beakMat,
    );
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, ANIMAL_SIZE * 2, ANIMAL_SIZE * 0.65);
    this.group.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.02, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.06, ANIMAL_SIZE * 2 + 0.05, ANIMAL_SIZE * 0.5);
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.06, ANIMAL_SIZE * 2 + 0.05, ANIMAL_SIZE * 0.5);
    this.group.add(rightEye);

    // Feet
    const footMat = createToonMaterial(COLORS.chickenBeak);
    const footGeo = new THREE.BoxGeometry(0.06, 0.02, 0.1);
    const leftFoot = new THREE.Mesh(footGeo, footMat);
    leftFoot.position.set(-0.08, 0.01, 0.02);
    this.group.add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, footMat);
    rightFoot.position.set(0.08, 0.01, 0.02);
    this.group.add(rightFoot);

    // Tail feathers
    const tailGeo = new THREE.ConeGeometry(0.06, 0.12, 4);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.rotation.x = 0.5;
    tail.position.set(0, ANIMAL_SIZE + 0.15, -ANIMAL_SIZE * 0.8);
    this.group.add(tail);
  }

  private buildCat(): void {
    const bodyMat = createToonMaterial(COLORS.cat);
    const stripeMat = createToonMaterial(COLORS.catStripe);

    // Body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(ANIMAL_SIZE * 0.7, ANIMAL_SIZE * 0.8, ANIMAL_SIZE * 1.4, 8),
      bodyMat,
    );
    body.rotation.x = Math.PI / 2;
    body.position.set(0, ANIMAL_SIZE + 0.05, 0);
    this.group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(ANIMAL_SIZE * 0.7, 8, 6),
      bodyMat,
    );
    head.position.set(0, ANIMAL_SIZE * 1.5, ANIMAL_SIZE * 0.8);
    this.group.add(head);

    // Ears (triangles)
    const earGeo = new THREE.ConeGeometry(0.06, 0.12, 4);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(-0.1, ANIMAL_SIZE * 2.0, ANIMAL_SIZE * 0.8);
    this.group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, bodyMat);
    rightEar.position.set(0.1, ANIMAL_SIZE * 2.0, ANIMAL_SIZE * 0.8);
    this.group.add(rightEar);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2ECC40 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, ANIMAL_SIZE * 1.55, ANIMAL_SIZE * 1.2);
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, ANIMAL_SIZE * 1.55, ANIMAL_SIZE * 1.2);
    this.group.add(rightEye);

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.4, 6);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.rotation.x = -0.8;
    tail.position.set(0, ANIMAL_SIZE + 0.2, -ANIMAL_SIZE * 1.0);
    this.group.add(tail);

    // Stripes on body
    const stripeGeo = new THREE.BoxGeometry(ANIMAL_SIZE * 1.6, 0.03, 0.06);
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(0, ANIMAL_SIZE + 0.15 + i * 0.07, i * 0.12 - 0.12);
      stripe.rotation.y = Math.PI / 2;
      this.group.add(stripe);
    }

    // Paws
    const pawGeo = new THREE.SphereGeometry(0.05, 6, 4);
    const pawMat = createToonMaterial(COLORS.chicken); // Cream colored paws
    const pawPositions = [[-0.12, 0.05, 0.15], [0.12, 0.05, 0.15], [-0.12, 0.05, -0.15], [0.12, 0.05, -0.15]];
    for (const [px, py, pz] of pawPositions) {
      const paw = new THREE.Mesh(pawGeo, pawMat);
      paw.position.set(px, py, pz);
      this.group.add(paw);
    }
  }

  update(dt: number): void {
    if (!this.collected) {
      // Idle bob animation
      this.bobPhase += dt * 2;
      this.group.position.y = Math.sin(this.bobPhase) * 0.03;

      // Slight wandering rotation for chickens
      if (this.type === 'chicken') {
        this.wanderTimer += dt;
        this.group.rotation.y += Math.sin(this.wanderTimer * 0.7) * 0.002;
      }
    }
  }

  setWorldPosition(x: number, z: number): void {
    this.group.position.x = x;
    this.group.position.z = z;
  }

  dropAt(pos: GridPos): void {
    this.collected = false;
    this.gridPos = { ...pos };
    const world = gridToWorld(pos.x, pos.z);
    this.group.position.set(world.x, 0, world.z);
    this.group.visible = true;
  }
}

export function createBasket(): THREE.Group {
  const group = new THREE.Group();
  const basketMat = createToonMaterial(COLORS.basket);

  // Basket body (open top box)
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.4), basketMat);
  bottom.position.y = 0.1;
  group.add(bottom);

  const wallGeo = new THREE.BoxGeometry(0.5, 0.2, 0.04);
  const frontWall = new THREE.Mesh(wallGeo, basketMat);
  frontWall.position.set(0, 0.2, 0.18);
  group.add(frontWall);
  const backWall = new THREE.Mesh(wallGeo, basketMat);
  backWall.position.set(0, 0.2, -0.18);
  group.add(backWall);

  const sideGeo = new THREE.BoxGeometry(0.04, 0.2, 0.4);
  const leftSide = new THREE.Mesh(sideGeo, basketMat);
  leftSide.position.set(-0.23, 0.2, 0);
  group.add(leftSide);
  const rightSide = new THREE.Mesh(sideGeo, basketMat);
  rightSide.position.set(0.23, 0.2, 0);
  group.add(rightSide);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8);
  const wheelMat = createToonMaterial(0x444444);
  const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
  leftWheel.rotation.z = Math.PI / 2;
  leftWheel.position.set(-0.28, 0.06, 0);
  group.add(leftWheel);
  const rightWheel = new THREE.Mesh(wheelGeo, wheelMat);
  rightWheel.rotation.z = Math.PI / 2;
  rightWheel.position.set(0.28, 0.06, 0);
  group.add(rightWheel);

  addOutlineToGroup(group, 0.02);
  return group;
}
