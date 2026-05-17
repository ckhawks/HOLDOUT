// Enemy stat blocks. The combat resolver reads from this catalog by
// archetypeId (stamped on MapTile.enemySpawn at map-gen). Slice 1 ships
// one entry (Grunt); Slices 3 adds Sniper + Brawler with intent enum.
//
// Generic stat shape — the resolver doesn't know "this is a Sniper." It
// reads { hp, accuracy, damage, ... } from the catalog. Adding a Veteran
// Grunt later = a new entry here, not an engine change.

export interface EnemyArchetype {
  id: string;
  name: string;
  hp: number;
  // Hit chance on the operative per attack (Slice 1: flat — no band yet).
  accuracy: number;
  // Damage range per landed hit. Resolver rolls uniformly inside.
  damageMin: number;
  damageMax: number;
}

export const ENEMIES: Record<string, EnemyArchetype> = {
  grunt: {
    id: "grunt",
    name: "Grunt",
    hp: 20,
    accuracy: 0.45,
    damageMin: 5,
    damageMax: 10,
  },
};

export function getEnemy(id: string): EnemyArchetype {
  return ENEMIES[id] ?? ENEMIES.grunt;
}
