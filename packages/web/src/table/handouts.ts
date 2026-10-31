import theEyeSign from '../assets/handouts/the-eye-sign.jpg';

/** The prepared scenarios a room can be opened for. The id is what the server stores on the
 * room; the display name lives in `Translations.scenarios`. */
export const SCENARIO_IDS = ['haunting'] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && (SCENARIO_IDS as readonly string[]).includes(value);
}

/** An image the Keeper can put in front of the whole table. Bundled with the app rather than
 * uploaded, so showing one only ever sends its id — see `HandoutState` in coc7-protocol.
 *
 * To add one: drop the file in `src/assets/handouts/`, add an entry here (ids are lowercase
 * letters, digits and hyphens — the server enforces that shape), and give it a title and alt
 * text in both locales under `Translations.handouts`. */
export interface Handout {
  id: string;
  scenario: ScenarioId;
  src: string;
}

export const HANDOUTS: Handout[] = [{ id: 'the-eye-sign', scenario: 'haunting', src: theEyeSign }];

/** A scenario room offers that scenario's handouts; an open table (no scenario) offers them all. */
export function handoutsFor(scenario: string | null): Handout[] {
  return scenario ? HANDOUTS.filter((h) => h.scenario === scenario) : HANDOUTS;
}

export function findHandout(id: string | null): Handout | undefined {
  return id ? HANDOUTS.find((h) => h.id === id) : undefined;
}
