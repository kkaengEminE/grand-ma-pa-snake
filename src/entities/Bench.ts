import * as THREE from 'three';
import { BENCH_MAX_SEATS, BENCH_RECOVERY_TIME, MAX_HP, CELL_SIZE } from '../constants';
import { GridPos, CharacterState } from '../types';
import { gridToWorld } from '../world/Grid';
import { createBenchMesh } from '../world/Field';
import type { Character } from './Character';

export class Bench {
  group: THREE.Group;
  gridPos: GridPos;
  seats: (Character | null)[] = new Array(BENCH_MAX_SEATS).fill(null);
  private restTimers: Map<Character, number> = new Map();

  constructor(pos: GridPos) {
    this.gridPos = { ...pos };
    this.group = createBenchMesh();

    const world = gridToWorld(pos.x, pos.z);
    this.group.position.set(world.x, 0, world.z);
  }

  hasFreeSeats(): boolean {
    return this.seats.some((s) => s === null);
  }

  sitDown(character: Character): boolean {
    const seatIdx = this.seats.indexOf(null);
    if (seatIdx === -1) return false;

    this.seats[seatIdx] = character;
    this.restTimers.set(character, 0);
    character.startResting();

    // Position character on the bench
    const world = gridToWorld(this.gridPos.x, this.gridPos.z);
    const seatOffset = (seatIdx - 1) * 0.5; // Spread seats along bench
    character.group.position.set(world.x + seatOffset, 0, world.z + 0.15);
    character.gridPos = { ...this.gridPos };

    return true;
  }

  update(dt: number): void {
    for (let i = 0; i < this.seats.length; i++) {
      const character = this.seats[i];
      if (!character) continue;

      const timer = (this.restTimers.get(character) || 0) + dt;
      this.restTimers.set(character, timer);

      // Gradually recover HP
      const recoveryRate = MAX_HP / BENCH_RECOVERY_TIME;
      character.hp = Math.min(MAX_HP, character.hp + recoveryRate * dt);

      // Auto stand up when fully rested
      if (timer >= BENCH_RECOVERY_TIME) {
        this.standUp(character);
      }
    }
  }

  standUp(character: Character): void {
    const idx = this.seats.indexOf(character);
    if (idx === -1) return;

    this.seats[idx] = null;
    this.restTimers.delete(character);
    character.stopResting();

    // Move character slightly in front of bench
    const world = gridToWorld(this.gridPos.x, this.gridPos.z);
    character.group.position.set(world.x, 0, world.z + CELL_SIZE);
    character.gridPos = { x: this.gridPos.x, z: this.gridPos.z + 1 };
  }

  isOccupiedBy(character: Character): boolean {
    return this.seats.includes(character);
  }

  getOccupantCount(): number {
    return this.seats.filter((s) => s !== null).length;
  }
}
