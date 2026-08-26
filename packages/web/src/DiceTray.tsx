import { useEffect, useState } from 'react';
import { isValidNotation, rollNotation, type DiceRollResult } from 'coc7-engine';
import DiceGroups from './DiceGroups';
import { useRollLog } from './RollLogContext';
import { useLocale } from './i18n/LocaleContext';
import { TOTAL_ANIMATION_MS } from './Die';

const QUICK_DICE = [3, 4, 6, 8, 10, 20, 100];

export default function DiceTray() {
  const { t } = useLocale();
  const [notation, setNotation] = useState('');
  const [result, setResult] = useState<DiceRollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const { addNotationEntry } = useRollLog();

  function roll(expr: string) {
    try {
      const next = rollNotation(expr);
      setResult(next);
      addNotationEntry(next);
      setError(null);
      setRevealed(false);
      setSpinKey((k) => k + 1);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Invalid expression');
    }
  }

  useEffect(() => {
    if (spinKey === 0) return;
    const timeout = window.setTimeout(() => setRevealed(true), TOTAL_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [spinKey]);

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
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <div className="grid grid-cols-4 gap-3">
        {QUICK_DICE.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => rollQuick(sides)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 py-4 text-lg font-semibold text-zinc-100 transition-transform active:scale-95 active:bg-zinc-800"
          >
            d{sides}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-zinc-400">{t.diceTray.notation}</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && rollFreeText()}
            placeholder={t.diceTray.notationPlaceholder}
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
            {t.diceTray.roll}
          </button>
        </div>
        {notationInvalid && <span className="text-xs text-red-400">{t.diceTray.cantParse}</span>}
      </label>

      {error && !notationInvalid && <p className="text-center text-sm text-red-400">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-400">{result.notation}</span>
            <span
              className={`text-5xl font-black tabular-nums text-zinc-50 transition-opacity duration-200 ${revealed ? 'opacity-100' : 'opacity-0'}`}
            >
              {result.total}
            </span>
          </div>
          <DiceGroups groups={result.groups} spinKey={spinKey} />
        </div>
      )}
    </div>
  );
}
