import { Direction } from './constants';

export interface GridPos {
  x: number;
  z: number;
}

export enum CharacterState {
  Idle = 'idle',
  Walking = 'walking',
  Resting = 'resting',
  Ghost = 'ghost',
  Dead = 'dead',
}

export type CharacterType = 'grandpa' | 'grandma';
export type AnimalType = 'chicken' | 'cat';

export interface StepAnimation {
  phase: 'lead' | 'pause' | 'trail' | 'rest';
  elapsed: number;
  from: GridPos;
  to: GridPos;
  direction: Direction;
}

export interface TrailSegment {
  animal: any; // Animal entity reference
  targetPos: GridPos;
  currentPos: GridPos;
}
