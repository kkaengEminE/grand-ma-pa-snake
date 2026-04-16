import { Direction } from '../constants';
import { GridPos, CharacterType, CharacterState } from '../types';
import { Character } from './Character';

export class Player extends Character {
  private keys: Set<string> = new Set();
  private inputQueue: Direction | null = null;
  wantsBench: boolean = false;

  constructor(type: CharacterType, startPos: GridPos) {
    super(type, startPos);
    this.isPlayer = true;
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);

      if (e.key === ' ' || e.key === 'Space') {
        this.wantsBench = true;
        e.preventDefault();
      }

      const dirMap: Record<string, Direction> = {
        ArrowUp: Direction.Up,
        ArrowRight: Direction.Right,
        ArrowDown: Direction.Down,
        ArrowLeft: Direction.Left,
        w: Direction.Up,
        d: Direction.Right,
        s: Direction.Down,
        a: Direction.Left,
      };
      if (dirMap[e.key] !== undefined) {
        this.inputQueue = dirMap[e.key];
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
      if (e.key === ' ' || e.key === 'Space') {
        this.wantsBench = false;
      }
    });
  }

  updateInput(): Direction | null {
    if (this.state === CharacterState.Resting || this.state === CharacterState.Dead) {
      this.inputQueue = null;
      return null;
    }

    // Check held keys for continuous movement
    const heldDirMap: Record<string, Direction> = {
      ArrowUp: Direction.Up,
      ArrowRight: Direction.Right,
      ArrowDown: Direction.Down,
      ArrowLeft: Direction.Left,
      w: Direction.Up,
      d: Direction.Right,
      s: Direction.Down,
      a: Direction.Left,
    };

    // Prioritize queued input, then held keys
    if (this.inputQueue !== null) {
      const dir = this.inputQueue;
      this.inputQueue = null;
      return dir;
    }

    for (const [key, dir] of Object.entries(heldDirMap)) {
      if (this.keys.has(key)) return dir;
    }

    return null;
  }

  clearInput(): void {
    this.inputQueue = null;
    this.wantsBench = false;
  }
}
