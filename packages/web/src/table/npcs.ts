import type { Characteristics } from 'coc7-engine';
import type { ScenarioId } from './handouts';

/** A non-player character the Keeper can run from the Table screen: the numbers only. Names, the
 * Keeper's cues and the labels for each roll are text, so they live in both locales under
 * `Translations.npcs` (keyed by `id`, with each roll's name keyed by its own `id`).
 *
 * To add one: add an entry here and its text in both locales. */
export interface Npc {
  id: string;
  scenario: ScenarioId;
  characteristics: Characteristics;
  hp: number;
  mp: number;
  build: number;
  /** Dice notation, e.g. "1d4". */
  damageBonus: string;
  move: number;
  /** Sanity points; 0 here means he has none to speak of (a Sanity roll is not a thing for him). */
  sanity: number;
  /** "success/failure" Sanity loss for seeing him act. */
  sanLoss: string;
  /** Skill-style percentage rolls (fighting, dodge, skills), each with its own id for the label. */
  rolls: { id: string; value: number }[];
  /** The roll that is his attack, and what it does (dice only; his damage bonus is added). */
  attack: { rollId: string; damage: string };
  /** Dice notation for rolling his armour, when he has random armour. */
  armor?: string;
}

export const NPCS: Npc[] = [
  {
    id: 'corbitt',
    scenario: 'haunting',
    characteristics: { STR: 90, CON: 115, SIZ: 55, INT: 80, POW: 90, DEX: 35, APP: 5, EDU: 80 },
    hp: 16,
    mp: 18,
    build: 1,
    damageBonus: '1d4',
    move: 8,
    sanity: 0,
    sanLoss: '1/1d8',
    rolls: [
      { id: 'fighting', value: 50 },
      { id: 'dodge', value: 17 },
      { id: 'sleightOfHand', value: 30 },
      { id: 'intimidate', value: 64 },
      { id: 'cthulhuMythos', value: 17 },
      { id: 'stealth', value: 72 },
      { id: 'listen', value: 60 },
    ],
    attack: { rollId: 'fighting', damage: '1d3' },
    armor: '2d6',
  },
];

/** The characters a scenario room offers its Keeper. */
export function npcsFor(scenario: string | null): Npc[] {
  return scenario ? NPCS.filter((n) => n.scenario === scenario) : [];
}
