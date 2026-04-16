import { CELL_SIZE, GRID_WIDTH, GRID_HEIGHT } from '../constants';
import { GridPos } from '../types';

export function gridToWorld(gx: number, gz: number): { x: number; z: number } {
  const offsetX = (GRID_WIDTH * CELL_SIZE) / 2;
  const offsetZ = (GRID_HEIGHT * CELL_SIZE) / 2;
  return {
    x: gx * CELL_SIZE - offsetX + CELL_SIZE / 2,
    z: gz * CELL_SIZE - offsetZ + CELL_SIZE / 2,
  };
}

export function worldToGrid(wx: number, wz: number): GridPos {
  const offsetX = (GRID_WIDTH * CELL_SIZE) / 2;
  const offsetZ = (GRID_HEIGHT * CELL_SIZE) / 2;
  return {
    x: Math.round((wx + offsetX - CELL_SIZE / 2) / CELL_SIZE),
    z: Math.round((wz + offsetZ - CELL_SIZE / 2) / CELL_SIZE),
  };
}

export function isInBounds(pos: GridPos): boolean {
  return pos.x >= 1 && pos.x < GRID_WIDTH - 1 && pos.z >= 1 && pos.z < GRID_HEIGHT - 1;
}

export function gridDistance(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

export function samePos(a: GridPos, b: GridPos): boolean {
  return a.x === b.x && a.z === b.z;
}
