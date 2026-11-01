import { useEffect, useState } from 'react';
import type { Characteristics, DiceRollResult } from 'coc7-engine';
import { useLocale } from '../i18n/LocaleContext';
import ResourceTracker from '../ResourceTracker';
import { useTable } from './TableContext';
import { npcsFor, type Npc } from './npcs';
import { ValueRow } from './RollPicker';
import Section from './Section';
import { GHOST_BTN, LABEL } from './styles';

// Same order as the stat block in the scenario: two rows of four.
const CHAR_ORDER: (keyof Characteristics)[] = ['STR', 'CON', 'SIZ', 'INT', 'POW', 'DEX', 'APP', 'EDU'];

/** What the Keeper has worn down on a character so far. Armour has no printed maximum: it is
 * whatever was rolled, and each point soaks one damage. */
interface NpcVitals {
  hp: number;
  mp: number;
  armor: number;
}

const fresh = (npc: Npc): NpcVitals => ({ hp: npc.hp, mp: npc.mp, armor: 0 });

/** The character's current health, magic and armour, kept on the Keeper's device per room so a
 * reload mid-fight doesn't heal him, and a new room starts him fresh. The players never see it. */
function useNpcVitals(npc: Npc, roomCode: string | null) {
  const key = `coc7-npc-${roomCode ?? 'none'}-${npc.id}`;
  const [vitals, setVitals] = useState<NpcVitals>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<NpcVitals> | null;
      if (saved && [saved.hp, saved.mp, saved.armor].every((n) => Number.isFinite(n))) {
        return {
          hp: Math.min(npc.hp, Math.max(0, saved.hp as number)),
          mp: Math.min(npc.mp, Math.max(0, saved.mp as number)),
          armor: Math.max(0, saved.armor as number),
        };
      }
    } catch {
      // unreadable or unavailable; start fresh
    }
    return fresh(npc);
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(vitals));
    } catch {
      // not remembered; harmless
    }
  }, [key, vitals]);

  return { vitals, setVitals, reset: () => setVitals(fresh(npc)) };
}

/** One non-player character's numbers, for the Keeper to run: tap any value to roll it for the
 * table (or only for the Keeper, with Secret). Rolls go through the room like anyone's, so the
 * server rolls them and they land in the same log, labelled with the character's name. */
