/**
 * Modal Component
 */

import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onClose,
  footer,
  size = 'md',
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`
            bg-bg-secondary border border-border-default rounded-lg
            ${sizeConfig[size]} w-full max-w-full
            shadow-dark animate-slide-in
          `.trim()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h5 className="heading-5 text-primary">{title}</h5>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-primary text-2xl leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border-default bg-bg-primary rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
