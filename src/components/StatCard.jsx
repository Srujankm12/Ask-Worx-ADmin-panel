import React from 'react';

import { cn } from '../lib/utils';
import { CountUp } from './motion/CountUp';

/**
 * A metric tile. Type and hairlines only.
 *
 * There are no icons on these. A rounded icon chip beside every figure is a
 * dashboard convention borrowed from elsewhere; this system draws with type,
 * rules and ground, and a label already says what the number is. Dropping the
 * chip also lets the figure sit at the top of its cell where the eye lands.
 *
 * A tile that is asking for something has to look different, and in THIS
 * system that difference is ink, not colour:
 *
 *   DESIGN.md §2  "White dominates. `paper` and `ink` are punctuation."
 *   DESIGN.md §4  "Use `ink` sparingly for the moments that carry weight."
 *   Admin §2      "Primary is `ink`. The emphatic colour is darkness."
 *
 * That sentence — paper and ink are the punctuation — gives three levels
 * without inventing anything:
 *
 *   attention  ink ground, champagne text, the inverted drawing grid behind
 *              it. The one thing most wanting a person. At most ONE per row;
 *              two adjacent ink cells merge into a dark block and the
 *              emphasis is lost.
 *   waiting    paper ground. Also needs acting on, but a step below ink
 *              rather than competing with it.
 *   default    white. Context.
 *
 * An earlier version used a tinted ground, a coloured severity stripe and a
 * looping pulse. All three were wrong here: the tint broke the white-dominant
 * rule, the stripe is not an element this system has, and §6 is explicit that
 * nothing loops or demands attention it has not earned.
 *
 * Set `onClick` to make the tile the way in to whatever it counts — a figure
 * that says "2 waiting on you" should not then need to be hunted for.
 */
const StatCard = ({
  label,
  value,
  tone = 'default',
  trend,
  hint,
  actionLabel,
  onClick,
  zeroHint,
}) => {
  const count = Number(value) || 0;
  const numeric = typeof value === 'number' || /^\d+$/.test(String(value ?? ''));

  const needsAction = tone === 'attention' || tone === 'waiting';
  // An attention tile with nothing in it is good news. Ink over "0" would be
  // weight spent on the absence of work.
  const active = tone === 'attention' && count > 0;
  const waiting = tone === 'waiting' && count > 0;
  const resolved = needsAction && count === 0;

  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      {...(interactive
        ? {
            type: 'button',
            onClick,
            'aria-label': `${label}: ${value}. ${actionLabel || 'Open'}`,
          }
        : {})}
      className={cn(
        'group/tile relative w-full overflow-hidden px-5 py-5 text-left transition-colors duration-300',
        active ? 'bg-ink' : waiting ? 'bg-paper hover:bg-champagne-100' : 'bg-white hover:bg-paper',
        interactive && 'cursor-pointer',
      )}
    >
      {/* The drawing grid, inverted for the ink ground — the same layer the
          site puts behind its ink bands. Decorative, so hidden from AT. */}
      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid-paper-inverse"
        />
      )}

      <p className={cn('relative spec-label', active && 'text-champagne')}>{label}</p>

      <div className="relative mt-3 flex items-baseline gap-2">
        <span
          className={cn(
            'font-heading text-[2.25rem] font-extrabold leading-none tracking-tight tabular-nums',
            active ? 'text-champagne-100' : resolved ? 'text-titanium-300' : 'text-ink',
          )}
        >
          {numeric ? <CountUp value={count} /> : (value ?? '—')}
        </span>

        {trend != null && (
          <span
            className={cn(
              'font-mono text-[11px] tracking-[0.08em]',
              trend > 0 ? 'text-success' : 'text-danger',
            )}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <p
        className={cn(
          'relative mt-3 text-[12px] leading-snug',
          active ? 'text-champagne-600' : 'text-text-secondary',
        )}
      >
        {resolved ? zeroHint || hint : hint}
      </p>

      {/* The way in, in the drawing-sheet label voice rather than as a button
          nested inside a button. */}
      {(active || waiting) && actionLabel && (
        <span
          className={cn(
            'relative mt-3 block font-mono text-[10px] tracking-[0.18em] uppercase underline underline-offset-4 transition-colors',
            active
              ? 'text-champagne decoration-champagne/40 group-hover/tile:decoration-champagne'
              : 'text-titanium-700 decoration-line-strong group-hover/tile:text-ink group-hover/tile:decoration-ink',
          )}
        >
          {actionLabel}
        </span>
      )}
    </Tag>
  );
};

export default StatCard;
