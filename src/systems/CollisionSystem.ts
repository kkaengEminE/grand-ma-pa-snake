import { Character } from '../entities/Character';
import { Animal } from '../entities/Animal';
import { Bench } from '../entities/Bench';
import { samePos, gridDistance } from '../world/Grid';
import { GridPos, CharacterState } from '../types';

export interface CollisionResult {
  characterDied: Character | null;
  animalsCollected: { character: Character; animal: Animal }[];
  benchInteractions: { character: Character; bench: Bench }[];
}

export function checkCollisions(
  characters: Character[],
  freeAnimals: Animal[],
  benches: Bench[],
): CollisionResult {
  const result: CollisionResult = {
    characterDied: null,
    animalsCollected: [],
    benchInteractions: [],
  };

  for (const character of characters) {
    if (character.state === CharacterState.Dead || character.state === CharacterState.Resting) {
      continue;
    }

    // Check animal collection
    for (const animal of freeAnimals) {
      if (animal.collected) continue;
      if (samePos(character.gridPos, animal.gridPos)) {
        result.animalsCollected.push({ character, animal });
      }
    }

    // Check bench proximity
    for (const bench of benches) {
      if (gridDistance(character.gridPos, bench.gridPos) <= 1) {
        const wantsBench = character.isPlayer
          ? (character as any).wantsBench
          : (character as any).wantsBenchNow?.();

        if (wantsBench && bench.hasFreeSeats() && character.state !== CharacterState.Ghost) {
          result.benchInteractions.push({ character, bench });
        }
      }
    }

    // Check character-character collision
    if (character.isGhost()) continue;

    for (const other of characters) {
      if (other === character) continue;
      if (other.state === CharacterState.Dead || other.state === CharacterState.Resting) continue;
      if (other.isGhost()) continue;

      // Head-on collision
      if (samePos(character.gridPos, other.gridPos)) {
        // Player dies on collision with NPC or NPC with larger trail
        if (character.isPlayer) {
          result.characterDied = character;
          break;
        }
      }

      // Check collision with other's trail
      for (const trailAnimal of other.trail) {
        if (samePos(character.gridPos, trailAnimal.gridPos)) {
          if (character.isPlayer) {
            result.characterDied = character;
          } else {
            result.characterDied = character;
          }
          break;
        }
      }

      if (result.characterDied) break;
    }

    // Check self-trail collision (skip first few segments)
    if (!result.characterDied && character.trail.length > 3) {
      for (let i = 3; i < character.trail.length; i++) {
        if (samePos(character.gridPos, character.trail[i].gridPos)) {
          result.characterDied = character;
          break;
        }
      }
    }

    if (result.characterDied) break;
  }

  return result;
}

export function checkNPCCollisions(
  npcs: Character[],
): Character | null {
  for (const npc of npcs) {
    if (npc.state === CharacterState.Dead || npc.state === CharacterState.Resting) continue;
    if (npc.isGhost()) continue;

    // NPC self-trail
    if (npc.trail.length > 3) {
      for (let i = 3; i < npc.trail.length; i++) {
        if (samePos(npc.gridPos, npc.trail[i].gridPos)) {
          return npc;
        }
      }
    }

    // NPC vs NPC collision
    for (const other of npcs) {
      if (other === npc) continue;
      if (other.state === CharacterState.Dead || other.state === CharacterState.Resting) continue;
      if (other.isGhost()) continue;

      if (samePos(npc.gridPos, other.gridPos)) {
        // The one with fewer animals dies
        return npc.trail.length <= other.trail.length ? npc : other;
      }

      // Check trail collision
      for (const animal of other.trail) {
        if (samePos(npc.gridPos, animal.gridPos)) {
          return npc;
        }
      }
    }
  }
  return null;
}
