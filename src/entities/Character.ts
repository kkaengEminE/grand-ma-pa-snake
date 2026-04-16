import * as THREE from 'three';
import {
  CELL_SIZE, MAX_HP, SWEAT_THRESHOLD, HP_DECAY_RATE, GHOST_DURATION,
  STEP_PHASE1_DURATION, STEP_PAUSE_DURATION, STEP_PHASE2_DURATION, STEP_REST_DURATION,
  Direction, DIR_VECTORS, COLORS, CHARACTER_HEIGHT,
} from '../constants';
import { GridPos, CharacterState, CharacterType, StepAnimation } from '../types';
import { gridToWorld, isInBounds, samePos } from '../world/Grid';
import { createToonMaterial, addOutlineToGroup, setGroupOpacity } from '../shaders/ToonMaterial';
import type { Animal } from './Animal';

export class Character {
  group: THREE.Group;
  gridPos: GridPos;
  direction: Direction = Direction.Down;
  state: CharacterState = CharacterState.Idle;
  hp: number = MAX_HP;
  trail: Animal[] = [];
  pathHistory: GridPos[] = [];
  ghostTimer: number = 0;
  sweatActive: boolean = false;
  isPlayer: boolean = false;
  characterType: CharacterType;
  score: number = 0;

  private stepAnim: StepAnimation | null = null;
  private bodyGroup!: THREE.Group;
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  private sweatParticles: THREE.Mesh[] = [];
  private sweatTimer: number = 0;
  private bobPhase: number = 0;

  constructor(type: CharacterType, startPos: GridPos, colorOverride?: { body: number; pants: number }) {
    this.characterType = type;
    this.gridPos = { ...startPos };
    this.pathHistory = [{ ...startPos }];
    this.group = new THREE.Group();
    this.buildMesh(colorOverride);

    const world = gridToWorld(startPos.x, startPos.z);
    this.group.position.set(world.x, 0, world.z);
  }

