import { useState } from 'react';
import {
  derivedStats,
  maxSanity,
  rollNotation,
  sanityCheck,
  skillRoll,
  type Characteristics,
  type DiceRollResult,
  type SkillRollResult,
} from 'coc7-engine';
import { useCharacters } from './CharacterContext';
import { useRollLog } from './RollLogContext';
import { rollDisplay } from './successLevel';
import { useLocale } from './i18n/LocaleContext';
import type { Translations } from './i18n/translations';
import { damageNotation, makeId, type CharacterSkill, type CharacterWeapon, type Investigator } from './character';
import Die from './Die';

const CHAR_KEYS: (keyof Characteristics)[] = ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU'];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function ResourceTracker({
  label,
  current,
  max,
  onChange,
}: {
  label: string;
  current: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(current - 1, 0, max ?? Infinity))}
          className="grid h-7 w-7 place-items-center rounded-full bg-zinc-800 text-zinc-100 active:bg-zinc-700"
        >
          −
        </button>
        <span className="w-12 text-center text-lg font-bold tabular-nums text-zinc-50">
          {current}
          {max !== undefined && <span className="text-xs text-zinc-500">/{max}</span>}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(current + 1, 0, max ?? Infinity))}
          className="grid h-7 w-7 place-items-center rounded-full bg-zinc-800 text-zinc-100 active:bg-zinc-700"
        >
          +
        </button>
      </div>
    </div>
  );
}

