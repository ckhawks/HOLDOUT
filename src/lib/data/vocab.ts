export const VOCAB = {
  locations: [
    "loading bay",
    "shift office",
    "boiler room",
    "supply corridor",
    "collapsed catwalk",
    "rusted stairwell",
    "service tunnel",
    "old break room",
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
