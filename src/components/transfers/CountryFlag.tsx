import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  country?: string;
  className?: string;
}

/**
 * CountryFlag Component:
 * Standard country-flag-icons package with crisp 3:2 vector flags.
 * Enlarged for high-density clarity (default w-5 h-3.5 = 20px x 14px).
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({ country = 'US', className = '' }) => {
  let code = (country || 'US').trim().toUpperCase();
  if (code === 'UK') code = 'GB';

  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string; title?: string }>>)[code];

  if (FlagComponent) {
    return (
      <FlagComponent
        className={`w-5 h-3.5 rounded-[2px] shrink-0 inline-block object-cover shadow-xs ring-1 ring-white/10 ${className}`}
        title={code}
      />
    );
  }

  return (
    <span
      className={`w-5 h-3.5 rounded-[2px] bg-[var(--surface-muted)] text-[var(--foreground)] text-[9px] font-mono font-bold tracking-tight inline-flex items-center justify-center select-none shadow-xs ring-1 ring-white/10 ${className}`}
      title={code}
    >
      {code.slice(0, 2)}
    </span>
  );
};
