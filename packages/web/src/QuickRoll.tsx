import { useEffect, useState } from 'react';
import {
  MAX_MODIFIER_DICE,
  skillRoll,
  thresholdsFor,
  type Difficulty,
  type SkillRollResult,
} from 'coc7-engine';
import { rollDisplay } from './successLevel';
import { useRollLog } from './RollLogContext';
import { useLocale } from './i18n/LocaleContext';
import Die, { TOTAL_ANIMATION_MS } from './Die';
import ThresholdTrack from './ThresholdTrack';
import EldritchMark from './EldritchMark';

const DIFFICULTIES: Difficulty[] = ['regular', 'hard', 'extreme'];

export default function QuickRoll() {
  const { t } = useLocale();
  const [skill, setSkill] = useState(50);
  const [modifierDice, setModifierDice] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('regular');
  const [result, setResult] = useState<SkillRollResult | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const { addSkillEntry } = useRollLog();

  const thresholds = thresholdsFor(skill);

  function roll() {
    const next = skillRoll(skill, { modifierDice, difficulty });
    setResult(next);
    addSkillEntry(next);
    setRevealed(false);
    setSpinKey((k) => k + 1);
  }

  useEffect(() => {
    if (spinKey === 0) return;
    const timeout = window.setTimeout(() => setRevealed(true), TOTAL_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [spinKey]);

  const style = result ? rollDisplay(result, t) : null;
  const isFumble = revealed && result?.level === 'fumble';
  const isCritical = revealed && result?.level === 'critical';
  const chosenIndex = result ? result.candidates.indexOf(result.roll) : -1;
  const multiCandidate = (result?.candidates.length ?? 0) > 1;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-7 px-4 py-6">
      <div className="grid grid-cols-[1fr_auto] items-end gap-4 border-b border-ink-line pb-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-paper-dim">
            {t.quickRoll.skillValue}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={skill}
            onChange={(e) => setSkill(Number(e.target.value))}
            className="border-0 border-b border-ink-line bg-transparent pb-1 font-display text-4xl text-paper outline-none focus:border-brass"
          />
        </label>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-paper-dim">
            {t.quickRoll.dice}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={t.quickRoll.fewerBonusMorePenalty}
              onClick={() => setModifierDice((m) => Math.max(-MAX_MODIFIER_DICE, m - 1))}
              className="h-9 w-9 border border-ink-line text-paper-dim transition-colors hover:border-brass hover:text-paper"
            >
              −
            </button>
            <span
              className={`min-w-[76px] text-center text-[13px] ${
                modifierDice > 0 ? 'text-verdigris' : modifierDice < 0 ? 'text-oxblood' : 'text-paper'
              }`}
            >
              {modifierDice === 0
                ? t.quickRoll.noModifierDice
                : modifierDice > 0
                  ? t.quickRoll.bonusDice(modifierDice)
                  : t.quickRoll.penaltyDice(modifierDice)}
            </span>
            <button
              type="button"
              aria-label={t.quickRoll.moreBonusFewerPenalty}
              onClick={() => setModifierDice((m) => Math.min(MAX_MODIFIER_DICE, m + 1))}
              className="h-9 w-9 border border-ink-line text-paper-dim transition-colors hover:border-brass hover:text-paper"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={`flex-1 border py-2 text-xs uppercase tracking-wider transition-colors ${
              difficulty === d ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
            }`}
          >
            {t.difficulty[d]}
          </button>
        ))}
      </div>

      <div className="flex min-h-[200px] flex-col items-center justify-center gap-5 py-2">
        {result && (
          <div className="flex min-h-[76px] items-center gap-3">
            {result.raw.tens.map((tensValue, i) => (
              <Die
                key={i}
                value={tensValue}
                variant="tens"
                spinKey={spinKey}
                size="md"
                kind={t.quickRoll.tensLabel}
                kept={multiCandidate && i === chosenIndex}
                discarded={multiCandidate && i !== chosenIndex}
              />
            ))}
            <span className="self-center text-base text-paper-dim">+</span>
            <Die
              value={result.raw.units}
              variant="units"
              spinKey={spinKey}
              size="md"
              kind={t.quickRoll.unitsLabel}
            />
          </div>
        )}

        {result && style && (
          <div
            className={`relative text-center transition-all duration-300 ${
              revealed ? 'opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            {isFumble && (
              <EldritchMark
                size={140}
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-oxblood opacity-25"
              />
            )}
            <div
              className={`font-display text-7xl leading-none ${style.textClass} ${
                isFumble ? 'result-fracture' : ''
              } ${result.level === 'hard' ? 'opacity-80' : ''}`}
            >
              {result.roll}
            </div>
            <div
              className={`relative mt-2.5 inline-block text-[11px] font-semibold uppercase tracking-[.22em] ${style.textClass} ${
                isCritical ? 'result-critical-flourish' : ''
              } ${isFumble ? 'tracking-[.4em]' : ''}`}
            >
              {style.label}
            </div>
            {multiCandidate && (
              <div className="mt-1.5 text-[10px] tracking-wider text-paper-dim">
                {t.quickRoll.candidates(result.candidates.join(' · '))}
              </div>
            )}
          </div>
        )}
      </div>

      <ThresholdTrack
        regular={thresholds.regular}
        hard={thresholds.hard}
        extreme={thresholds.extreme}
        roll={revealed ? result?.roll : undefined}
        fumble={isFumble}
      />

      <button
        type="button"
        onClick={roll}
        className="mt-2 w-full border border-brass py-[19px] text-xs font-semibold uppercase tracking-[.28em] text-brass transition-colors hover:bg-brass hover:text-ink"
      >
        {t.quickRoll.roll}
      </button>
    </div>
  );
}
