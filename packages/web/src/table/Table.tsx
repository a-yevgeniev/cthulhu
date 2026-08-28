import { useState } from 'react';
import { derivedStats, type Difficulty } from 'coc7-engine';
import type { LedgerEntry } from 'coc7-protocol';
import { useTable } from './TableContext';
import { useLocale } from '../i18n/LocaleContext';
import { useCharacters } from '../CharacterContext';
import { damageNotation, type CharacterWeapon } from '../character';
import { rollDisplay } from '../successLevel';
import Die from '../Die';
import DiceGroups from '../DiceGroups';

const LABEL = 'text-[10px] uppercase tracking-widest text-paper-dim';
const FIELD =
  'border border-ink-line bg-transparent text-paper placeholder:text-paper-dim/60 focus:border-brass focus:outline-none';
const GHOST_BTN = 'border border-ink-line text-paper-dim transition-colors hover:border-brass hover:text-paper';
const BRASS_BTN =
  'border border-brass text-brass transition-colors hover:bg-brass hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-brass';

function ConnectForm() {
  const { t } = useLocale();
  const { status, error, createRoom, joinRoom, clearError, selectCharacter, selectedCharacterId } = useTable();
  const { characters } = useCharacters();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const connecting = status === 'connecting';

  function handleSelectCharacter(id: string) {
    selectCharacter(id || null);
    const character = characters.find((c) => c.id === id);
    if (character) setName(character.name.trim() || t.characters.unnamed);
  }

  function submit() {
    if (!name.trim()) return;
    if (mode === 'create') createRoom(name.trim());
    else joinRoom(roomCode.trim(), name.trim());
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 border py-2 text-xs uppercase tracking-wider transition-colors ${
            mode === 'create' ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
          }`}
        >
          {t.table.createRoom}
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className={`flex-1 border py-2 text-xs uppercase tracking-wider transition-colors ${
            mode === 'join' ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
          }`}
        >
          {t.table.joinRoom}
        </button>
      </div>

      {characters.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t.table.playAs}</span>
          <select
            value={selectedCharacterId ?? ''}
            onChange={(e) => handleSelectCharacter(e.target.value)}
            className={`${FIELD} px-4 py-3 text-sm`}
          >
            <option value="">{t.table.guestOption}</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.trim() || t.characters.unnamed}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>{t.table.yourName}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError();
          }}
          placeholder={t.table.namePlaceholder}
          className={`${FIELD} px-4 py-3 text-lg`}
        />
      </label>

      {mode === 'join' && (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t.table.roomCode}</span>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              clearError();
            }}
            placeholder={t.table.roomCodePlaceholder}
            className={`${FIELD} px-4 py-3 font-display text-2xl uppercase tracking-widest`}
          />
        </label>
      )}

      {error && <p className="text-sm text-oxblood">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={connecting || !name.trim() || (mode === 'join' && !roomCode.trim())}
        className={`${BRASS_BTN} py-4 text-xs font-semibold uppercase tracking-[.28em]`}
      >
        {connecting ? t.table.connecting : mode === 'create' ? t.table.create : t.table.join}
      </button>
    </div>
  );
}

function EntryRow({ entry, t }: { entry: LedgerEntry; t: ReturnType<typeof useLocale>['t'] }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let body: React.ReactNode;
  if (entry.kind === 'notation') {
    const result = entry.result as Extract<LedgerEntry['result'], { groups: unknown }>;
    body = (
      <>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-paper-dim">{entry.label}</span>
          <span className="font-display text-3xl tabular-nums text-paper">{result.total}</span>
        </div>
        <DiceGroups groups={result.groups} spinKey={0} />
      </>
    );
  } else {
    const skillResult = entry.kind === 'sanity' ? (entry.result as { check: import('coc7-engine').SkillRollResult }).check : (entry.result as import('coc7-engine').SkillRollResult);
    const style = rollDisplay(skillResult, t);
    body = (
      <div className="flex items-center gap-3">
        <Die value={skillResult.roll} sides={100} spinKey={0} size="sm" />
        <div>
          <div className="text-sm text-paper">{entry.label}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider ${style.textClass}`}>
            {style.label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="log-row-in flex flex-col gap-2 border-b border-ink-line/60 py-3">
      <div className="flex items-center justify-between text-[11px] text-paper-dim">
        <span>{entry.playerName}</span>
        <span>
          {time}
          {entry.secret && <span className="ml-2 text-brass">{t.table.secret}</span>}
        </span>
      </div>
      {body}
    </div>
  );
}

