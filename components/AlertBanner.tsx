/**
 * Alert Banner Component
 * Displays alert messages (info, success, warning, danger)
 */

import React from 'react';

export interface AlertBannerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const typeConfig = {
  info: {
    bgColor: 'bg-info-100',
    borderColor: 'border-info-300',
    textColor: 'text-info-900',
    icon: 'ℹ️',
  },
  success: {
    bgColor: 'bg-success-100',
    borderColor: 'border-success-300',
    textColor: 'text-success-900',
    icon: '✓',
  },
  warning: {
    bgColor: 'bg-warning-100',
    borderColor: 'border-warning-300',
    textColor: 'text-warning-900',
    icon: '⚠️',
  },
  danger: {
    bgColor: 'bg-danger-100',
    borderColor: 'border-danger-300',
    textColor: 'text-danger-900',
    icon: '❌',
  },
};

export const AlertBanner = React.forwardRef<
  HTMLDivElement,
  AlertBannerProps
>(
  (
    {
      type = 'info',
      title,
      message,
      icon,
      onClose,
      action,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const config = typeConfig[type];

    return (
      <div
        ref={ref}
        className={`
          ${config.bgColor} ${config.borderColor} ${config.textColor}
          border rounded-lg p-4 flex items-start gap-3
          ${className}
        `.trim()}
        {...props}
      >
        <span className="flex-shrink-0 text-lg mt-0.5">
          {icon || config.icon}
        </span>

        <div className="flex-1">
          {title && <p className="font-semibold mb-1">{title}</p>}
          {message && <p className="text-sm">{message}</p>}
          {children}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium underline hover:no-underline"
            >
              {action.label}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-lg leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';