function RollBadge({ result, t, spinKey }: { result: SkillRollResult; t: Translations; spinKey: number }) {
  const style = rollDisplay(result, t);
  return (
    <span className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs font-semibold ${style.classes}`}>
      <Die value={result.roll} sides={100} spinKey={spinKey} size="sm" />
      {style.label}
    </span>
  );
}

export default function CharacterSheet({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useLocale();
  const { characters, updateCharacter, deleteCharacter } = useCharacters();
  const { addSkillEntry, addNotationEntry } = useRollLog();
  const [skillResults, setSkillResults] = useState<Record<string, SkillRollResult>>({});
  const [weaponResults, setWeaponResults] = useState<Record<string, DiceRollResult | SkillRollResult>>({});
  const [spinKeys, setSpinKeys] = useState<Record<string, number>>({});
  const [newSkillName, setNewSkillName] = useState('');
  const [newWeaponName, setNewWeaponName] = useState('');
  const [sanLoss, setSanLoss] = useState('1/1d6');
  const [sanError, setSanError] = useState<string | null>(null);
  const [inventoryItem, setInventoryItem] = useState('');

  const investigator = characters.find((c) => c.id === id);

  if (!investigator) {
    return (
      <div className="mx-auto max-w-md px-4 py-8 text-center text-zinc-400">
        <p>{t.sheet.notFound}</p>
        <button type="button" onClick={onBack} className="mt-4 text-violet-300 underline">
          {t.sheet.back}
        </button>
      </div>
    );
  }

  function patch(updater: (c: Investigator) => Investigator) {
    updateCharacter(id, updater);
  }

  const derived = derivedStats(investigator.characteristics, investigator.age);
  const mythos = investigator.skills.find((s) => s.key === 'cthulhuMythos')?.value ?? 0;
  const maxSan = maxSanity(mythos);

  function bumpSpinKey(key: string) {
    setSpinKeys((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
  }

  function rollSkill(skill: CharacterSkill) {
    const result = skillRoll(skill.value);
    setSkillResults((prev) => ({ ...prev, [skill.id]: result }));
    bumpSpinKey(skill.id);
    addSkillEntry(result);
  }

  function rollWeaponAttack(weapon: CharacterWeapon) {
    const skill = investigator!.skills.find((s) => s.name === weapon.skill);
    const result = skillRoll(skill?.value ?? 0);
    setWeaponResults((prev) => ({ ...prev, [weapon.id]: result }));
    bumpSpinKey(weapon.id);
    addSkillEntry(result);
  }

  function rollWeaponDamage(weapon: CharacterWeapon) {
    try {
      const result = rollNotation(damageNotation(weapon.damage, derived.damageBonus));
      setWeaponResults((prev) => ({ ...prev, [weapon.id]: result }));
      addNotationEntry(result);
    } catch {
      // invalid damage notation on this weapon; ignore silently, editable inline
    }
  }

  function runSanityCheck() {
    try {
      const result = sanityCheck({
        sanity: investigator!.currentSan,
        startingSanity: investigator!.startingSan,
        lostThisSession: investigator!.sanLostThisSession,
        loss: sanLoss,
      });
      addSkillEntry(result.check);
      patch((c) => ({
        ...c,
        currentSan: result.sanityAfter,
        sanLostThisSession: c.sanLostThisSession + result.loss,
      }));
      setSanError(null);
    } catch (err) {
      setSanError(err instanceof Error ? err.message : 'Invalid Sanity loss expression.');
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-violet-300 underline">
          {t.sheet.back}
        </button>
        <button
          type="button"
          onClick={() => {
            deleteCharacter(id);
            onBack();
          }}
          className="text-xs text-red-400 underline active:text-red-300"
        >
          {t.sheet.delete}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={investigator.name}
          onChange={(e) => patch((c) => ({ ...c, name: e.target.value }))}
          placeholder={t.sheet.namePlaceholder}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xl font-bold text-zinc-50 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={investigator.occupation}
            onChange={(e) => patch((c) => ({ ...c, occupation: e.target.value }))}
            placeholder={t.sheet.occupationPlaceholder}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
          />
          <input
            type="number"
            value={investigator.age}
            onChange={(e) => patch((c) => ({ ...c, age: Number(e.target.value) }))}
            placeholder={t.sheet.agePlaceholder}
            className="w-20 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-sm text-zinc-100 focus:border-violet-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">{t.sheet.characteristics}</h2>
        <div className="grid grid-cols-4 gap-2">
          {CHAR_KEYS.map((key) => (
            <label key={key} className="flex flex-col items-center gap-1">
              <span className="text-xs text-zinc-500">{key}</span>
              <input
                type="number"
                value={investigator.characteristics[key]}
                onChange={(e) =>
                  patch((c) => ({
                    ...c,
                    characteristics: { ...c.characteristics, [key]: Number(e.target.value) },
                  }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-2 text-center text-lg font-semibold text-zinc-50 focus:border-violet-400 focus:outline-none"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">{t.sheet.derivedHeading}</h2>
        <p className="text-center text-xs text-zinc-500">
          {t.sheet.derived(derived.build, derived.damageBonus, derived.move)}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <ResourceTracker
          label={t.sheet.hp}
          current={investigator.currentHp}
          max={derived.hitPoints}
          onChange={(next) => patch((c) => ({ ...c, currentHp: clamp(next, 0, derived.hitPoints) }))}
        />
        <ResourceTracker
          label={t.sheet.mp}
          current={investigator.currentMp}
          max={derived.magicPoints}
          onChange={(next) => patch((c) => ({ ...c, currentMp: clamp(next, 0, derived.magicPoints) }))}
        />
        <ResourceTracker
          label={t.sheet.san}
          current={investigator.currentSan}
          max={maxSan}
          onChange={(next) => patch((c) => ({ ...c, currentSan: clamp(next, 0, maxSan) }))}
        />
        <ResourceTracker
          label={t.sheet.luck}
          current={investigator.currentLuck}
          onChange={(next) => patch((c) => ({ ...c, currentLuck: clamp(next, 0, Infinity) }))}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-400">{t.sheet.sanityCheck}</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={sanLoss}
            onChange={(e) => setSanLoss(e.target.value)}
            placeholder={t.sheet.sanLossPlaceholder}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-violet-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={runSanityCheck}
            className="rounded-lg bg-violet-500 px-4 text-sm font-semibold text-white active:bg-violet-600"
          >
            {t.sheet.check}
          </button>
        </div>
        {sanError && <span className="text-xs text-red-400">{sanError}</span>}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{t.sheet.startingSan(investigator.startingSan)}</span>
          <span>{t.sheet.lostThisSession(investigator.sanLostThisSession)}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => patch((c) => ({ ...c, startingSan: c.currentSan }))}
              className="underline active:text-zinc-300"
            >
              {t.sheet.setStartingToCurrent}
            </button>
            <button
              type="button"
              onClick={() => patch((c) => ({ ...c, sanLostThisSession: 0 }))}
              className="underline active:text-zinc-300"
            >
              {t.sheet.resetSession}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">{t.sheet.skills}</h2>
        <div className="flex flex-col gap-1">
          {investigator.skills.map((skill) => (
            <div key={skill.id} className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2">
              <input
                type="checkbox"
                checked={skill.checked}
                onChange={(e) =>
                  patch((c) => ({
                    ...c,
                    skills: c.skills.map((s) =>
                      s.id === skill.id ? { ...s, checked: e.target.checked } : s,
                    ),
                  }))
                }
                className="h-4 w-4"
              />
              <span className="flex-1 truncate text-sm text-zinc-200">{skill.name}</span>
              <input
                type="number"
                value={skill.value}
                onChange={(e) =>
                  patch((c) => ({
                    ...c,
                    skills: c.skills.map((s) =>
                      s.id === skill.id ? { ...s, value: Number(e.target.value) } : s,
                    ),
                  }))
                }
                className="w-14 rounded-md border border-zinc-700 bg-zinc-950 px-1 py-1 text-center text-sm text-zinc-100 focus:border-violet-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => rollSkill(skill)}
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-200 active:bg-zinc-800"
              >
                {t.sheet.roll}
              </button>
              {skillResults[skill.id] && (
                <RollBadge result={skillResults[skill.id]} t={t} spinKey={spinKeys[skill.id] ?? 0} />
              )}
              <button
                type="button"
                onClick={() =>
                  patch((c) => ({ ...c, skills: c.skills.filter((s) => s.id !== skill.id) }))
                }
                className="text-zinc-600 active:text-red-400"
                aria-label={t.sheet.removeSkill(skill.name)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder={t.sheet.newSkillPlaceholder}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const name = newSkillName.trim();
              if (!name) return;
              patch((c) => ({
                ...c,
                skills: [...c.skills, { id: makeId(), name, value: 0, checked: false }],
              }));
              setNewSkillName('');
            }}
            className="rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 active:bg-zinc-800"
          >
            {t.sheet.add}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">{t.sheet.weapons}</h2>
        <div className="flex flex-col gap-2">
          {investigator.weapons.map((weapon) => (
            <div key={weapon.id} className="flex flex-col gap-2 rounded-lg bg-zinc-900 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={weapon.name}
                  onChange={(e) =>
                    patch((c) => ({
                      ...c,
                      weapons: c.weapons.map((w) =>
                        w.id === weapon.id ? { ...w, name: e.target.value } : w,
                      ),
                    }))
                  }
                  placeholder={t.sheet.weaponNamePlaceholder}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    patch((c) => ({ ...c, weapons: c.weapons.filter((w) => w.id !== weapon.id) }))
                  }
                  className="text-zinc-600 active:text-red-400"
                  aria-label={t.sheet.removeWeapon(weapon.name)}
                >
                  ×
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={weapon.skill}
                  onChange={(e) =>
                    patch((c) => ({
                      ...c,
                      weapons: c.weapons.map((w) =>
                        w.id === weapon.id ? { ...w, skill: e.target.value } : w,
                      ),
                    }))
                  }
                  placeholder={t.sheet.weaponSkillPlaceholder}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={weapon.damage}
                  onChange={(e) =>
                    patch((c) => ({
                      ...c,
                      weapons: c.weapons.map((w) =>
                        w.id === weapon.id ? { ...w, damage: e.target.value } : w,
                      ),
                    }))
                  }
                  placeholder={t.sheet.weaponDamagePlaceholder}
                  className="w-28 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => rollWeaponAttack(weapon)}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-200 active:bg-zinc-800"
                >
                  {t.sheet.attack}
                </button>
                <button
                  type="button"
                  onClick={() => rollWeaponDamage(weapon)}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-200 active:bg-zinc-800"
                >
                  {t.sheet.damage}
                </button>
                {weaponResults[weapon.id] &&
                  ('level' in weaponResults[weapon.id] ? (
                    <RollBadge
                      result={weaponResults[weapon.id] as SkillRollResult}
                      t={t}
                      spinKey={spinKeys[weapon.id] ?? 0}
                    />
                  ) : (
                    <span className="rounded-full bg-zinc-800 py-0.5 pl-2 pr-3 text-sm font-semibold tabular-nums text-zinc-100">
                      {(weaponResults[weapon.id] as DiceRollResult).total} {t.sheet.dmg}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newWeaponName}
            onChange={(e) => setNewWeaponName(e.target.value)}
            placeholder={t.sheet.newWeaponPlaceholder}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const name = newWeaponName.trim();
              if (!name) return;
              patch((c) => ({
                ...c,
                weapons: [...c.weapons, { id: makeId(), name, skill: '', damage: '1d6' }],
              }));
              setNewWeaponName('');
            }}
            className="rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 active:bg-zinc-800"
          >
            {t.sheet.add}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">{t.sheet.inventory}</h2>
        <div className="flex flex-wrap gap-2">
          {investigator.inventory.map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200"
            >
              {item}
              <button
                type="button"
                onClick={() =>
                  patch((c) => ({ ...c, inventory: c.inventory.filter((_, j) => j !== i) }))
                }
                className="text-zinc-500 active:text-red-400"
                aria-label={t.sheet.removeItem(item)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={inventoryItem}
            onChange={(e) => setInventoryItem(e.target.value)}
            placeholder={t.sheet.addItemPlaceholder}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const item = inventoryItem.trim();
              if (!item) return;
              patch((c) => ({ ...c, inventory: [...c.inventory, item] }));
              setInventoryItem('');
            }}
            className="rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 active:bg-zinc-800"
          >
            {t.sheet.add}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">{t.sheet.notes}</h2>
        <textarea
          value={investigator.notes}
          onChange={(e) => patch((c) => ({ ...c, notes: e.target.value }))}
          rows={4}
          className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-violet-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
