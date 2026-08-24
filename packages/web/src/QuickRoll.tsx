import { useState } from 'react';
import {
  MAX_MODIFIER_DICE,
  skillRoll,
  thresholdsFor,
  type Difficulty,
  type SkillRollResult,
} from 'coc7-engine';
import { rollDisplay } from './successLevel';
import { useRollLog } from './RollLogContext';

const DIFFICULTIES: Difficulty[] = ['regular', 'hard', 'extreme'];

export default function QuickRoll() {
  const [skill, setSkill] = useState(50);
  const [modifierDice, setModifierDice] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('regular');
  const [result, setResult] = useState<SkillRollResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const { addSkillEntry } = useRollLog();

  const thresholds = thresholdsFor(skill);

  function roll() {
    setRolling(true);
    const next = skillRoll(skill, { modifierDice, difficulty });
    setResult(next);
    addSkillEntry(next);
    window.setTimeout(() => setRolling(false), 300);
  }

  const style = result ? rollDisplay(result) : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-center text-2xl font-semibold text-zinc-100">Quick Roll</h1>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-zinc-400">Skill value</span>
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
          aria-label="Fewer bonus dice / more penalty dice"
          onClick={() => setModifierDice((m) => Math.max(-MAX_MODIFIER_DICE, m - 1))}
          className="grid h-11 w-11 place-items-center rounded-full bg-zinc-800 text-xl text-zinc-100 active:bg-zinc-700"
        >
          −
        </button>
        <span className="text-center text-sm text-zinc-300">
          {modifierDice === 0 && 'No modifier dice'}
          {modifierDice > 0 && `${modifierDice} bonus ${modifierDice === 1 ? 'die' : 'dice'}`}
          {modifierDice < 0 &&
            `${Math.abs(modifierDice)} penalty ${Math.abs(modifierDice) === 1 ? 'die' : 'dice'}`}
        </span>
        <button
          type="button"
          aria-label="More bonus dice / fewer penalty dice"
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
            className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
              difficulty === d
                ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-zinc-500">
        Regular {thresholds.regular} &middot; Hard {thresholds.hard} &middot; Extreme{' '}
        {thresholds.extreme}
      </p>

      {result && style && (
        <div
          className={`flex flex-col items-center gap-2 rounded-2xl px-6 py-8 transition-opacity duration-300 ${style.classes} ${
            rolling ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <span className="text-6xl font-black tabular-nums">{result.roll}</span>
          <span className="text-lg font-semibold uppercase tracking-wide">{style.label}</span>
          {result.candidates.length > 1 && (
            <span className="text-xs opacity-80">candidates: {result.candidates.join(', ')}</span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={roll}
        className="w-full rounded-2xl bg-violet-500 py-5 text-xl font-bold text-white shadow-lg shadow-violet-950/50 active:bg-violet-600"
      >
        Roll
      </button>
    </div>
  );
}
