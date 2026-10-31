import { useLocale } from '../i18n/LocaleContext';
import { useTable } from './TableContext';
import { findHandout, handoutsFor } from './handouts';
import { GHOST_BTN, LABEL } from './styles';

const DISPLAY_ID = 'handout-display';

/** The handout sits at the very bottom of the room page so it doesn't push the dice controls
 * down, which means a player could easily not notice one appear. This is the pointer to it: a
 * line at the top, only while something is on display, that jumps down to it. (Not shown to the
 * Keeper — they just put it there.) */
export function HandoutCue() {
  const { t } = useLocale();
  const { handoutId, isKeeper } = useTable();
  if (isKeeper || !findHandout(handoutId)) return null;

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

/** The handout currently on display — visible to everyone in the room, at the bottom of the
 * page. Only the Keeper gets a Hide button; players have no control over it. */
export function HandoutDisplay() {
  const { t } = useLocale();
  const { handoutId, isKeeper, setHandout } = useTable();
  const handout = findHandout(handoutId);
  // An id this app doesn't know (say, a newer handout than this build) just shows nothing.
  if (!handout) return null;

  return (
    <figure id={DISPLAY_ID} className="m-0 flex scroll-mt-20 flex-col gap-3 border border-brass/60 bg-ink-raised px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className={LABEL}>{t.table.handoutShownLabel}</span>
        {isKeeper && (
          <button
            type="button"
            onClick={() => setHandout(null)}
            className={`px-3 py-1 text-[11px] uppercase tracking-wider ${GHOST_BTN}`}
          >
            {t.table.handoutHide}
          </button>
        )}
      </div>
      <img
        src={handout.src}
        alt={t.handouts[handout.id]?.alt ?? ''}
        className="mx-auto max-h-[60vh] w-full object-contain"
      />
    </figure>
  );
}

/** The Keeper's shelf of handouts for this room's scenario: tap one to put it in front of the
 * table, tap it again (or Hide above) to take it down. */
export function HandoutLibrary() {
  const { t } = useLocale();
  const { scenario, handoutId, setHandout } = useTable();
  const items = handoutsFor(scenario);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border border-ink-line px-4 py-3">
      <h2 className={LABEL}>{t.table.handoutsHeading}</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((handout) => {
          const shown = handout.id === handoutId;
          return (
            <button
              key={handout.id}
              type="button"
              aria-pressed={shown}
              onClick={() => setHandout(shown ? null : handout.id)}
              className={`flex flex-col gap-2 border p-2 text-left transition-colors ${
                shown ? 'border-brass' : 'border-ink-line hover:border-brass/60'
              }`}
            >
              <span className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-ink">
                <img
                  src={handout.src}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="text-xs text-paper">{t.handouts[handout.id]?.title ?? handout.id}</span>
              <span className={`text-[10px] uppercase tracking-wider ${shown ? 'text-brass' : 'text-paper-dim'}`}>
                {shown ? t.table.handoutOnDisplay : t.table.handoutShow}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
