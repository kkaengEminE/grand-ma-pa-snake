import * as THREE from 'three';
import {
  INITIAL_ANIMAL_COUNT, ANIMAL_SPAWN_INTERVAL, MAX_ANIMALS_ON_FIELD,
  GRID_WIDTH, GRID_HEIGHT, BENCH_POSITIONS,
} from '../constants';
import { Animal } from '../entities/Animal';
import { AnimalType, GridPos } from '../types';
import { samePos } from '../world/Grid';

export class AnimalManager {
  animals: Animal[] = [];
  private scene: THREE.Scene;
  private spawnTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnInitial(): void {
    for (let i = 0; i < INITIAL_ANIMAL_COUNT; i++) {
      this.spawnAnimal();
    }
  }

  update(dt: number): void {
    this.spawnTimer += dt;

    const freeCount = this.animals.filter((a) => !a.collected).length;
    if (this.spawnTimer >= ANIMAL_SPAWN_INTERVAL && freeCount < MAX_ANIMALS_ON_FIELD) {
      this.spawnAnimal();
      this.spawnTimer = 0;
    }

    for (const animal of this.animals) {
      animal.update(dt);
    }
  }

  spawnAnimal(): Animal | null {
    const pos = this.getRandomFreePos();
    if (!pos) return null;

    const type: AnimalType = Math.random() > 0.35 ? 'chicken' : 'cat';
    const animal = new Animal(type, pos);
    this.animals.push(animal);
    this.scene.add(animal.group);
    return animal;
  }

  getFreeAnimals(): Animal[] {
    return this.animals.filter((a) => !a.collected);
  }

  dropAnimal(animal: Animal, pos: GridPos): void {
    animal.dropAt(pos);
    if (!this.animals.includes(animal)) {
      this.animals.push(animal);
      this.scene.add(animal.group);
    }
  }

  removeAnimalFromField(animal: Animal): void {
    animal.collected = true;
    animal.group.visible = false;
  }

  private getRandomFreePos(): GridPos | null {
    for (let attempt = 0; attempt < 50; attempt++) {
      const pos: GridPos = {
        x: 2 + Math.floor(Math.random() * (GRID_WIDTH - 4)),
        z: 2 + Math.floor(Math.random() * (GRID_HEIGHT - 4)),
      };

      // Avoid bench positions
      if (BENCH_POSITIONS.some((b) => Math.abs(b.x - pos.x) < 2 && Math.abs(b.z - pos.z) < 2)) {
        continue;
      }

      // Avoid existing animals
      if (this.animals.some((a) => !a.collected && samePos(a.gridPos, pos))) {
        continue;
      }

      return pos;
    }
    return null;
  }
}
