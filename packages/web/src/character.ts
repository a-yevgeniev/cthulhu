import type { Characteristics } from 'coc7-engine';

export interface CharacterSkill {
  id: string;
  name: string;
  /** Stable identifier for a default-list skill (e.g. 'cthulhuMythos'), used to find it by
   * meaning rather than by its localized display name. Absent on user-added custom skills. */
  key?: string;
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

/** Base chances from the 7e default skill list, keyed by a stable identifier so lookups
 * (e.g. finding Cthulhu Mythos) survive the display name being localized. Dodge and
 * Language (Own) are characteristic-derived (DEX/2, EDU) and left at 0 for the player to
 * fill in. Display names come from `Translations.skills[key]` — see i18n/translations.ts. */
export const DEFAULT_SKILLS: Array<{ key: string; value: number }> = [
  { key: 'accounting', value: 5 },
  { key: 'anthropology', value: 1 },
  { key: 'appraise', value: 5 },
  { key: 'archaeology', value: 1 },
  { key: 'artCraft', value: 5 },
  { key: 'charm', value: 15 },
  { key: 'climb', value: 20 },
  { key: 'creditRating', value: 0 },
  { key: 'cthulhuMythos', value: 0 },
  { key: 'disguise', value: 5 },
  { key: 'dodge', value: 0 },
  { key: 'driveAuto', value: 20 },
  { key: 'electricalRepair', value: 10 },
  { key: 'electronics', value: 1 },
  { key: 'fastTalk', value: 5 },
  { key: 'fightingBrawl', value: 25 },
  { key: 'firearmsHandgun', value: 20 },
  { key: 'firearmsRifleShotgun', value: 25 },
  { key: 'firstAid', value: 30 },
  { key: 'history', value: 5 },
  { key: 'intimidate', value: 15 },
  { key: 'jump', value: 20 },
  { key: 'languageOwn', value: 0 },
  { key: 'languageOther', value: 1 },
  { key: 'law', value: 5 },
  { key: 'libraryUse', value: 20 },
  { key: 'listen', value: 20 },
  { key: 'locksmith', value: 1 },
  { key: 'mechanicalRepair', value: 10 },
  { key: 'medicine', value: 1 },
  { key: 'naturalWorld', value: 10 },
  { key: 'navigate', value: 10 },
  { key: 'occult', value: 5 },
  { key: 'operateHeavyMachinery', value: 1 },
  { key: 'persuade', value: 10 },
  { key: 'pilot', value: 1 },
  { key: 'psychology', value: 10 },
  { key: 'psychoanalysis', value: 1 },
  { key: 'ride', value: 5 },
  { key: 'science', value: 1 },
  { key: 'sleightOfHand', value: 10 },
  { key: 'spotHidden', value: 25 },
  { key: 'stealth', value: 20 },
  { key: 'survival', value: 10 },
  { key: 'swim', value: 20 },
  { key: 'throwSkill', value: 20 },
  { key: 'track', value: 10 },
];

export function makeId(): string {
  return crypto.randomUUID();
}

export function createBlankInvestigator(skillLabels: Record<string, string>): Investigator {
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
    skills: DEFAULT_SKILLS.map((s) => ({
      id: makeId(),
      key: s.key,
      name: skillLabels[s.key] ?? s.key,
      value: s.value,
      checked: false,
    })),
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
