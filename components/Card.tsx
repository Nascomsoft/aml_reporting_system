/**
 * Card Component
 * A flexible container with consistent styling
 */

import React from 'react';

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  noBorder?: boolean;
  noShadow?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = '',
      noPadding = false,
      noBorder = false,
      noShadow = false,
      ...props
    },
    ref
  ) => {
    const padding = noPadding ? '' : 'p-6';
    const border = noBorder ? '' : 'border';
    const shadow = noShadow ? '' : 'shadow';

    const finalClassName = ['card', padding, border, shadow, className]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={finalClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
