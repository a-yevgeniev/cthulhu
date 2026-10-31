import { useState } from 'react';
import { derivedStats, type Difficulty } from 'coc7-engine';
import type { LedgerEntry } from 'coc7-protocol';
import { useTable } from './TableContext';
import { useLocale } from '../i18n/LocaleContext';
import { useCharacters } from '../CharacterContext';
import { PREGEN_TEMPLATES, damageNotation, type CharacterWeapon } from '../character';
import { rollDisplay } from '../successLevel';
import Die from '../Die';
import DiceGroups from '../DiceGroups';
import CompassRose from '../CompassRose';
import EldritchMark from '../EldritchMark';
import MusicPanel from './MusicPanel';
import { HandoutCue, HandoutDisplay, HandoutLibrary } from './HandoutPanels';
import { SCENARIO_IDS, isScenarioId, type ScenarioId } from './handouts';
import {
  inviteCodeFromUrl,
  inviteUrl,
  rememberName,
  rememberScenario,
  rememberedName,
  rememberedScenario,
} from './session';
import { BRASS_BTN, FIELD, GHOST_BTN, LABEL } from './styles';

function ConnectForm() {
  const { t } = useLocale();
  const { status, error, createRoom, joinRoom, clearError, selectCharacter, selectedCharacterId } = useTable();
  const { characters, createPregenCharacter } = useCharacters();
  // Arriving from an invite link means the player wants to join that room, not make a new one.
  const [inviteCode] = useState(inviteCodeFromUrl);
  const [mode, setMode] = useState<'create' | 'join'>(inviteCode ? 'join' : 'create');
  const [name, setName] = useState(rememberedName);
  const [roomCode, setRoomCode] = useState(inviteCode ?? '');
  // The Haunting is the default scenario; '' is a free table. Remembered between visits.
  const [scenario, setScenario] = useState<ScenarioId | ''>(() => {
    const stored = rememberedScenario();
    if (stored === '') return '';
    return isScenarioId(stored) ? stored : SCENARIO_IDS[0];
  });

  const connecting = status === 'connecting';

  // Ready-made investigators this room offers that the player hasn't taken yet. Making a room
  // for a scenario offers that scenario's; joining one offers every scenario's, since the
  // player doesn't know which scenario the room was opened for until they're in it.
  const readyMade = PREGEN_TEMPLATES.filter(
    (p) =>
      p.scenarios?.some((s) => (mode === 'create' ? s === scenario : true)) &&
      !characters.some((c) => c.pregenKey === p.key),
  );
  const PREGEN_PREFIX = 'pregen:';

  function handleSelectCharacter(value: string) {
    clearError();
    if (value.startsWith(PREGEN_PREFIX)) {
      // Taking a ready-made investigator creates it on this device (so it's on the Characters
      // tab afterwards too) and selects it.
      const template = readyMade.find((p) => PREGEN_PREFIX + p.key === value);
      if (template) selectCharacter(createPregenCharacter(template, t));
      return;
    }
    selectCharacter(value || null);
  }

  // Playing as a character means the character's name is the player's name — there's nothing to
  // type. Only a guest enters one (and only a guest's typed name is remembered for next time).
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);
  const playerName = selectedCharacter ? selectedCharacter.name.trim() || t.characters.unnamed : name.trim();

  function submit() {
    if (!playerName) return;
    if (!selectedCharacter) rememberName(playerName);
    if (mode === 'create') {
      rememberScenario(scenario);
      createRoom(playerName, scenario || undefined);
    } else {
      joinRoom(roomCode.trim(), playerName);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <CompassRose size={120} className="mx-auto text-brass opacity-25" />
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

      {(characters.length > 0 || readyMade.length > 0) && (
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
            {readyMade.map((p) => (
              <option key={p.key} value={PREGEN_PREFIX + p.key}>
                {t.pregens[p.key].name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!selectedCharacter && (
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
      )}

      {mode === 'create' && (
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>{t.table.scenarioLabel}</span>
          <div className="flex gap-2">
            {[...SCENARIO_IDS, ''].map((id) => (
              <button
                key={id || 'free'}
                type="button"
                aria-pressed={scenario === id}
                onClick={() => setScenario(id as ScenarioId | '')}
                className={`flex-1 border py-2 text-xs uppercase tracking-wider transition-colors ${
                  scenario === id ? 'border-brass text-brass' : 'border-ink-line text-paper-dim'
                }`}
              >
                {id ? t.scenarios[id] : t.table.scenarioNone}
              </button>
            ))}
          </div>
        </div>
      )}

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
        disabled={connecting || !playerName || (mode === 'join' && !roomCode.trim())}
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
        {skillResult.level === 'fumble' && <EldritchMark size={20} className="shrink-0 text-oxblood" />}
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
          className={`${FIELD} min-w-0 max-w-[40%] px-2 py-2 text-sm`}
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
          className={`${FIELD} min-w-0 flex-1 px-3 py-2 text-sm`}
        />
        <button type="button" onClick={submit} className={`shrink-0 px-3 text-xs uppercase tracking-wider ${GHOST_BTN}`}>
          {t.table.requestRollSend}
        </button>
      </div>
    </div>
  );
}

function InviteButton({ roomCode }: { roomCode: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function invite() {
    const url = inviteUrl(roomCode);
    // On a phone, the native share sheet (WhatsApp, Telegram, Messages…) is the fastest way to
    // get the link to the table; elsewhere, copy it.
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // Cancelled, or sharing failed — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / denied); nothing useful left to do.
    }
  }

  return (
    <button
      type="button"
      onClick={invite}
      className={`text-[11px] uppercase tracking-wider transition-colors ${copied ? 'text-brass' : 'text-paper-dim hover:text-brass'}`}
    >
      {copied ? t.table.inviteCopied : t.table.inviteLink}
    </button>
  );
}

function RoomView() {
  const { t } = useLocale();
  const { roomCode, scenario, isKeeper, players, ledger, leaveRoom, prompt, dismissPrompt } = useTable();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={LABEL}>{t.table.roomLabel}</span>
          <div className="font-display text-3xl tracking-widest text-paper">{roomCode}</div>
          {scenario && t.scenarios[scenario] && (
            <div className="mt-1 text-[11px] uppercase tracking-widest text-brass">{t.scenarios[scenario]}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {roomCode && <InviteButton roomCode={roomCode} />}
          <button type="button" onClick={leaveRoom} className="text-[11px] uppercase tracking-wider text-oxblood/80 transition-colors hover:text-oxblood">
            {t.table.leaveRoom}
          </button>
        </div>
      </div>

      <HandoutCue />

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
      {isKeeper && <HandoutLibrary />}
      <MusicPanel />

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

      <HandoutDisplay />
    </div>
  );
}

export default function Table() {
  const { status } = useTable();
  return status === 'connected' ? <RoomView /> : <ConnectForm />;
}
