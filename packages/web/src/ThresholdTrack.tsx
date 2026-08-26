import { useLocale } from './i18n/LocaleContext';

interface ThresholdTrackProps {
  regular: number;
  hard: number;
  extreme: number;
  /** 0-100, or undefined to leave the marker parked at 0. */
  roll?: number;
  fumble?: boolean;
}

export default function ThresholdTrack({ regular, hard, extreme, roll, fumble }: ThresholdTrackProps) {
  const { t } = useLocale();
  const failWidth = 100 - regular;
  const regularWidth = regular - hard;
  const hardWidth = hard - extreme;
  const extremeWidth = extreme;

  return (
    <div>
      <div className="track">
        <div style={{ width: `${extremeWidth}%` }} className="bg-verdigris" />
        <div style={{ width: `${hardWidth}%` }} className="bg-verdigris/50" />
        <div style={{ width: `${regularWidth}%` }} className="bg-paper/30" />
        <div style={{ width: `${failWidth}%` }} className="bg-ink-line" />
        <div
          className={`track-marker ${fumble ? 'fumble' : ''}`}
          style={{ left: `${roll ?? 0}%` }}
        />
      </div>
      <div className="mt-2.5 flex justify-between text-[10px] uppercase tracking-wider text-paper-dim">
        <span>
          {t.difficulty.extreme} {extreme}
        </span>
        <span>
          {t.difficulty.hard} {hard}
        </span>
        <span>
          {t.difficulty.regular} {regular}
        </span>
      </div>
    </div>
  );
}
