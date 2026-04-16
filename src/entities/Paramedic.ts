import * as THREE from 'three';
import { COLORS, CHARACTER_HEIGHT, CELL_SIZE } from '../constants';
import { GridPos } from '../types';
import { gridToWorld } from '../world/Grid';
import { createToonMaterial, addOutlineToGroup } from '../shaders/ToonMaterial';
import type { Character } from './Character';

export class Paramedic {
  group: THREE.Group;
  stretcher: THREE.Group;
  active: boolean = false;
  private target: Character | null = null;
  private phase: 'approach' | 'pickup' | 'carry' | 'done' = 'done';
  private timer: number = 0;
  private startPos: THREE.Vector3 = new THREE.Vector3();
  private targetPos: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.stretcher = new THREE.Group();
    this.buildMesh();
    this.group.visible = false;
  }

  private buildMesh(): void {
    // Two paramedic figures
    for (let i = 0; i < 2; i++) {
      const medic = new THREE.Group();
      const bodyMat = createToonMaterial(COLORS.paramedic);
      const crossMat = createToonMaterial(COLORS.paramedicCross);

      // Body
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.45, 8),
        bodyMat,
      );
      torso.position.y = CHARACTER_HEIGHT - 0.35;
      medic.add(torso);

      // Red cross on chest
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.02),
        crossMat,
      );
      crossH.position.set(0, CHARACTER_HEIGHT - 0.3, 0.17);
      medic.add(crossH);
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.12, 0.02),
        crossMat,
      );
      crossV.position.set(0, CHARACTER_HEIGHT - 0.3, 0.17);
      medic.add(crossV);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 6),
        createToonMaterial(0xFFDBAC),
      );
      head.position.y = CHARACTER_HEIGHT + 0.02;
      medic.add(head);

      // Cap
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.08, 8),
        bodyMat,
      );
      cap.position.y = CHARACTER_HEIGHT + 0.16;
      medic.add(cap);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.35, 6);
      const pantsMat = createToonMaterial(0x2C3E50);
      const lLeg = new THREE.Mesh(legGeo, pantsMat);
      lLeg.position.set(-0.08, 0.18, 0);
      medic.add(lLeg);
      const rLeg = new THREE.Mesh(legGeo, pantsMat);
      rLeg.position.set(0.08, 0.18, 0);
      medic.add(rLeg);

      addOutlineToGroup(medic, 0.03);
      medic.position.x = i === 0 ? -0.6 : 0.6;
      this.group.add(medic);
    }

    // Stretcher
    const stretcherMat = createToonMaterial(0xEEEEEE);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.04, 0.4),
      stretcherMat,
    );
    base.position.y = 0.4;
    this.stretcher.add(base);

    // Handle bars
    const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6);
    const barMat = createToonMaterial(0x888888);
    const leftBar = new THREE.Mesh(barGeo, barMat);
    leftBar.rotation.z = Math.PI / 2;
    leftBar.position.set(0, 0.42, 0.17);
    this.stretcher.add(leftBar);
    const rightBar = new THREE.Mesh(barGeo, barMat);
    rightBar.rotation.z = Math.PI / 2;
    rightBar.position.set(0, 0.42, -0.17);
    this.stretcher.add(rightBar);

    addOutlineToGroup(this.stretcher, 0.02);
    this.group.add(this.stretcher);
  }

  dispatch(deadCharacter: Character): void {
    this.target = deadCharacter;
    this.active = true;
    this.phase = 'approach';
    this.timer = 0;
    this.group.visible = true;

    // Start from edge of field
    this.targetPos.copy(deadCharacter.group.position);
    this.startPos.set(this.targetPos.x + 15, 0, this.targetPos.z);
    this.group.position.copy(this.startPos);
  }

  update(dt: number): void {
    if (!this.active || !this.target) return;

    this.timer += dt;

    if (this.phase === 'approach') {
      const t = Math.min(this.timer / 1.5, 1);
      this.group.position.lerpVectors(this.startPos, this.targetPos, easeOut(t));
      // Running animation
      this.group.children.forEach((child, i) => {
        if (child instanceof THREE.Group && i < 2) {
          child.position.y = Math.abs(Math.sin(this.timer * 8)) * 0.05;
        }
      });

      if (t >= 1) {
        this.phase = 'pickup';
        this.timer = 0;
      }
    } else if (this.phase === 'pickup') {
      // Brief pause to pick up
      if (this.timer >= 0.8) {
        this.phase = 'carry';
        this.timer = 0;
        // Attach character to stretcher visually
        if (this.target) {
          this.target.group.visible = false;
        }
        this.startPos.copy(this.group.position);
        this.targetPos.set(this.startPos.x - 20, 0, this.startPos.z);
      }
    } else if (this.phase === 'carry') {
      const t = Math.min(this.timer / 2.0, 1);
      this.group.position.lerpVectors(this.startPos, this.targetPos, easeIn(t));

      if (t >= 1) {
        this.phase = 'done';
        this.active = false;
        this.group.visible = false;
        this.target = null;
      }
    }
  }

  isDone(): boolean {
    return this.phase === 'done';
  }
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeIn(t: number): number {
  return t * t * t;
}
