import React from 'react';

// Tailwind can only generate a class if it appears as complete, literal
// text somewhere in the source. Building `${color}/10` from a runtime
// prop never produces that literal text, so it silently fails — that's
// what caused the invisible icons. This map spells out every combination
// as a full literal string instead, keyed by a plain semantic name.
const TILE_STYLES = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  slate600: 'bg-slate-600/10 text-slate-600',
  slate400: 'bg-slate-400/10 text-slate-400',
};

const StatCard = ({ label, value, icon: Icon, color = 'primary', trend }) => {
  const tileClass = TILE_STYLES[color] || TILE_STYLES.primary;

  return (
    <div className="bg-white border border-border rounded-lg p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${tileClass}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-text-secondary">{label}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h3 className="text-xl font-bold text-text-primary tabular-nums">{value}</h3>
            {trend != null && (
              <span
                className={`text-xs font-medium ${trend > 0 ? 'text-success' : 'text-danger'}`}
              >
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;