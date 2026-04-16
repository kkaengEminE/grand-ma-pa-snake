// Grid & World
export const CELL_SIZE = 1.2;
export const GRID_WIDTH = 24;
export const GRID_HEIGHT = 24;
export const WALL_HEIGHT = 1.5;

// Character Movement (Step-matching timing in seconds)
export const STEP_PHASE1_DURATION = 0.15; // Leading foot forward
export const STEP_PAUSE_DURATION = 0.08;  // Brief pause mid-step
export const STEP_PHASE2_DURATION = 0.15; // Trailing foot catches up
export const STEP_REST_DURATION = 0.22;   // Rest before next step
export const STEP_TOTAL_DURATION =
  STEP_PHASE1_DURATION + STEP_PAUSE_DURATION + STEP_PHASE2_DURATION + STEP_REST_DURATION;

// HP System
export const MAX_HP = 100;
export const SWEAT_THRESHOLD = 5;         // Animal count to trigger sweat
export const HP_DECAY_RATE = 2;           // HP per second when sweating
export const BENCH_RECOVERY_TIME = 10;    // Seconds to full HP on bench
export const GHOST_DURATION = 2.5;        // Seconds of ghost after bench

// Bench
export const BENCH_MAX_SEATS = 3;
export const BENCH_POSITIONS = [
  { x: 4, z: 4 },
  { x: 19, z: 4 },
  { x: 4, z: 19 },
  { x: 19, z: 19 },
  { x: 12, z: 2 },
  { x: 12, z: 21 },
];

// Animals
export const INITIAL_ANIMAL_COUNT = 12;
export const ANIMAL_SPAWN_INTERVAL = 8;   // Seconds between spawns
export const MAX_ANIMALS_ON_FIELD = 20;

// NPC
export const NPC_COUNT = 3;
export const NPC_THINK_INTERVAL = 0.8;    // Seconds between AI decisions
export const NPC_BENCH_HP_THRESHOLD = 30; // HP below which NPC seeks bench

// Visual
export const OUTLINE_THICKNESS = 0.06;
export const CHARACTER_HEIGHT = 0.9;
export const ANIMAL_SIZE = 0.3;

// Colors
export const COLORS = {
  grass: 0x7BC67E,
  grassDark: 0x5A9E5A,
  wall: 0x8B7355,
  bench: 0xC4A882,
  benchSeat: 0x8B6914,

  grandpa: {
    body: 0x6B8E9B,     // Blue-grey vest
    pants: 0x5D4E37,    // Brown pants
    skin: 0xFFDBAC,
    hair: 0xCCCCCC,
    hat: 0x4A4A4A,
  },
  grandma: {
    body: 0xD4A5A5,     // Pink cardigan
    pants: 0x7B6B8D,    // Purple skirt
    skin: 0xFFDBAC,
    hair: 0xE8E8E8,
    scarf: 0xE8D5B7,
  },

  chicken: 0xFFF3E0,
  chickenComb: 0xFF5252,
  chickenBeak: 0xFFA726,
  cat: 0xFF9800,
  catStripe: 0xE65100,

  npc1: { body: 0x8D6E63, pants: 0x455A64 },
  npc2: { body: 0x78909C, pants: 0x5D4037 },
  npc3: { body: 0x9E9D24, pants: 0x37474F },

  paramedic: 0xFFFFFF,
  paramedicCross: 0xFF0000,

  basket: 0xC8A86E,
  sweat: 0x74B9FF,
  ghost: 0xA29BFE,
};

// Directions
export enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

export const DIR_VECTORS: Record<Direction, { x: number; z: number }> = {
  [Direction.Up]: { x: 0, z: -1 },
  [Direction.Right]: { x: 1, z: 0 },
  [Direction.Down]: { x: 0, z: 1 },
  [Direction.Left]: { x: -1, z: 0 },
};
