import {
  Direction, DIR_VECTORS, NPC_THINK_INTERVAL, NPC_BENCH_HP_THRESHOLD,
  GRID_WIDTH, GRID_HEIGHT,
} from '../constants';
import { GridPos, CharacterType, CharacterState } from '../types';
import { Character } from './Character';
import { isInBounds, gridDistance, samePos } from '../world/Grid';
import type { Animal } from './Animal';
import type { Bench } from './Bench';

export class NPC extends Character {
  private thinkTimer: number = 0;
  private targetDir: Direction = Direction.Down;
  private targetAnimal: Animal | null = null;
  private targetBench: Bench | null = null;

  constructor(
    type: CharacterType,
    startPos: GridPos,
    colorOverride: { body: number; pants: number },
  ) {
    super(type, startPos, colorOverride);
    this.targetDir = Math.floor(Math.random() * 4) as Direction;
  }

  updateAI(
    dt: number,
    freeAnimals: Animal[],
    benches: Bench[],
    allCharacters: Character[],
  ): Direction | null {
    if (this.state === CharacterState.Resting || this.state === CharacterState.Dead) {
      return null;
    }

    this.thinkTimer += dt;
    if (this.thinkTimer < NPC_THINK_INTERVAL) {
      return this.canMove() ? this.targetDir : null;
    }
    this.thinkTimer = 0;

    // Decision making
    if (this.hp < NPC_BENCH_HP_THRESHOLD && this.trail.length > 0) {
      // Seek bench when low HP and carrying animals
      return this.seekBench(benches);
    }

    // Seek nearest free animal
    return this.seekAnimal(freeAnimals, allCharacters);
  }

  wantsBenchNow(): boolean {
    return this.hp < NPC_BENCH_HP_THRESHOLD && this.trail.length > 0;
  }

  private seekBench(benches: Bench[]): Direction | null {
    const freeBenches = benches.filter((b) => b.hasFreeSeats());
    if (freeBenches.length === 0) {
      return this.wander();
    }

    let nearest: Bench | null = null;
    let nearestDist = Infinity;
    for (const bench of freeBenches) {
      const dist = gridDistance(this.gridPos, bench.gridPos);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = bench;
      }
    }

    if (nearest) {
      this.targetBench = nearest;
      return this.moveToward(nearest.gridPos);
    }
    return this.wander();
  }

  private seekAnimal(freeAnimals: Animal[], allCharacters: Character[]): Direction | null {
    if (freeAnimals.length === 0) return this.wander();

    // Find nearest uncollected animal
    let nearest: Animal | null = null;
    let nearestDist = Infinity;
    for (const animal of freeAnimals) {
      if (animal.collected) continue;
      const dist = gridDistance(this.gridPos, animal.gridPos);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = animal;
      }
    }

    if (nearest) {
      this.targetAnimal = nearest;
      return this.moveToward(nearest.gridPos);
    }
    return this.wander();
  }

  private moveToward(target: GridPos): Direction | null {
    const dx = target.x - this.gridPos.x;
    const dz = target.z - this.gridPos.z;

    const possibleDirs: Direction[] = [];

    if (dx > 0) possibleDirs.push(Direction.Right);
    else if (dx < 0) possibleDirs.push(Direction.Left);
    if (dz > 0) possibleDirs.push(Direction.Down);
    else if (dz < 0) possibleDirs.push(Direction.Up);

    // Shuffle preferred directions to avoid deterministic movement
    if (possibleDirs.length > 1 && Math.random() > 0.7) {
      possibleDirs.reverse();
    }

    // Try each direction, checking if it's in bounds
    for (const dir of possibleDirs) {
      const vec = DIR_VECTORS[dir];
      const next = { x: this.gridPos.x + vec.x, z: this.gridPos.z + vec.z };
      if (isInBounds(next)) {
        this.targetDir = dir;
        return dir;
      }
    }

    return this.wander();
  }

  private wander(): Direction | null {
    // Random direction change with bias toward continuing
    if (Math.random() > 0.3) {
      const vec = DIR_VECTORS[this.targetDir];
      const next = { x: this.gridPos.x + vec.x, z: this.gridPos.z + vec.z };
      if (isInBounds(next)) {
        return this.targetDir;
      }
    }

    // Pick a random valid direction
    const dirs = [Direction.Up, Direction.Right, Direction.Down, Direction.Left];
    const shuffled = dirs.sort(() => Math.random() - 0.5);
    for (const dir of shuffled) {
      const vec = DIR_VECTORS[dir];
      const next = { x: this.gridPos.x + vec.x, z: this.gridPos.z + vec.z };
      if (isInBounds(next)) {
        this.targetDir = dir;
        return dir;
      }
    }
    return null;
  }
}
