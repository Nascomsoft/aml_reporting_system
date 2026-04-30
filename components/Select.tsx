/**
 * Select Component
 */

import React from 'react';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  placeholderDisabled?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      options = [],
      placeholder = 'Select an option',
      placeholderDisabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const widthClass = fullWidth ? 'w-full' : '';
    const errorClass = error ? 'border-red-600' : '';

    return (
      <div className={widthClass}>
        {label && (
          <label className="block text-sm font-medium mb-2 text-primary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`input cursor-pointer ${errorClass} ${className}`.trim()}
          {...props}
        >
          <option value="" disabled={placeholderDisabled}>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs mt-1 text-danger-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs mt-1 text-tertiary">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
