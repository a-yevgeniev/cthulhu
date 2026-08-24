import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { pushRoll, spendLuck, type DiceRollResult, type SkillRollResult } from 'coc7-engine';

export interface SkillLogEntry {
  id: string;
  timestamp: number;
  kind: 'skill';
  result: SkillRollResult;
  /** True once Push or Spend Luck has been used from this entry — each roll gets one shot. */
  consumed: boolean;
}

export interface NotationLogEntry {
  id: string;
  timestamp: number;
  kind: 'notation';
  result: DiceRollResult;
}

export type LogEntry = SkillLogEntry | NotationLogEntry;

const STORAGE_KEY = 'coc7-roll-log';
const MAX_ENTRIES = 200;

function loadEntries(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeId(): string {
  return crypto.randomUUID();
}

interface RollLogContextValue {
  entries: LogEntry[];
  addSkillEntry: (result: SkillRollResult) => void;
  addNotationEntry: (result: DiceRollResult) => void;
  pushEntry: (id: string) => void;
  spendLuckOnEntry: (id: string, points: number) => string | null;
  clear: () => void;
}

const RollLogContext = createContext<RollLogContextValue | null>(null);

export function RollLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>(() => loadEntries());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  function prepend(entry: LogEntry) {
    setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }

  const value = useMemo<RollLogContextValue>(
    () => ({
      entries,
      addSkillEntry(result) {
        prepend({ id: makeId(), timestamp: Date.now(), kind: 'skill', result, consumed: false });
      },
      addNotationEntry(result) {
        prepend({ id: makeId(), timestamp: Date.now(), kind: 'notation', result });
      },
      pushEntry(id) {
        const entry = entries.find((e) => e.id === id);
        if (!entry || entry.kind !== 'skill' || entry.consumed) return;
        let next: SkillRollResult;
        try {
          next = pushRoll(entry.result);
        } catch {
          return;
        }
        setEntries((prev) => [
          { id: makeId(), timestamp: Date.now(), kind: 'skill', result: next, consumed: false },
          ...prev.map((e) => (e.id === id ? { ...e, consumed: true } : e)),
        ]);
      },
      spendLuckOnEntry(id, points) {
        const entry = entries.find((e) => e.id === id);
        if (!entry || entry.kind !== 'skill' || entry.consumed) return null;
        let next: SkillRollResult;
        try {
          next = spendLuck(entry.result, points);
        } catch (err) {
          return err instanceof Error ? err.message : 'Cannot spend that much Luck.';
        }
        setEntries((prev) => [
          { id: makeId(), timestamp: Date.now(), kind: 'skill', result: next, consumed: false },
          ...prev.map((e) => (e.id === id ? { ...e, consumed: true } : e)),
        ]);
        return null;
      },
      clear() {
        setEntries([]);
      },
    }),
    [entries],
  );

  return <RollLogContext.Provider value={value}>{children}</RollLogContext.Provider>;
}

export function useRollLog(): RollLogContextValue {
  const ctx = useContext(RollLogContext);
  if (!ctx) throw new Error('useRollLog must be used within a RollLogProvider');
  return ctx;
}
