import type { SkillRollResult } from 'coc7-engine';

export const LEVEL_STYLE: Record<SkillRollResult['level'], { label: string; classes: string }> = {
  critical: { label: 'Critical', classes: 'bg-amber-400 text-amber-950' },
  extreme: { label: 'Extreme success', classes: 'bg-emerald-400 text-emerald-950' },
  hard: { label: 'Hard success', classes: 'bg-emerald-500/80 text-emerald-950' },
  regular: { label: 'Success', classes: 'bg-emerald-600/70 text-emerald-50' },
  failure: { label: 'Failure', classes: 'bg-zinc-700 text-zinc-200' },
  fumble: { label: 'Fumble', classes: 'bg-red-700 text-red-50' },
};