function NpcCard({
  npc,
  vitals,
  setVitals,
  reset,
}: {
  npc: Npc;
  vitals: NpcVitals;
  setVitals: (update: (v: NpcVitals) => NpcVitals) => void;
  reset: () => void;
}) {
  const { t } = useLocale();
  const { rollSkill, rollNotation } = useTable();
  const text = t.npcs[npc.id];
  const [secret, setSecret] = useState(false);
  if (!text) return null;

  const label = (what: string) => `${text.name} · ${what}`;
  const roll = (what: string, value: number) => rollSkill({ skill: value, label: label(what), secret });
  const rollDice = (what: string, notation: string, onTotal?: (total: number) => void) =>
    rollNotation({ notation, label: label(what), secret }, (entry) => onTotal?.((entry.result as DiceRollResult).total));
  const attackValue = npc.rolls.find((r) => r.id === npc.attack.rollId)?.value ?? 0;
  const damage = `${npc.attack.damage}+${npc.damageBonus}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-widest text-brass">{text.tagline}</span>
        <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-paper-dim">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
            className="h-4 w-4 accent-brass"
          />
          {t.table.secret}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ResourceTracker
          label={t.sheet.hp}
          current={vitals.hp}
          max={npc.hp}
          onChange={(hp) => setVitals((v) => ({ ...v, hp }))}
        />
        <ResourceTracker
          label={t.sheet.mp}
          current={vitals.mp}
          max={npc.mp}
          onChange={(mp) => setVitals((v) => ({ ...v, mp }))}
        />
        <ResourceTracker
          label={t.table.npcArmor}
          current={vitals.armor}
          onChange={(armor) => setVitals((v) => ({ ...v, armor }))}
        />
        <button
          type="button"
          onClick={reset}
          className={`flex min-h-14 items-center justify-center px-2 text-[11px] uppercase tracking-wider ${GHOST_BTN}`}
        >
          {t.table.npcReset}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {CHAR_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => roll(t.characteristicNames[key], npc.characteristics[key])}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1 ${GHOST_BTN}`}
          >
            <span className={LABEL}>{t.characteristicNames[key]}</span>
            <span className="font-display text-lg tabular-nums text-paper">{npc.characteristics[key]}</span>
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {(
          [
            [t.table.npcBuild, npc.build],
            [t.table.npcDamageBonus, `+${npc.damageBonus}`],
            [t.table.npcMove, npc.move],
            [t.table.npcSanLoss, npc.sanLoss],
          ] as const
        ).map(([name, value]) => (
          <div key={name} className="flex items-baseline justify-between gap-2 border-b border-ink-line/40 py-1">
            <dt className="truncate text-paper-dim">{name}</dt>
            <dd className="m-0 tabular-nums text-paper">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => roll(text.rolls[npc.attack.rollId] ?? t.table.npcAttack, attackValue)}
          className={`min-h-11 flex-1 px-3 text-xs uppercase tracking-wider ${GHOST_BTN}`}
        >
          {t.table.npcAttack} {attackValue}
        </button>
        <button
          type="button"
          onClick={() => rollDice(t.table.npcDamage, damage)}
          className={`min-h-11 flex-1 px-3 text-xs uppercase tracking-wider ${GHOST_BTN}`}
        >
          {t.table.npcDamage} {damage}
        </button>
        {npc.armor && (
          <button
            type="button"
            // The roll sets his armour; from there the Keeper wears it down with − as he takes hits.
            onClick={() => rollDice(t.table.npcArmor, npc.armor as string, (armor) => setVitals((v) => ({ ...v, armor })))}
            className={`min-h-11 flex-1 px-3 text-xs uppercase tracking-wider ${GHOST_BTN}`}
          >
            {t.table.npcArmor} {npc.armor}
          </button>
        )}
      </div>

      <div>
        {npc.rolls.map((r) => {
          const name = text.rolls[r.id] ?? r.id;
          return <ValueRow key={r.id} name={name} value={r.value} onRoll={() => roll(name, r.value)} />;
        })}
      </div>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div>
          <dt className={LABEL}>{t.table.npcSpells}</dt>
          <dd className="m-0 text-paper">{text.spells}</dd>
        </div>
        <div>
          <dt className={LABEL}>{t.table.npcArtifact}</dt>
          <dd className="m-0 text-paper">{text.artifact}</dd>
        </div>
      </dl>

      <div>
        <h3 className={`mb-1 ${LABEL}`}>{t.table.npcNotes}</h3>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-paper-dim">
          {text.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NpcSection({ npc }: { npc: Npc }) {
  const { t } = useLocale();
  const { roomCode } = useTable();
  const { vitals, setVitals, reset } = useNpcVitals(npc, roomCode);
  const text = t.npcs[npc.id];
  if (!text) return null;

  return (
    <Section
      id={`npc-${npc.id}`}
      title={text.name}
      summary={`${t.sheet.hp} ${vitals.hp}/${npc.hp} · ${t.sheet.mp} ${vitals.mp}/${npc.mp} · ${t.table.npcArmor} ${vitals.armor}`}
    >
      <NpcCard npc={npc} vitals={vitals} setVitals={setVitals} reset={reset} />
    </Section>
  );
}

/** The Keeper's cast for this room's scenario. Nothing for a free table or a scenario without any. */
export default function NpcPanel() {
  const { scenario } = useTable();
  return (
    <>
      {npcsFor(scenario).map((npc) => (
        <NpcSection key={npc.id} npc={npc} />
      ))}
    </>
  );
}
