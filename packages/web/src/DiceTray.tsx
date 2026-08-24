import { useState } from 'react';
import { isValidNotation, rollNotation, type DiceRollResult } from 'coc7-engine';

const QUICK_DICE = [3, 4, 6, 8, 10, 20, 100];

export default function DiceTray() {
  const [notation, setNotation] = useState('');
  const [result, setResult] = useState<DiceRollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function roll(expr: string) {
    try {
      setResult(rollNotation(expr));
      setError(null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Invalid expression');
    }
  }

  function rollQuick(sides: number) {
    setNotation(`1d${sides}`);
    roll(`1d${sides}`);
  }

  function rollFreeText() {
    if (notation.trim() === '') return;
    roll(notation);
  }

  const notationInvalid = notation.trim() !== '' && !isValidNotation(notation);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-center text-2xl font-semibold text-zinc-100">Dice Tray</h1>

      <div className="grid grid-cols-4 gap-3">
        {QUICK_DICE.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => rollQuick(sides)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 py-4 text-lg font-semibold text-zinc-100 active:bg-zinc-800"
          >
            d{sides}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-zinc-400">Notation</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && rollFreeText()}
            placeholder="2d6+3, 4d6kh3, (1d6+2)*2..."
            className={`flex-1 rounded-xl border bg-zinc-900 px-4 py-3 text-zinc-50 placeholder:text-zinc-600 focus:outline-none ${
              notationInvalid ? 'border-red-500' : 'border-zinc-700 focus:border-violet-400'
            }`}
          />
          <button
            type="button"
            onClick={rollFreeText}
            disabled={notation.trim() === '' || notationInvalid}
            className="rounded-xl bg-violet-500 px-5 font-semibold text-white disabled:opacity-40 active:bg-violet-600"
          >
            Roll
          </button>
        </div>
        {notationInvalid && (
          <span className="text-xs text-red-400">Can't parse that expression.</span>
        )}
      </label>

      {error && !notationInvalid && <p className="text-center text-sm text-red-400">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-400">{result.notation}</span>
            <span className="text-5xl font-black tabular-nums text-zinc-50">{result.total}</span>
          </div>
          {result.groups.map((group, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="shrink-0 text-zinc-400">{group.spec}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {group.rolls.map((value, j) => (
                  <span
                    key={j}
                    className={`rounded px-1.5 py-0.5 tabular-nums ${
                      group.dropped.includes(j)
                        ? 'text-zinc-600 line-through'
                        : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {value}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
