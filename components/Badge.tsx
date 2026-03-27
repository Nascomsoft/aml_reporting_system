/**
 * Badge Component
 * Displays status, priority, or category labels
 */

import React from 'react';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'danger' | 'success' | 'warning';
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'primary',
      icon,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantClass = `badge-${variant}`;
    const finalClassName = ['badge', variantClass, className]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={finalClassName} {...props}>
        {icon && <span>{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
