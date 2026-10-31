import { useEffect, useRef, type ReactNode } from 'react';
import { useLocale } from '../i18n/LocaleContext';

/** A panel that slides in from the right over a dimmed page — for a long list that doesn't belong
 * inline on a phone. Closes on Esc, on a tap outside, or on its close button; while open the page
 * behind doesn't scroll, focus moves to the panel, and goes back to whatever opened it. */
export default function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const scrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // The panel itself: a screen reader announces the dialog, and a phone's keyboard doesn't
    // pop up over the list before anyone has asked to search.
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = scrollLock;
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="drawer-backdrop-in absolute inset-0 bg-ink/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="drawer-in relative flex h-full w-[min(92%,26rem)] flex-col border-l border-ink-line bg-ink pb-[env(safe-area-inset-bottom)] shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-line px-4 py-3">
          <h2 className="m-0 truncate font-display text-xl text-paper">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.table.drawerClose}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none text-paper-dim transition-colors hover:text-brass"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
