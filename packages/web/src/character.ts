import { derivedStats, maxSanity, type Characteristics } from 'coc7-engine';

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

/**
 * Ready-to-play investigators for a haunted-house one-shot. Original archetypes, not
 * reproductions of any published scenario's pregens — see CLAUDE.md's Legal note: Chaosium's
 * trademarks and specific rules/scenario text aren't ours to reproduce, so these are built from
 * scratch rather than copied from an existing module.
 *
 * Flavor text (name, occupation, notes, inventory, weapon display name) lives in
 * `Translations.pregens` so it's localized; only the mechanical shape lives here.
 */
export interface PregenTemplate {
  key: string;
  characteristics: Characteristics;
  age: number;
  /** Overrides on top of DEFAULT_SKILLS, keyed the same way. */
  skillOverrides: Record<string, number>;
  luck: number;
  weapon?: { skillKey: string; damage: string };
}

export const PREGEN_TEMPLATES: PregenTemplate[] = [
  {
    key: 'doctor',
    characteristics: { STR: 50, CON: 55, SIZ: 55, DEX: 55, APP: 60, INT: 75, POW: 65, EDU: 85 },
    age: 38,
    luck: 55,
    skillOverrides: {
      firstAid: 80,
      medicine: 70,
      psychology: 60,
      spotHidden: 40,
      listen: 40,
      libraryUse: 50,
      persuade: 45,
      science: 55,
      dodge: 35,
      languageOwn: 85,
    },
  },
  {
    key: 'reporter',
    characteristics: { STR: 55, CON: 60, SIZ: 60, DEX: 65, APP: 55, INT: 70, POW: 55, EDU: 70 },
    age: 27,
    luck: 60,
    skillOverrides: {
      libraryUse: 65,
      fastTalk: 60,
      spotHidden: 55,
      persuade: 55,
      psychology: 45,
      stealth: 40,
      driveAuto: 50,
      dodge: 40,
      languageOwn: 70,
    },
  },
  {
    key: 'privateInvestigator',
    characteristics: { STR: 60, CON: 65, SIZ: 55, DEX: 70, APP: 50, INT: 65, POW: 60, EDU: 65 },
    age: 34,
    luck: 55,
    skillOverrides: {
      spotHidden: 65,
      stealth: 55,
      psychology: 50,
      firearmsHandgun: 55,
      fightingBrawl: 50,
      libraryUse: 45,
      persuade: 40,
      dodge: 45,
      driveAuto: 55,
      languageOwn: 65,
    },
    weapon: { skillKey: 'firearmsHandgun', damage: '1d10' },
  },
  {
    key: 'scholarPriest',
    characteristics: { STR: 45, CON: 50, SIZ: 50, DEX: 45, APP: 55, INT: 80, POW: 75, EDU: 90 },
    age: 50,
    luck: 65,
    skillOverrides: {
      occult: 65,
      libraryUse: 70,
      persuade: 55,
      psychology: 55,
      cthulhuMythos: 5,
      firstAid: 40,
      dodge: 30,
      languageOwn: 90,
      languageOther: 50,
    },
  },
  {
    key: 'detective',
    characteristics: { STR: 65, CON: 70, SIZ: 65, DEX: 60, APP: 50, INT: 60, POW: 55, EDU: 60 },
    age: 41,
    luck: 50,
    skillOverrides: {
      firearmsHandgun: 65,
      spotHidden: 60,
      law: 50,
      intimidate: 55,
      psychology: 45,
      fightingBrawl: 55,
      driveAuto: 50,
      dodge: 40,
      languageOwn: 60,
    },
    weapon: { skillKey: 'firearmsHandgun', damage: '1d10' },
  },
  {
    key: 'rasmusDolk',
    characteristics: { STR: 80, CON: 60, SIZ: 50, DEX: 70, APP: 50, INT: 50, POW: 60, EDU: 40 },
    age: 36,
    luck: 50,
    skillOverrides: {
      fightingBrawl: 70,
      creditRating: 20,
      intimidate: 35,
      libraryUse: 50,
      disguise: 60,
      artCraft: 60,
      languageOwn: 40,
      stealth: 40,
      fastTalk: 60,
      spotHidden: 50,
      law: 40,
      psychology: 60,
      mechanicalRepair: 30,
      listen: 40,
      firearmsHandgun: 40,
      dodge: 30,
    },
    weapon: { skillKey: 'firearmsHandgun', damage: '1d10' },
  },
];

interface PregenFlavor {
  name: string;
  occupation: string;
  notes: string;
  inventory: string[];
  weaponName?: string;
}

export function createPregenInvestigator(
  template: PregenTemplate,
  skillLabels: Record<string, string>,
  flavor: PregenFlavor,
): Investigator {
  const base = createBlankInvestigator(skillLabels);
  const skills = base.skills.map((s) =>
    s.key && template.skillOverrides[s.key] !== undefined
      ? { ...s, value: template.skillOverrides[s.key] }
      : s,
  );
  const mythos = skills.find((s) => s.key === 'cthulhuMythos')?.value ?? 0;
  const derived = derivedStats(template.characteristics, template.age);
  const startingSan = Math.min(maxSanity(mythos), template.characteristics.POW);

  const weapons: CharacterWeapon[] = template.weapon
    ? [
        {
          id: makeId(),
          name: flavor.weaponName ?? template.weapon.skillKey,
          skill: skillLabels[template.weapon.skillKey] ?? template.weapon.skillKey,
          damage: template.weapon.damage,
        },
      ]
    : [];

  return {
    ...base,
    name: flavor.name,
    occupation: flavor.occupation,
    age: template.age,
    characteristics: template.characteristics,
    currentHp: derived.hitPoints,
    currentMp: derived.magicPoints,
    currentSan: startingSan,
    startingSan,
    sanLostThisSession: 0,
    currentLuck: template.luck,
    skills,
    weapons,
    inventory: flavor.inventory,
    notes: flavor.notes,
  };
}

/** Compose a rollable damage expression from a weapon's dice and the investigator's damage bonus. */
export function damageNotation(weaponDamage: string, damageBonus: string): string {
  const db = damageBonus.trim();
  if (db === '' || db === '0') return weaponDamage;
  return db.startsWith('-') ? `${weaponDamage}${db}` : `${weaponDamage}+${db}`;
}
