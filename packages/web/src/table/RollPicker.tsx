import { useState } from 'react';
import { maxSanity, parseSanityLoss, type Characteristics, type Difficulty } from 'coc7-engine';
import { useLocale } from '../i18n/LocaleContext';
import type { Investigator } from '../character';
import Drawer from './Drawer';
import { FIELD, GHOST_BTN } from './styles';

type PickerTab = 'skills' | 'characteristics' | 'sanity';

// Same order as the Characteristics list on the Characters sheet.
const CHAR_KEYS: (keyof Characteristics)[] = ['STR', 'CON', 'DEX', 'INT', 'SIZ', 'POW', 'APP', 'EDU'];

/** Printed "lost on success / lost on failure" values that come up most often. */
const COMMON_LOSSES = ['0/1', '0/1d3', '1/1d4', '1/1d6', '1d3/1d6', '1d4/1d10', '1d6/1d20'];

/** A row like the ones on the Characters sheet: a name, a value, and a Roll button. The whole row
 * is the tap target. */
function ValueRow({ name, value, onRoll }: { name: string; value: number; onRoll: () => void }) {
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
 * The investigator's rolls in a side panel, in the same groups as the Characters sheet: Skills (with
 * a search box), Characteristics (plus Luck), and a Sanity check. Tapping a row rolls it at once, with
 * the difficulty and Secret setting at the top of the panel; the panel then closes so the result,
 * which lands just below the dice, is what's on screen.
 */
export default function RollPicker({
  character,
  difficulty,
  onDifficulty,
  secret,
  onSecret,
  onRollValue,
  onSanityCheck,
  onClose,
}: {
  character: Investigator;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  secret: boolean;
  onSecret: (secret: boolean) => void;
  /** Roll `value` as a skill roll labelled `label`. */
  onRollValue: (label: string, value: number) => void;
  onSanityCheck: (loss: string, secret: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<PickerTab>('skills');
  const [query, setQuery] = useState('');
  // A Sanity check is private by default: the Keeper sees it, the table doesn't, unless shared.
  const [sanitySecret, setSanitySecret] = useState(true);
  const [loss, setLoss] = useState('');
  const [lossError, setLossError] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const skills = needle ? character.skills.filter((s) => s.name.toLowerCase().includes(needle)) : character.skills;
  const mythos = character.skills.find((s) => s.key === 'cthulhuMythos')?.value ?? 0;

  function checkSanity(expression: string) {
    try {
      parseSanityLoss(expression);
    } catch (err) {
      setLossError(err instanceof Error ? err.message : t.sheet.sanLossPlaceholder);
      return;
    }
    onSanityCheck(expression.trim(), sanitySecret);
  }

  const tabs: { id: PickerTab; label: string }[] = [
    { id: 'skills', label: t.sheet.skills },
    { id: 'characteristics', label: t.sheet.characteristics },
    { id: 'sanity', label: t.sheet.san },
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

      {tab !== 'sanity' && (
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
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain px-4">
        {tab === 'skills' &&
          (skills.length === 0 ? (
            <p className="py-6 text-center text-sm text-paper-dim">{t.table.skillsNoMatch}</p>
          ) : (
            skills.map((skill) => (
              <ValueRow key={skill.id} name={skill.name} value={skill.value} onRoll={() => onRollValue(skill.name, skill.value)} />
            ))
          ))}

        {tab === 'characteristics' && (
          <>
            {CHAR_KEYS.map((key) => (
              <ValueRow
                key={key}
                name={t.characteristicNames[key]}
                value={character.characteristics[key]}
                onRoll={() => onRollValue(t.characteristicNames[key], character.characteristics[key])}
              />
            ))}
            <ValueRow
              name={t.sheet.luck}
              value={character.currentLuck}
              onRoll={() => onRollValue(t.sheet.luck, character.currentLuck)}
            />
          </>
        )}

        {tab === 'sanity' && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-2xl text-paper">
                {t.table.sanityCurrent(character.currentSan, maxSanity(mythos))}
              </span>
              <span className="text-[11px] text-paper-dim">{t.sheet.lostThisSession(character.sanLostThisSession)}</span>
            </div>

            <ValueRow
              name={t.table.sanityPlainRoll}
              value={character.currentSan}
              onRoll={() => onRollValue(t.sheet.san, character.currentSan)}
            />

            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider text-paper-dim">{t.sheet.sanityCheck}</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={loss}
                  onChange={(e) => {
                    setLoss(e.target.value);
                    setLossError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && loss.trim()) checkSanity(loss);
                  }}
                  placeholder={t.sheet.sanLossPlaceholder}
                  aria-label={t.sheet.sanLossPlaceholder}
                  className={`${FIELD} min-w-0 flex-1 px-3 py-2 text-sm`}
                />
                <button
                  type="button"
                  disabled={!loss.trim()}
                  onClick={() => checkSanity(loss)}
                  className="min-h-11 border border-brass px-4 text-xs font-semibold uppercase tracking-widest text-brass transition-colors enabled:hover:bg-brass enabled:hover:text-ink disabled:opacity-40"
                >
                  {t.sheet.check}
                </button>
              </div>
              {lossError && <span className="text-xs text-oxblood">{lossError}</span>}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="w-full text-[10px] uppercase tracking-wider text-paper-dim">{t.table.sanityCommonLosses}</span>
                {COMMON_LOSSES.map((expression) => (
                  <button
                    key={expression}
                    type="button"
                    onClick={() => checkSanity(expression)}
                    className={`min-h-10 px-3 text-xs ${GHOST_BTN}`}
                  >
                    {expression}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 pt-1 text-[11px] uppercase tracking-wider text-paper-dim">
                <input
                  type="checkbox"
                  checked={sanitySecret}
                  onChange={(e) => setSanitySecret(e.target.checked)}
                  className="h-4 w-4 accent-brass"
                />
                {t.table.secret}
              </label>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