  private buildMesh(colorOverride?: { body: number; pants: number }): void {
    this.bodyGroup = new THREE.Group();

    const skinColor = this.characterType === 'grandpa' ? COLORS.grandpa.skin : COLORS.grandma.skin;
    const bodyColor = colorOverride?.body ?? (this.characterType === 'grandpa' ? COLORS.grandpa.body : COLORS.grandma.body);
    const pantsColor = colorOverride?.pants ?? (this.characterType === 'grandpa' ? COLORS.grandpa.pants : COLORS.grandma.pants);
    const hairColor = this.characterType === 'grandpa' ? COLORS.grandpa.hair : COLORS.grandma.hair;

    const skinMat = createToonMaterial(skinColor);
    const bodyMat = createToonMaterial(bodyColor);
    const pantsMat = createToonMaterial(pantsColor);
    const hairMat = createToonMaterial(hairColor);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), skinMat);
    head.position.y = CHARACTER_HEIGHT;
    this.bodyGroup.add(head);

    // Hair / Hat
    if (this.characterType === 'grandpa') {
      const hat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.12, 8),
        createToonMaterial(COLORS.grandpa.hat),
      );
      hat.position.y = CHARACTER_HEIGHT + 0.16;
      this.bodyGroup.add(hat);
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), hairMat);
      hair.position.y = CHARACTER_HEIGHT + 0.05;
      hair.scale.set(1, 0.8, 1);
      this.bodyGroup.add(hair);

      const scarf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.12, 0.1, 8),
        createToonMaterial(COLORS.grandma.scarf),
      );
      scarf.position.y = CHARACTER_HEIGHT - 0.18;
      this.bodyGroup.add(scarf);
    }

    // Eyes (simple dots)
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.07, CHARACTER_HEIGHT + 0.02, 0.17);
    this.bodyGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.07, CHARACTER_HEIGHT + 0.02, 0.17);
    this.bodyGroup.add(rightEye);

    // Body (torso)
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.4, 8),
      bodyMat,
    );
    torso.position.y = CHARACTER_HEIGHT - 0.38;
    this.bodyGroup.add(torso);

    // Lower body (pants/skirt)
    if (this.characterType === 'grandma') {
      const skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, 0.25, 8),
        pantsMat,
      );
      skirt.position.y = CHARACTER_HEIGHT - 0.7;
      this.bodyGroup.add(skirt);
    }

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.35, 6);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.1, 0.18, 0);
    this.bodyGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.1, 0.18, 0);
    this.bodyGroup.add(this.rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.1, 0.06, 0.14);
    const shoeMat = createToonMaterial(0x3D3D3D);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.17, 0.02);
    this.leftLeg.add(leftShoe);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.17, 0.02);
    this.rightLeg.add(rightShoe);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.3, 6);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.25, CHARACTER_HEIGHT - 0.4, 0);
    leftArm.rotation.z = 0.2;
    this.bodyGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.25, CHARACTER_HEIGHT - 0.4, 0);
    rightArm.rotation.z = -0.2;
    this.bodyGroup.add(rightArm);

    addOutlineToGroup(this.bodyGroup);
    this.group.add(this.bodyGroup);

    // Sweat particles (hidden by default)
    for (let i = 0; i < 3; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color: COLORS.sweat, transparent: true, opacity: 0 }),
      );
      drop.position.set(
        (Math.random() - 0.5) * 0.4,
        CHARACTER_HEIGHT + 0.1 + i * 0.12,
        (Math.random() - 0.5) * 0.3,
      );
      this.sweatParticles.push(drop);
      this.group.add(drop);
    }
  }

  startStep(dir: Direction): boolean {
    if (this.state === CharacterState.Dead || this.state === CharacterState.Resting) return false;
    if (this.stepAnim) return false;

    const vec = DIR_VECTORS[dir];
    const target: GridPos = { x: this.gridPos.x + vec.x, z: this.gridPos.z + vec.z };

    if (!isInBounds(target)) return false;

    this.direction = dir;
    this.state = CharacterState.Walking;

    this.stepAnim = {
      phase: 'lead',
      elapsed: 0,
      from: { ...this.gridPos },
      to: target,
      direction: dir,
    };

    return true;
  }

  update(dt: number): void {
    this.updateStep(dt);
    this.updateSweat(dt);
    this.updateGhost(dt);
    this.updateFacing();
  }

  private updateStep(dt: number): void {
    if (!this.stepAnim) return;

    this.stepAnim.elapsed += dt;
    const anim = this.stepAnim;

    const fromWorld = gridToWorld(anim.from.x, anim.from.z);
    const toWorld = gridToWorld(anim.to.x, anim.to.z);

    if (anim.phase === 'lead') {
      const t = Math.min(anim.elapsed / STEP_PHASE1_DURATION, 1);
      const eased = easeInOut(t);
      // Move to midpoint
      this.group.position.x = fromWorld.x + (toWorld.x - fromWorld.x) * eased * 0.5;
      this.group.position.z = fromWorld.z + (toWorld.z - fromWorld.z) * eased * 0.5;
      // Leading leg animation
      this.leftLeg.rotation.x = -0.3 * eased;
      this.rightLeg.rotation.x = 0.15 * eased;
      // Body lean
      this.bodyGroup.rotation.z = 0.05 * eased;
      this.bodyGroup.position.y = -0.02 * eased;

      if (anim.elapsed >= STEP_PHASE1_DURATION) {
        anim.phase = 'pause';
        anim.elapsed = 0;
      }
    } else if (anim.phase === 'pause') {
      if (anim.elapsed >= STEP_PAUSE_DURATION) {
        anim.phase = 'trail';
        anim.elapsed = 0;
      }
    } else if (anim.phase === 'trail') {
      const t = Math.min(anim.elapsed / STEP_PHASE2_DURATION, 1);
      const eased = easeInOut(t);
      // Move from midpoint to target
      this.group.position.x = fromWorld.x + (toWorld.x - fromWorld.x) * (0.5 + eased * 0.5);
      this.group.position.z = fromWorld.z + (toWorld.z - fromWorld.z) * (0.5 + eased * 0.5);
      // Trailing leg catches up
      this.leftLeg.rotation.x = -0.3 * (1 - eased);
      this.rightLeg.rotation.x = 0.15 * (1 - eased);
      // Body straightens
      this.bodyGroup.rotation.z = 0.05 * (1 - eased);
      this.bodyGroup.position.y = -0.02 * (1 - eased);

      if (anim.elapsed >= STEP_PHASE2_DURATION) {
        anim.phase = 'rest';
        anim.elapsed = 0;
        // Snap to grid position
        this.gridPos = { ...anim.to };
        this.group.position.x = toWorld.x;
        this.group.position.z = toWorld.z;
        // Record path for trailing animals
        this.pathHistory.unshift({ ...this.gridPos });
        if (this.pathHistory.length > 50) this.pathHistory.pop();
      }
    } else if (anim.phase === 'rest') {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.bodyGroup.rotation.z = 0;
      this.bodyGroup.position.y = 0;

      if (anim.elapsed >= STEP_REST_DURATION) {
        this.stepAnim = null;
        this.state = CharacterState.Idle;
      }
    }
  }

  private updateSweat(dt: number): void {
    const wasSweat = this.sweatActive;
    this.sweatActive = this.trail.length >= SWEAT_THRESHOLD;

    if (this.sweatActive && this.state !== CharacterState.Resting) {
      this.hp = Math.max(0, this.hp - HP_DECAY_RATE * dt);
      this.sweatTimer += dt;

      for (let i = 0; i < this.sweatParticles.length; i++) {
        const p = this.sweatParticles[i];
        const mat = p.material as THREE.MeshBasicMaterial;
        const phase = (this.sweatTimer * 2 + i * 0.5) % 1;
        mat.opacity = Math.sin(phase * Math.PI) * 0.8;
        p.position.y = CHARACTER_HEIGHT + 0.1 + phase * 0.3;
      }
    } else {
      for (const p of this.sweatParticles) {
        (p.material as THREE.MeshBasicMaterial).opacity = 0;
      }
      this.sweatTimer = 0;
    }
  }

  private updateGhost(dt: number): void {
    if (this.state === CharacterState.Ghost) {
      this.ghostTimer -= dt;
      // Flickering transparency
      const flicker = Math.sin(this.ghostTimer * 8) * 0.3 + 0.5;
      setGroupOpacity(this.bodyGroup, flicker);

      if (this.ghostTimer <= 0) {
        this.ghostTimer = 0;
        this.state = CharacterState.Idle;
        setGroupOpacity(this.bodyGroup, 1.0);
      }
    }
  }

  private updateFacing(): void {
    const angles: Record<Direction, number> = {
      [Direction.Up]: Math.PI,
      [Direction.Right]: Math.PI / 2,
      [Direction.Down]: 0,
      [Direction.Left]: -Math.PI / 2,
    };
    const targetAngle = angles[this.direction];
    const current = this.bodyGroup.rotation.y;
    let diff = targetAngle - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.bodyGroup.rotation.y += diff * 0.2;
  }

  isMoving(): boolean {
    return this.stepAnim !== null;
  }

  canMove(): boolean {
    return !this.stepAnim && this.state !== CharacterState.Dead && this.state !== CharacterState.Resting;
  }

  startResting(): void {
    this.state = CharacterState.Resting;
    this.stepAnim = null;
    // Sit animation
    this.bodyGroup.position.y = -0.15;
    this.leftLeg.rotation.x = -Math.PI / 4;
    this.rightLeg.rotation.x = -Math.PI / 4;
  }

  stopResting(): void {
    this.hp = MAX_HP;
    this.state = CharacterState.Ghost;
    this.ghostTimer = GHOST_DURATION;
    // Stand up
    this.bodyGroup.position.y = 0;
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;
  }

  die(): void {
    this.state = CharacterState.Dead;
    this.stepAnim = null;
    // Collapse animation
    this.bodyGroup.rotation.x = Math.PI / 2;
    this.bodyGroup.position.y = -0.3;
    this.bodyGroup.position.z = 0.3;
  }

  dropAnimals(): Animal[] {
    const dropped = [...this.trail];
    this.trail = [];
    this.pathHistory = [{ ...this.gridPos }];
    return dropped;
  }

  collectAnimal(animal: Animal): void {
    this.trail.push(animal);
    this.score += 10;
  }

  isGhost(): boolean {
    return this.state === CharacterState.Ghost;
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
