import type { DiceGroup } from 'coc7-engine';
import Die from './Die';

export default function DiceGroups({ groups, spinKey }: { groups: DiceGroup[]; spinKey: number }) {
  return (
    <>
      {groups.map((group, i) => (
        <div key={i} className="flex flex-col gap-2">
          <span className="text-xs text-zinc-500">{group.spec}</span>
          <div className="flex flex-wrap gap-2">
            {group.rolls.map((value, j) => (
              <Die
                key={j}
                value={value}
                sides={group.sides}
                spinKey={spinKey}
                size="sm"
                dimmed={group.dropped.includes(j)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
