import { useState } from 'react';
import type { Characteristics, Difficulty } from 'coc7-engine';
import { useLocale } from '../i18n/LocaleContext';
import type { Investigator } from '../character';
import Drawer from './Drawer';
import { FIELD, GHOST_BTN } from './styles';

type PickerTab = 'characteristics' | 'skills';

// Same order as the Characteristics list on the Characters sheet.
const CHAR_KEYS: (keyof Characteristics)[] = ['STR', 'CON', 'DEX', 'INT', 'SIZ', 'POW', 'APP', 'EDU'];

/** A row like the ones on the Characters sheet: a name, a value, and a Roll button. The whole row
 * is the tap target. */
export function ValueRow({ name, value, onRoll }: { name: string; value: number; onRoll: () => void }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onRoll}
      className="group flex min-h-12 w-full items-center gap-3 border-b border-ink-line/60 py-2 text-left"
    >
      <span className="flex-1 truncate text-sm text-paper">{name}</span>
      <span className="w-10 text-right text-sm tabular-nums text-paper-dim">{value}</span>
      <span
        className={`px-2 py-1 text-[11px] uppercase tracking-wider transition-colors group-hover:bg-brass group-hover:text-ink ${GHOST_BTN}`}
      >
        {t.sheet.roll}
      </span>
    </button>
  );
}

/**
 * The investigator's rolls in a side panel, in the same groups as the Characters sheet:
 * Characteristics first, then Skills (with a search box). Tapping a row rolls it at once, with the
 * difficulty and Secret setting at the top of the panel; the panel then closes so the result,
 * which lands just below the dice, is what's on screen.
 */
export default function RollPicker({
  character,
  difficulty,
  onDifficulty,
  secret,
  onSecret,
  onRollValue,
  onClose,
}: {
  character: Investigator;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  secret: boolean;
  onSecret: (secret: boolean) => void;
  /** Roll `value` as a skill roll labelled `label`. */
  onRollValue: (label: string, value: number) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<PickerTab>('characteristics');
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const skills = needle ? character.skills.filter((s) => s.name.toLowerCase().includes(needle)) : character.skills;

  const tabs: { id: PickerTab; label: string }[] = [
    { id: 'characteristics', label: t.sheet.characteristics },
    { id: 'skills', label: t.sheet.skills },
  ];

  return (
    <Drawer title={character.name.trim() || t.characters.unnamed} onClose={onClose}>
      <div role="tablist" className="flex border-b border-ink-line">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`min-h-11 flex-1 border-b-2 px-1 text-[11px] uppercase tracking-wider transition-colors ${
              tab === x.id ? 'border-brass text-brass' : 'border-transparent text-paper-dim'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-b border-ink-line/60 px-4 py-3">
        {tab === 'skills' && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && skills[0]) onRollValue(skills[0].name, skills[0].value);
            }}
            placeholder={t.table.skillsSearch}
            aria-label={t.table.skillsSearch}
            enterKeyHint="go"
            className={`${FIELD} px-3 py-2 text-sm`}
          />
        )}
        <div className="flex gap-2">
          {(['regular', 'hard', 'extreme'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={difficulty === d}
              onClick={() => onDifficulty(d)}
              className={`min-h-10 flex-1 border py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
                difficulty === d ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
              }`}
            >
              {t.difficulty[d]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-paper-dim">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => onSecret(e.target.checked)}
            className="h-4 w-4 accent-brass"
          />
          {t.table.secret}
        </label>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4">
        {tab === 'characteristics' &&
          CHAR_KEYS.map((key) => (
            <ValueRow
              key={key}
              name={t.characteristicNames[key]}
              value={character.characteristics[key]}
              onRoll={() => onRollValue(t.characteristicNames[key], character.characteristics[key])}
            />
          ))}

        {tab === 'skills' &&
          (skills.length === 0 ? (
            <p className="py-6 text-center text-sm text-paper-dim">{t.table.skillsNoMatch}</p>
          ) : (
            skills.map((skill) => (
              <ValueRow key={skill.id} name={skill.name} value={skill.value} onRoll={() => onRollValue(skill.name, skill.value)} />
            ))
          ))}
      </div>
    </Drawer>
  );
}
