/**
 * AnimationControls — transport for the 2021 time-lapse on the Map page.
 *
 * A Play/Pause button advances the frame index ~every 350ms via a setInterval
 * (cleared on pause/unmount; loops back to 0 at the end), a range slider scrubs
 * the frame index directly, and a label shows the current frame's timestamp.
 *
 * Stateless about the frames themselves: the parent owns the frame index and the
 * list of timestamps, so the same surface re-renders on the existing StationMap.
 */
import * as React from 'react';
import { Button } from '../ui/button';
import { formatDateTime } from '../../lib/format';

export interface AnimationControlsProps {
  /** Frame timestamps (e.g. "2021-01-01 00:00"), one per frame. */
  times: string[];
  /** Current frame index (0-based). */
  index: number;
  /** Set the current frame index (used by the scrubber + the timer). */
  onIndexChange: (index: number) => void;
  /** Step between frames, in ms. */
  intervalMs?: number;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  times,
  index,
  onIndexChange,
  intervalMs = 350,
}) => {
  const [playing, setPlaying] = React.useState(false);
  const count = times.length;
  const last = Math.max(0, count - 1);
  const noFrames = count === 0;

  // Keep the latest setter/index/count in refs so the interval callback stays
  // stable and reads the freshest values without resetting the timer per frame.
  const onIndexRef = React.useRef(onIndexChange);
  const indexRef = React.useRef(index);
  const countRef = React.useRef(count);
  onIndexRef.current = onIndexChange;
  indexRef.current = index;
  countRef.current = count;

  // Advance the frame on a timer while playing; loop at the end. Cleared on
  // pause and on unmount.
  React.useEffect(() => {
    if (!playing || count <= 1) return undefined;
    const id = window.setInterval(() => {
      onIndexRef.current((indexRef.current + 1) % countRef.current);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, intervalMs, count]);

  const currentTime = times[index] ?? null;

  return (
    <div className="flex flex-col gap-3 border border-line p-4">
      <div className="flex items-center gap-4">
        <Button
          variant={playing ? 'secondary' : 'primary'}
          size="sm"
          rounded="none"
          onClick={() => setPlaying((p) => !p)}
          disabled={noFrames || count <= 1}
          aria-pressed={playing}
          aria-label={playing ? 'Pause animation' : 'Play animation'}
        >
          {playing ? 'Pause' : 'Play'}
        </Button>

        <div className="flex flex-col">
          <span className="text-caption text-ink-500">Frame time</span>
          <span className="text-body-md text-ink-900 tabular-nums" aria-live="polite">
            {currentTime ? formatDateTime(currentTime) : '—'}
          </span>
        </div>

        <span className="ml-auto text-caption text-ink-500 tabular-nums">
          {noFrames ? '0 / 0' : `${index + 1} / ${count}`}
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="sr-only">Scrub to a frame</span>
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          disabled={noFrames}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          aria-label="Frame position"
          aria-valuetext={currentTime ? formatDateTime(currentTime) : undefined}
          className="w-full accent-brand-600 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>
    </div>
  );
};
