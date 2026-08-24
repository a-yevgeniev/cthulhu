import type { DiceGroup } from 'coc7-engine';

export default function DiceGroups({ groups }: { groups: DiceGroup[] }) {
  return (
    <>
      {groups.map((group, i) => (
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
    </>
  );
}
