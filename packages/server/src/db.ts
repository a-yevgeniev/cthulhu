import { DatabaseSync } from 'node:sqlite';
import type { LedgerEntry, Player } from 'coc7-protocol';

const DB_PATH = process.env.COC7_DB_PATH ?? 'coc7-table.sqlite';

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL REFERENCES rooms(code),
    name TEXT NOT NULL,
    is_keeper INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ledger (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL REFERENCES rooms(code),
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    secret INTEGER NOT NULL,
    result_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS ledger_room_idx ON ledger(room_code, timestamp);
`);

export function roomExists(code: string): boolean {
  return db.prepare('SELECT 1 FROM rooms WHERE code = ?').get(code) !== undefined;
}

export function createRoom(code: string): void {
  db.prepare('INSERT INTO rooms (code, created_at) VALUES (?, ?)').run(code, Date.now());
}

export function insertPlayer(player: Player & { roomCode: string }): void {
  db.prepare(
    'INSERT INTO players (id, room_code, name, is_keeper, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(player.id, player.roomCode, player.name, player.isKeeper ? 1 : 0, Date.now());
}

export function insertLedgerEntry(roomCode: string, entry: LedgerEntry): void {
  db.prepare(
    'INSERT INTO ledger (id, room_code, player_id, player_name, timestamp, kind, label, secret, result_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    entry.id,
    roomCode,
    entry.playerId,
    entry.playerName,
    entry.timestamp,
    entry.kind,
    entry.label,
    entry.secret ? 1 : 0,
    JSON.stringify(entry.result),
  );
}

interface LedgerRow {
  id: string;
  player_id: string;
  player_name: string;
  timestamp: number;
  kind: LedgerEntry['kind'];
  label: string;
  secret: number;
  result_json: string;
}

/** Ledger visible to `viewerPlayerId`: secret entries only show to their roller. Keepers see everything by passing null. */
export function ledgerFor(roomCode: string, viewerPlayerId: string | null): LedgerEntry[] {
  const rows = db
    .prepare('SELECT * FROM ledger WHERE room_code = ? ORDER BY timestamp ASC')
    .all(roomCode) as unknown as LedgerRow[];
  return rows
    .filter((r) => r.secret === 0 || viewerPlayerId === null || r.player_id === viewerPlayerId)
    .map((r) => ({
      id: r.id,
      playerId: r.player_id,
      playerName: r.player_name,
      timestamp: r.timestamp,
      kind: r.kind,
      label: r.label,
      secret: r.secret === 1,
      result: JSON.parse(r.result_json),
    }));
}
