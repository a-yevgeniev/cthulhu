import { useState } from 'react';
import DiceGroups from './DiceGroups';
import { useRollLog, type LogEntry, type SkillLogEntry } from './RollLogContext';
import { rollDisplay } from './successLevel';
import { useLocale } from './i18n/LocaleContext';
import type { Translations } from './i18n/translations';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function SkillEntryCard({ entry, t }: { entry: SkillLogEntry; t: Translations }) {
  const { pushEntry, spendLuckOnEntry } = useRollLog();
  const [luckPoints, setLuckPoints] = useState('');
  const [luckError, setLuckError] = useState<string | null>(null);
  const { result } = entry;
  const style = rollDisplay(result, t);

  const canAct = !entry.consumed && !result.succeeded && !result.pushed;

  function spendLuck() {
    const points = Number(luckPoints);
    if (!Number.isInteger(points) || points < 1) {
      setLuckError(t.rollLog.enterPositiveWholeNumber);
      return;
    }
    const err = spendLuckOnEntry(entry.id, points);
    setLuckError(err);
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{formatTime(entry.timestamp)}</span>
        <span>
          {t.rollLog.skillLine(result.skill, t.difficulty[result.difficulty])}
          {result.modifierDice !== 0 && t.rollLog.modifierDice(result.modifierDice)}
          {result.pushed && t.rollLog.pushed}
          {result.luckSpent > 0 && t.rollLog.luckSpent(result.luckSpent)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl font-black tabular-nums text-zinc-50">{result.roll}</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${style.classes}`}
        >
          {style.label}
        </span>
      </div>

      {canAct && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => pushEntry(entry.id)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 active:bg-zinc-800"
          >
            {t.rollLog.push}
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder={t.rollLog.luckPlaceholder}
            value={luckPoints}
            onChange={(e) => {
              setLuckPoints(e.target.value);
              setLuckError(null);
            }}
            className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-center text-xs text-zinc-100 focus:border-violet-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={spendLuck}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 active:bg-zinc-800"
          >
            {t.rollLog.spendLuck}
          </button>
        </div>
      )}
      {luckError && <span className="text-xs text-red-400">{luckError}</span>}
    </div>
  );
}

function NotationEntryCard({ entry }: { entry: Extract<LogEntry, { kind: 'notation' }> }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{formatTime(entry.timestamp)}</span>
        <span>{entry.result.notation}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-3xl font-black tabular-nums text-zinc-50">{entry.result.total}</span>
      </div>
      <DiceGroups groups={entry.result.groups} />
    </div>
  );
}

export default function RollLog() {
  const { t } = useLocale();
  const { entries, clear } = useRollLog();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">{t.rollLog.title}</h1>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-zinc-500 underline active:text-zinc-300"
          >
            {t.rollLog.clear}
          </button>
        )}
      </div>

      {entries.length === 0 && (
        <p className="pt-12 text-center text-sm text-zinc-500">{t.rollLog.empty}</p>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) =>
          entry.kind === 'skill' ? (
            <SkillEntryCard key={entry.id} entry={entry} t={t} />
          ) : (
            <NotationEntryCard key={entry.id} entry={entry} />
          ),
        )}
      </div>
    </div>
  );
}
