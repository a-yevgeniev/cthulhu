import { useState } from 'react';
import { isValidNotation, rollNotation, type DiceRollResult } from 'coc7-engine';
import DiceGroups from './DiceGroups';
import { useRollLog } from './RollLogContext';
import { useLocale } from './i18n/LocaleContext';

const QUICK_DICE = [3, 4, 6, 8, 10, 20, 100];

export default function DiceTray() {
  const { t } = useLocale();
  const [notation, setNotation] = useState('');
  const [result, setResult] = useState<DiceRollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addNotationEntry } = useRollLog();

  function roll(expr: string) {
    try {
      const next = rollNotation(expr);
      setResult(next);
      addNotationEntry(next);
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
      <h1 className="text-center text-2xl font-semibold text-zinc-100">{t.diceTray.title}</h1>

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
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-400">{result.notation}</span>
            <span className="text-5xl font-black tabular-nums text-zinc-50">{result.total}</span>
          </div>
          <DiceGroups groups={result.groups} />
        </div>
      )}
    </div>
  );
}
