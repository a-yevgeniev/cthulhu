import type { DiceGroup } from 'coc7-engine';
import Die from './Die';

export default function DiceGroups({ groups, spinKey }: { groups: DiceGroup[]; spinKey: number }) {
  return (
    <>
      {groups.map((group, i) => (
        <div key={i} className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-paper-dim">{group.spec}</span>
          <div className="flex flex-wrap gap-3">
            {group.rolls.map((value, j) => (
              <Die
                key={j}
                value={value}
                sides={group.sides}
                spinKey={spinKey}
                size="sm"
                discarded={group.dropped.includes(j)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
