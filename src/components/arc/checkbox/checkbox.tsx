'use client'

import React, { forwardRef, useId } from 'react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  description?: React.ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, checked, onChange, disabled, className = '', id, ...props },
  ref
) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <label
      htmlFor={inputId}
      className={`group flex items-start gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        {/* Arc UI Checkbox 外盒 */}
        <div
          className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-[background-color,box-shadow,transform] duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)] peer-focus-visible:ring-offset-1 active:scale-95 ${
            checked
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'bg-[var(--surface-muted)] text-transparent group-hover:bg-[var(--surface-muted)]/80'
          }`}
          aria-hidden="true"
        >
          <svg
            className={`w-2.5 h-2.5 transition-transform duration-150 ${
              checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6.5L4.5 8.5L9.5 3.5" />
          </svg>
        </div>
      </div>

      {(label || description) && (
        <div className="space-y-0.5 flex-1">
          {label && (
            <span className="block text-xs font-normal text-[var(--foreground)] leading-snug">
              {label}
            </span>
          )}
          {description && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  )
})
