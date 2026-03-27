/**
 * Form Input Component
 */

import React from 'react';

export interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
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
        <input
          ref={ref}
          className={`input ${errorClass} ${className}`.trim()}
          {...props}
        />
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

FormInput.displayName = 'FormInput';
