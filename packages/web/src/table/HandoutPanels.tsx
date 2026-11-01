import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext';
import { useTable } from './TableContext';
import { findHandout, handoutsFor } from './handouts';
import {
  deleteUpload,
  imageFileToDataUrl,
  loadUploads,
  saveUpload,
  titleFromFileName,
  type UploadedHandout,
} from './handoutUploads';
import Section from './Section';
import { GHOST_BTN, LABEL } from './styles';

const DISPLAY_ID = 'handout-display';
/** Keeps a Keeper's on-device library (and the grid) to a sane size. */
const MAX_UPLOADS = 24;

/** The handout sits at the very bottom of the room page so it doesn't push the dice controls
 * down, which means a player could easily not notice one appear. This is the pointer to it: a
 * line at the top, only while something is on display, that jumps down to it. (Not shown to the
 * Keeper — they just put it there.) */
export function HandoutCue() {
  const { t } = useLocale();
  const { handouts, isKeeper } = useTable();
  if (isKeeper || !handouts.some((h) => h.upload || findHandout(h.id))) return null;

  function jump() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(DISPLAY_ID)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <button
      type="button"
      onClick={jump}
      className="border border-brass/60 px-4 py-2 text-xs uppercase tracking-wider text-brass transition-colors hover:bg-brass hover:text-ink"
    >
      {t.table.handoutBelow}
    </button>
  );
}

/** The handouts currently on display — visible to everyone in the room, at the bottom of the
 * page, one per row so each is as large as it can be. Only the Keeper gets Hide buttons;
 * players have no control over them. */
