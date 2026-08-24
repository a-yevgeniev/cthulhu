import type { Characteristics } from 'coc7-engine';

export interface CharacterSkill {
  id: string;
  name: string;
  value: number;
  /** Marked when used this session — feeds the end-of-scenario improvement check. */
  checked: boolean;
}

export interface CharacterWeapon {
  id: string;
  name: string;
  /** Name of the skill in `skills` this weapon rolls against. */
  skill: string;
  /** Damage dice notation, e.g. "1d6" — the investigator's damage bonus is appended at roll time. */
  damage: string;
}

export interface Investigator {
  id: string;
  name: string;
  occupation: string;
  age: number;
  characteristics: Characteristics;
  currentHp: number;
  currentMp: number;
  currentSan: number;
  /** Sanity at campaign start, used for the indefinite-insanity threshold. */
  startingSan: number;
  /** SAN lost so far this session, used for the indefinite-insanity threshold. */
  sanLostThisSession: number;
  currentLuck: number;
  skills: CharacterSkill[];
  weapons: CharacterWeapon[];
  inventory: string[];
  notes: string;
}

/** Base chances from the 7e default skill list. Dodge and Language (Own) are
 * characteristic-derived (DEX/2, EDU) and left at 0 for the player to fill in. */
export const DEFAULT_SKILLS: Array<{ name: string; value: number }> = [
  { name: 'Accounting', value: 5 },
  { name: 'Anthropology', value: 1 },
  { name: 'Appraise', value: 5 },
  { name: 'Archaeology', value: 1 },
  { name: 'Art/Craft', value: 5 },
  { name: 'Charm', value: 15 },
  { name: 'Climb', value: 20 },
  { name: 'Credit Rating', value: 0 },
  { name: 'Cthulhu Mythos', value: 0 },
  { name: 'Disguise', value: 5 },
  { name: 'Dodge', value: 0 },
  { name: 'Drive Auto', value: 20 },
  { name: 'Electrical Repair', value: 10 },
  { name: 'Electronics', value: 1 },
  { name: 'Fast Talk', value: 5 },
  { name: 'Fighting (Brawl)', value: 25 },
  { name: 'Firearms (Handgun)', value: 20 },
  { name: 'Firearms (Rifle/Shotgun)', value: 25 },
  { name: 'First Aid', value: 30 },
  { name: 'History', value: 5 },
  { name: 'Intimidate', value: 15 },
  { name: 'Jump', value: 20 },
  { name: 'Language (Own)', value: 0 },
  { name: 'Language (Other)', value: 1 },
  { name: 'Law', value: 5 },
  { name: 'Library Use', value: 20 },
  { name: 'Listen', value: 20 },
  { name: 'Locksmith', value: 1 },
  { name: 'Mechanical Repair', value: 10 },
  { name: 'Medicine', value: 1 },
  { name: 'Natural World', value: 10 },
  { name: 'Navigate', value: 10 },
  { name: 'Occult', value: 5 },
  { name: 'Operate Heavy Machinery', value: 1 },
  { name: 'Persuade', value: 10 },
  { name: 'Pilot', value: 1 },
  { name: 'Psychology', value: 10 },
  { name: 'Psychoanalysis', value: 1 },
  { name: 'Ride', value: 5 },
  { name: 'Science', value: 1 },
  { name: 'Sleight of Hand', value: 10 },
  { name: 'Spot Hidden', value: 25 },
  { name: 'Stealth', value: 20 },
  { name: 'Survival', value: 10 },
  { name: 'Swim', value: 20 },
  { name: 'Throw', value: 20 },
  { name: 'Track', value: 10 },
];

export function makeId(): string {
  return crypto.randomUUID();
}

export function createBlankInvestigator(): Investigator {
  return {
    id: makeId(),
    name: '',
    occupation: '',
    age: 30,
    characteristics: { STR: 0, CON: 0, SIZ: 0, DEX: 0, APP: 0, INT: 0, POW: 0, EDU: 0 },
    currentHp: 0,
    currentMp: 0,
    currentSan: 0,
    startingSan: 0,
    sanLostThisSession: 0,
    currentLuck: 0,
    skills: DEFAULT_SKILLS.map((s) => ({ id: makeId(), name: s.name, value: s.value, checked: false })),
    weapons: [],
    inventory: [],
    notes: '',
  };
}

/** Compose a rollable damage expression from a weapon's dice and the investigator's damage bonus. */
export function damageNotation(weaponDamage: string, damageBonus: string): string {
  const db = damageBonus.trim();
  if (db === '' || db === '0') return weaponDamage;
  return db.startsWith('-') ? `${weaponDamage}${db}` : `${weaponDamage}+${db}`;
}
