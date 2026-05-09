export const VOCAB = {
  // {location} is now substituted from the current room type (see ROOM_NAMES
  // in lib/data/events.ts). This pool is kept as a fallback for rolls without
  // operative position info (e.g. tests).
  locations: [
    "corridor",
    "supply corridor",
    "service tunnel",
  ],
  brands: [
    "Korvex",
    "Halberd",
    "Drennan & Sons",
    "AMARO-9",
    "Iverson Logistics",
    "Pyrelock",
    "Sigma Civic",
  ],
  item_adjectives: [
    "scuffed",
    "factory-sealed",
    "blood-tacky",
    "half-charged",
    "labelled in cyrillic",
    "hand-wrapped in tape",
    "cold to the touch",
    "stamped 2087",
  ],
  npc_names: [
    "two contractors",
    "a lone scavver",
    "a corp patrol",
    "a stripped drone",
    "a foreman in coveralls",
    "three masked figures",
  ],
  conditions: [
    "dust hangs in the air",
    "emergency lights flicker",
    "the floor is wet",
    "everything smells like ozone",
    "rain ticks against the roof",
    "something is humming in the wall",
  ],
};

export type VocabKey = keyof typeof VOCAB;

export function pickVocab(key: VocabKey, rand: () => number): string {
  const arr = VOCAB[key];
  return arr[Math.floor(rand() * arr.length)];
}
