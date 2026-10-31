/**
 * A Keeper's own handout images (for example floor plans cropped from their copy of a scenario).
 * They live on the Keeper's device — shrunk here, kept in IndexedDB between sessions — and reach
 * the room only at the moment the Keeper shows one. See `HandoutImage` in coc7-protocol.
 */

export interface UploadedHandout {
  id: string;
  title: string;
  /** `data:image/jpeg;base64,…`, already within the server's size limit. */
  dataUrl: string;
  createdAt: number;
}

/** Longest edge of a stored image: enough to read a floor plan on a phone, small enough to
 * send at the table. */
const MAX_SIDE = 1400;
/** Comfortably under the server's 700,000-character cap on a handout data URL. */
const MAX_DATA_URL_LENGTH = 600_000;
/** Refuse to even decode something absurd (a raw camera RAW, a huge TIFF…). */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export class UploadError extends Error {}

/** Shrinks any browser-readable image to a JPEG that fits the server's limit: scaled so the
 * longest edge is at most 1400px, then recompressed (quality first, size second) until it fits.
 * Transparency is flattened onto white, which suits scans and floor plans. */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new UploadError('Not an image.');
  if (file.size > MAX_FILE_BYTES) throw new UploadError('File is too large.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UploadError('This image format cannot be read by the browser.');
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new UploadError('Canvas is unavailable.');

    let side = MAX_SIDE;
    let quality = 0.86;
    for (let attempt = 0; attempt < 10; attempt++) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
      if (quality > 0.62) quality -= 0.08;
      else side = Math.round(side * 0.8);
    }
    throw new UploadError('Could not shrink this image enough.');
  } finally {
    bitmap.close();
  }
}

/** The file's name without its extension — a sensible first title the Keeper can rename. */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim() || 'Handout';
}

// ----------------------------------------------------------------------- storage

const DB_NAME = 'coc7-handouts';
const STORE = 'uploads';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Every operation here is best-effort: IndexedDB can be missing or refuse (private windows,
 * blocked site data). The Keeper's library then simply doesn't survive a page reload — the
 * session still works, so none of this is worth surfacing as an error. */
export async function loadUploads(): Promise<UploadedHandout[]> {
  try {
    const db = await openDb();
    const all = await wrap(db.transaction(STORE).objectStore(STORE).getAll() as IDBRequest<UploadedHandout[]>);
    db.close();
    return all.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function saveUpload(handout: UploadedHandout): Promise<void> {
  try {
    const db = await openDb();
    await wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).put(handout));
    db.close();
  } catch {
    // not persisted
  }
}

export async function deleteUpload(id: string): Promise<void> {
  try {
    const db = await openDb();
    await wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
    db.close();
  } catch {
    // not persisted
  }
}
