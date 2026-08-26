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

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-zinc-400">{t.quickRoll.skillValue}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={skill}
          onChange={(e) => setSkill(Number(e.target.value))}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-4xl font-bold text-zinc-50 focus:border-violet-400 focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
        <button
          type="button"
          aria-label={t.quickRoll.fewerBonusMorePenalty}
          onClick={() => setModifierDice((m) => Math.max(-MAX_MODIFIER_DICE, m - 1))}
          className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800 text-xl text-zinc-100 active:bg-zinc-700"
        >
          −
        </button>
        <span className="text-center text-sm text-zinc-300">
          {modifierDice === 0 && t.quickRoll.noModifierDice}
          {modifierDice > 0 && t.quickRoll.bonusDice(modifierDice)}
          {modifierDice < 0 && t.quickRoll.penaltyDice(Math.abs(modifierDice))}
        </span>
        <button
          type="button"
          aria-label={t.quickRoll.moreBonusFewerPenalty}
          onClick={() => setModifierDice((m) => Math.min(MAX_MODIFIER_DICE, m + 1))}
          className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800 text-xl text-zinc-100 active:bg-zinc-700"
        >
          +
        </button>
      </div>

      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
              difficulty === d
                ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400'
            }`}
          >
            {t.difficulty[d]}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-zinc-500">
        {t.quickRoll.thresholds(thresholds.regular, thresholds.hard, thresholds.extreme)}
      </p>

      {result && style && (
        <div
          className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl px-6 py-8 transition-colors duration-300 ${revealed ? style.classes : 'bg-zinc-900 text-zinc-100'} ${
            isFumble ? 'result-fumble' : ''
          } ${isCritical ? 'result-critical' : ''}`}
        >
          <Die value={result.roll} sides={100} spinKey={spinKey} size="lg" />
          <span
            className={`text-lg font-semibold uppercase tracking-wide transition-opacity duration-200 ${revealed ? 'opacity-100' : 'opacity-0'}`}
          >
            {style.label}
          </span>
          {revealed && result.candidates.length > 1 && (
            <span className="text-xs opacity-80">
              {t.quickRoll.candidates(result.candidates.join(', '))}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={roll}
        className="w-full rounded-2xl bg-violet-500 py-5 text-xl font-bold text-white shadow-lg shadow-violet-950/50 transition-transform active:scale-[0.98] active:bg-violet-600"
      >
        {t.quickRoll.roll}
      </button>
    </div>
  );
}
