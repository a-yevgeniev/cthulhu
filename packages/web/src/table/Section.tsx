import { useState, type ReactNode } from 'react';
import { rememberSectionOpen, rememberedSectionOpen } from './session';
import { LABEL } from './styles';

/** A card on the Keeper's room page whose body can be folded away, so the dice and the log stay
 * close to hand. Open or closed is remembered per section on this device. The header can carry a
 * short `summary` so a closed section still says what's inside (what's playing, how many images
 * are up).
 *
 * `keepMounted` keeps a closed section's body alive but out of sight — for the music player,
 * which stops the moment it's unmounted. */
export default function Section({
  id,
  title,
  summary,
  defaultOpen = false,
  keepMounted = false,
  children,
}: {
  id: string;
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  keepMounted?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => rememberedSectionOpen(id, defaultOpen));
  const bodyId = `section-${id}`;

  function toggle() {
    setOpen((was) => {
      rememberSectionOpen(id, !was);
      return !was;
    });
  }

  return (
    <section className="border border-ink-line">
      <h2 className="m-0">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className={LABEL}>{title}</span>
            {summary && <span className="truncate text-sm text-paper-dim">{summary}</span>}
          </span>
          <svg
            viewBox="0 0 12 12"
            aria-hidden="true"
            className={`h-3 w-3 shrink-0 text-brass transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </h2>
      {(open || keepMounted) && (
        <div
          id={bodyId}
          // Closed but kept alive: parked off-screen and out of the tab order, like the
          // listeners' hidden music player.
          {...(open ? {} : { 'aria-hidden': true, inert: true })}
          className={open ? 'flex flex-col gap-3 border-t border-ink-line/60 px-4 py-3' : 'pointer-events-none fixed -left-[9999px] top-0 w-80'}
        >
          {children}
        </div>
      )}
    </section>
  );
}