export function HandoutDisplay() {
  const { t } = useLocale();
  const { handouts, isKeeper, changeHandouts } = useTable();
  // An id this app doesn't know (say, a newer handout than this build) just shows nothing.
  const images = handouts.flatMap((h) => {
    if (h.upload) return [{ id: h.id, src: h.upload.dataUrl, alt: h.upload.title, credit: undefined }];
    const bundled = findHandout(h.id);
    return bundled ? [{ id: h.id, src: bundled.src, alt: t.handouts[bundled.id]?.alt ?? '', credit: bundled.credit }] : [];
  });
  if (images.length === 0) return null;

  return (
    // The room page is a phone-width column; on a wider screen the display breaks out of it
    // (centred, up to 60rem) so plans and maps are big enough to read.
    <section
      id={DISPLAY_ID}
      className="relative flex scroll-mt-20 flex-col gap-3 md:left-1/2 md:w-[min(calc(100vw-2rem),60rem)] md:-translate-x-1/2"
    >
      {isKeeper && images.length > 1 && (
        <button
          type="button"
          onClick={() => changeHandouts({ type: 'clear' })}
          className={`self-end px-3 py-1 text-[11px] uppercase tracking-wider ${GHOST_BTN}`}
        >
          {t.table.handoutHideAll}
        </button>
      )}
      <div className="flex flex-col gap-3">
        {images.map((image) => (
          <figure key={image.id} className="m-0 flex flex-col gap-3 border border-brass/60 bg-ink-raised px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className={LABEL}>{t.table.handoutShownLabel}</span>
              {isKeeper && (
                <button
                  type="button"
                  onClick={() => changeHandouts({ type: 'hide', id: image.id })}
                  className={`px-3 py-1 text-[11px] uppercase tracking-wider ${GHOST_BTN}`}
                >
                  {t.table.handoutHide}
                </button>
              )}
            </div>
            <img src={image.src} alt={image.alt} className="mx-auto h-auto max-h-[85vh] w-auto max-w-full object-contain" />
            {image.credit && <figcaption className="text-center text-[10px] text-paper-dim">{image.credit}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

/** One tile on the Keeper's shelf: the picture (tap to show or hide it) and a status line. */
function Tile({
  src,
  shown,
  onToggle,
  title,
  footer,
}: {
  src: string;
  shown: boolean;
  onToggle: () => void;
  title: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className={`flex flex-col gap-2 border p-2 transition-colors ${shown ? 'border-brass' : 'border-ink-line'}`}>
      <button type="button" aria-pressed={shown} onClick={onToggle} className="flex flex-col gap-2 text-left">
        <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-ink">
          <img src={src} alt="" className="h-full w-full object-contain" />
        </span>
        <span className={`text-[10px] uppercase tracking-wider ${shown ? 'text-brass' : 'text-paper-dim'}`}>
          {shown ? t.table.handoutOnDisplay : t.table.handoutShow}
        </span>
      </button>
      {title}
      {footer}
    </div>
  );
}

/** The Keeper's shelf: this room's scenario handouts plus any images they've added themselves. Tap
 * one to put it in front of the table, tap it again (or Hide on the display) to take it down.
 * Added images stay on this device; a player's browser only ever receives one while it's shown. */
export function HandoutLibrary() {
  const { t } = useLocale();
  const { scenario, handouts, changeHandouts } = useTable();
  const bundled = handoutsFor(scenario);
  const isShown = (id: string) => handouts.some((h) => h.id === id);
  const [uploads, setUploads] = useState<UploadedHandout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadUploads().then((saved) => {
      if (!cancelled) setUploads(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    let count = uploads.length;
    for (const file of Array.from(files)) {
      if (count >= MAX_UPLOADS) {
        setError(t.table.handoutLibraryFull);
        break;
      }
      try {
        const handout: UploadedHandout = {
          id: crypto.randomUUID(),
          title: titleFromFileName(file.name),
          dataUrl: await imageFileToDataUrl(file),
          createdAt: Date.now(),
        };
        count += 1;
        setUploads((prev) => [...prev, handout]);
        void saveUpload(handout);
      } catch {
        setError(t.table.handoutUploadFailed);
      }
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  function remove(handout: UploadedHandout) {
    if (isShown(handout.id)) changeHandouts({ type: 'hide', id: handout.id });
    setUploads((prev) => prev.filter((u) => u.id !== handout.id));
    void deleteUpload(handout.id);
  }

  return (
    <Section
      id="handouts"
      title={t.table.handoutsHeading}
      summary={handouts.length > 0 ? `${t.table.handoutOnDisplay}: ${handouts.length}` : undefined}
    >
      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className={`px-3 py-1 text-[11px] uppercase tracking-wider disabled:opacity-40 ${GHOST_BTN}`}
        >
          {t.table.handoutAdd}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {bundled.map((handout) => (
          <Tile
            key={handout.id}
            src={handout.src}
            shown={isShown(handout.id)}
            onToggle={() =>
              changeHandouts(
                isShown(handout.id)
                  ? { type: 'hide', id: handout.id }
                  : { type: 'show', item: { id: handout.id, upload: null } },
              )
            }
            title={<span className="text-xs text-paper">{t.handouts[handout.id]?.title ?? handout.id}</span>}
          />
        ))}
        {uploads.map((handout) => (
          <Tile
            key={handout.id}
            src={handout.dataUrl}
            shown={isShown(handout.id)}
            onToggle={() =>
              changeHandouts(
                isShown(handout.id)
                  ? { type: 'hide', id: handout.id }
                  : { type: 'show', item: { id: handout.id, upload: { title: handout.title, dataUrl: handout.dataUrl } } },
              )
            }
            title={
              <input
                type="text"
                value={handout.title}
                aria-label={t.table.handoutTitleLabel}
                maxLength={80}
                onChange={(e) => {
                  const title = e.target.value;
                  setUploads((prev) => prev.map((u) => (u.id === handout.id ? { ...u, title } : u)));
                }}
                onBlur={() => void saveUpload(handout)}
                className="w-full min-w-0 border-0 border-b border-ink-line bg-transparent pb-0.5 text-xs text-paper focus:border-brass focus:outline-none"
              />
            }
            footer={
              <button
                type="button"
                onClick={() => remove(handout)}
                className="self-start text-[10px] uppercase tracking-wider text-oxblood/80 transition-colors hover:text-oxblood"
              >
                {t.table.handoutRemove}
              </button>
            }
          />
        ))}
      </div>

      {error && <p className="text-sm text-oxblood">{error}</p>}
      <p className="text-[11px] leading-relaxed text-paper-dim">{t.table.handoutUploadNote}</p>
    </Section>
  );
}
