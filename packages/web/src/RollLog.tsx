import { useState } from 'react';
import DiceGroups from './DiceGroups';
import { useRollLog, type LogEntry, type SkillLogEntry } from './RollLogContext';
import { rollDisplay } from './successLevel';
import { useLocale } from './i18n/LocaleContext';
import type { Translations } from './i18n/translations';
import EldritchMark from './EldritchMark';
import CompassRose from './CompassRose';

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
    <div className="log-row-in flex flex-col gap-2 border-b border-ink-line/60 py-3">
      <div className="flex items-center justify-between text-[11px] text-paper-dim">
        <span>{formatTime(entry.timestamp)}</span>
        <span>
          {t.rollLog.skillLine(result.skill, t.difficulty[result.difficulty])}
          {result.modifierDice !== 0 && t.rollLog.modifierDice(result.modifierDice)}
          {result.pushed && t.rollLog.pushed}
          {result.luckSpent > 0 && t.rollLog.luckSpent(result.luckSpent)}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`font-display text-3xl tabular-nums ${style.textClass}`}>{result.roll}</span>
        {result.level === 'fumble' && <EldritchMark size={22} className="shrink-0 text-oxblood" />}
        <span className={`text-[10px] font-semibold uppercase tracking-[.12em] ${style.textClass}`}>
          {style.label}
        </span>
      </div>

      {canAct && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => pushEntry(entry.id)}
            className="border border-ink-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-paper-dim transition-colors hover:border-brass hover:text-brass"
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
            className="w-16 border border-ink-line bg-transparent px-2 py-1.5 text-center text-xs text-paper focus:border-brass focus:outline-none"
          />
          <button
            type="button"
            onClick={spendLuck}
            className="border border-ink-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-paper-dim transition-colors hover:border-brass hover:text-brass"
          >
            {t.rollLog.spendLuck}
          </button>
        </div>
      )}
      {luckError && <span className="text-xs text-oxblood">{luckError}</span>}
    </div>
  );
}

function NotationEntryCard({ entry }: { entry: Extract<LogEntry, { kind: 'notation' }> }) {
  return (
    <div className="log-row-in flex flex-col gap-2 border-b border-ink-line/60 py-3">
      <div className="flex items-center justify-between text-[11px] text-paper-dim">
        <span>{formatTime(entry.timestamp)}</span>
        <span>{entry.result.notation}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-display text-3xl tabular-nums text-paper">{entry.result.total}</span>
      </div>
      <DiceGroups groups={entry.result.groups} spinKey={0} />
    </div>
  );
}

export default function RollLog() {
  const { t } = useLocale();
  const { entries, clear } = useRollLog();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2 px-4 py-6">
      {entries.length > 0 && (
        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={clear}
            className="text-[11px] uppercase tracking-wider text-paper-dim transition-colors hover:text-brass"
          >
            {t.rollLog.clear}
          </button>
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex flex-col items-center pt-8">
          <CompassRose size={160} className="text-brass opacity-20" />
          <p className="-mt-6 text-center text-sm text-paper-dim">{t.rollLog.empty}</p>
        </div>
      )}

      <div className="flex flex-col">
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
