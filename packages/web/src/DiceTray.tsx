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
    <div className="mx-auto flex max-w-md flex-col gap-7 px-4 py-6">
      <div className="grid grid-cols-4 gap-2.5">
        {QUICK_DICE.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => rollQuick(sides)}
            className="border border-ink-line py-3.5 text-sm text-paper transition-colors hover:border-brass hover:text-brass"
          >
            d{sides}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-paper-dim">
          {t.diceTray.notation}
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && rollFreeText()}
            placeholder={t.diceTray.notationPlaceholder}
            className={`flex-1 border bg-transparent px-3 py-2.5 text-paper placeholder:text-paper-dim/60 focus:outline-none ${
              notationInvalid ? 'border-oxblood' : 'border-ink-line focus:border-brass'
            }`}
          />
          <button
            type="button"
            onClick={rollFreeText}
            disabled={notation.trim() === '' || notationInvalid}
            className="border border-brass px-5 text-xs font-semibold uppercase tracking-widest text-brass transition-colors hover:bg-brass hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brass"
          >
            {t.diceTray.roll}
          </button>
        </div>
        {notationInvalid && <span className="text-xs text-oxblood">{t.diceTray.cantParse}</span>}
      </label>

      {error && !notationInvalid && <p className="text-center text-sm text-oxblood">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 border-t border-ink-line pt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-paper-dim">{result.notation}</span>
            <span
              className={`font-display text-5xl leading-none text-paper transition-opacity duration-200 ${
                revealed ? 'opacity-100' : 'opacity-0'
              }`}
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