function RollComposer() {
  const { t } = useLocale();
  const { rollSkill, rollNotation, selectedCharacterId } = useTable();
  const { characters } = useCharacters();
  const character = characters.find((c) => c.id === selectedCharacterId);
  const [tab, setTab] = useState<'skill' | 'notation'>('skill');
  const [label, setLabel] = useState('');
  const [skillValue, setSkillValue] = useState(50);
  const [difficulty, setDifficulty] = useState<Difficulty>('regular');
  const [notation, setNotation] = useState('');
  const [secret, setSecret] = useState(false);

  function submit() {
    if (tab === 'skill') {
      rollSkill({ skill: skillValue, label: label.trim() || undefined, difficulty, secret });
    } else {
      if (!notation.trim()) return;
      rollNotation({ notation: notation.trim(), label: label.trim() || undefined, secret });
      setNotation('');
    }
  }

  function pickCharacterSkill(skillId: string) {
    const skill = character?.skills.find((s) => s.id === skillId);
    if (!skill) return;
    setTab('skill');
    setLabel(skill.name);
    setSkillValue(skill.value);
  }

  function rollWeaponAttack(weapon: CharacterWeapon) {
    if (!character) return;
    const skill = character.skills.find((s) => s.name === weapon.skill);
    rollSkill({ skill: skill?.value ?? 0, label: `${weapon.name} (${t.sheet.attack})`, secret });
  }

  function rollWeaponDamage(weapon: CharacterWeapon) {
    if (!character) return;
    const derived = derivedStats(character.characteristics, character.age);
    try {
      rollNotation({
        notation: damageNotation(weapon.damage, derived.damageBonus),
        label: `${weapon.name} (${t.sheet.damage})`,
        secret,
      });
    } catch {
      // invalid damage notation on this weapon; editable on the character sheet
    }
  }

  return (
    <div className="flex flex-col gap-2 border border-ink-line px-4 py-3">
      <h2 className={LABEL}>{t.table.composerLabel}</h2>

      {character && (
        <div className="flex flex-col gap-2 border-b border-ink-line/60 pb-2">
          <span className="text-[10px] uppercase tracking-widest text-brass">
            {t.table.fromCharacter}: {character.name.trim() || t.characters.unnamed}
          </span>
          <select
            value=""
            onChange={(e) => pickCharacterSkill(e.target.value)}
            className={`${FIELD} px-3 py-2 text-sm`}
          >
            <option value="">{t.table.pickSkillPlaceholder}</option>
            {character.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.value})
              </option>
            ))}
          </select>
          {character.weapons.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {character.weapons.map((w) => (
                <div key={w.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-paper">{w.name}</span>
                  <button
                    type="button"
                    onClick={() => rollWeaponAttack(w)}
                    className={`px-2 py-1 text-[11px] uppercase tracking-wider ${GHOST_BTN}`}
                  >
                    {t.sheet.attack}
                  </button>
                  <button
                    type="button"
                    onClick={() => rollWeaponDamage(w)}
                    className={`px-2 py-1 text-[11px] uppercase tracking-wider ${GHOST_BTN}`}
                  >
                    {t.sheet.damage}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('skill')}
          className={`flex-1 border py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
            tab === 'skill' ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
          }`}
        >
          {t.table.rollSkillTab}
        </button>
        <button
          type="button"
          onClick={() => setTab('notation')}
          className={`flex-1 border py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
            tab === 'notation' ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
          }`}
        >
          {t.table.rollNotationTab}
        </button>
      </div>

      {tab === 'skill' ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t.table.composerSkillPlaceholder}
            className={`${FIELD} flex-1 px-3 py-2 text-sm`}
          />
          <input
            type="number"
            value={skillValue}
            onChange={(e) => setSkillValue(Number(e.target.value))}
            className={`${FIELD} w-16 px-2 py-2 text-center text-sm`}
          />
        </div>
      ) : (
        <input
          type="text"
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          placeholder={t.table.composerNotationPlaceholder}
          className={`${FIELD} px-3 py-2 text-sm`}
        />
      )}

      {tab === 'skill' && (
        <div className="flex gap-2">
          {(['regular', 'hard', 'extreme'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`flex-1 border py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
                difficulty === d ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
              }`}
            >
              {t.difficulty[d]}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-paper-dim">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
            className="h-4 w-4 accent-brass"
          />
          {t.table.secret}
        </label>
        <button type="button" onClick={submit} className={`${BRASS_BTN} px-6 py-2 text-xs font-semibold uppercase tracking-widest`}>
          {t.table.send}
        </button>
      </div>
    </div>
  );
}

function KeeperRequestPanel() {
  const { t } = useLocale();
  const { players, playerId, requestRoll } = useTable();
  const [targetId, setTargetId] = useState('');
  const [skillLabel, setSkillLabel] = useState('');

  const others = players.filter((p) => p.id !== playerId);
  if (others.length === 0) return null;

  function submit() {
    if (!targetId || !skillLabel.trim()) return;
    requestRoll({ targetPlayerId: targetId, skillLabel: skillLabel.trim() });
    setSkillLabel('');
  }

  return (
    <div className="flex flex-col gap-2 border border-ink-line px-4 py-3">
      <h2 className={LABEL}>{t.table.requestRollHeading}</h2>
      <div className="flex gap-2">
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className={`${FIELD} px-2 py-2 text-sm`}
        >
          <option value="">{t.table.requestRollTarget}</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={skillLabel}
          onChange={(e) => setSkillLabel(e.target.value)}
          placeholder={t.table.requestRollSkillPlaceholder}
          className={`${FIELD} flex-1 px-3 py-2 text-sm`}
        />
        <button type="button" onClick={submit} className={`px-3 text-xs uppercase tracking-wider ${GHOST_BTN}`}>
          {t.table.requestRollSend}
        </button>
      </div>
    </div>
  );
}

function RoomView() {
  const { t } = useLocale();
  const { roomCode, isKeeper, players, ledger, leaveRoom, prompt, dismissPrompt } = useTable();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <span className={LABEL}>{t.table.roomLabel}</span>
          <div className="font-display text-3xl tracking-widest text-paper">{roomCode}</div>
        </div>
        <button type="button" onClick={leaveRoom} className="text-[11px] uppercase tracking-wider text-oxblood/80 transition-colors hover:text-oxblood">
          {t.table.leaveRoom}
        </button>
      </div>

      {prompt && (
        <div className="flex items-center justify-between border border-brass px-4 py-3">
          <span className="text-sm text-brass">{t.table.promptFrom(prompt.fromKeeperName, prompt.skillLabel)}</span>
          <button type="button" onClick={dismissPrompt} className="text-[11px] uppercase tracking-wider text-paper-dim hover:text-paper">
            {t.table.dismiss}
          </button>
        </div>
      )}

      <div>
        <h2 className={`mb-2 ${LABEL}`}>{t.table.players}</h2>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <span
              key={p.id}
              className={`border px-3 py-1 text-xs ${p.connected ? 'border-ink-line text-paper' : 'border-ink-line text-paper-dim opacity-50'}`}
            >
              {p.name}
              {p.isKeeper && <span className="ml-1.5 text-[10px] uppercase text-brass">{t.table.keeperBadge}</span>}
            </span>
          ))}
        </div>
      </div>

      <RollComposer />
      {isKeeper && <KeeperRequestPanel />}

      <div>
        {ledger.length === 0 ? (
          <p className="pt-6 text-center text-sm text-paper-dim">{t.table.empty}</p>
        ) : (
          <div className="flex flex-col-reverse">
            {ledger.map((entry) => (
              <EntryRow key={entry.id} entry={entry} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Table() {
  const { status } = useTable();
  return status === 'connected' ? <RoomView /> : <ConnectForm />;
}
