/**
 * Role-Based Layout Component
 * Provides role identification and role-specific UI management
 */

import React from 'react';

export type UserRole = 'bank_officer' | 'admin' | 'regulator';

export interface RoleBasedLayoutProps {
  userRole: UserRole;
  userName: string;
  children: React.ReactNode;
  onRoleChange?: (role: UserRole) => void;
}

const roleConfig: Record<UserRole, {
  label: string;
  color: string;
  icon: string;
  description: string;
}> = {
  bank_officer: {
    label: 'Bank Officer',
    color: '#0284c7',
    icon: '🏦',
    description: 'Compliance and Investigation',
  },
  admin: {
    label: 'System Admin',
    color: '#8b5cf6',
    icon: '⚙️',
    description: 'System Management',
  },
  regulator: {
    label: 'Regulator',
    color: '#16a34a',
    icon: '📋',
    description: 'Regulatory Monitoring',
  },
};

export const RoleBasedLayout: React.FC<RoleBasedLayoutProps> = ({
  userRole,
  userName,
  children,
  onRoleChange,
}) => {
  const currentRole = roleConfig[userRole];

  return (
    <div className="role-based-layout">
      {/* Role Badge in Header */}
      <div
        className="bg-bg-secondary border-b border-border-default px-6 py-3 flex items-center justify-between"
        style={{ borderLeftColor: currentRole.color, borderLeftWidth: '4px' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentRole.icon}</span>
          <div>
            <p className="text-xs text-text-secondary font-medium">
              Current Role
            </p>
            <p
              className="font-semibold text-base"
              style={{ color: currentRole.color }}
            >
              {currentRole.label}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {currentRole.description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">Logged in as</p>
          <p className="font-medium text-base">{userName}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="role-content">{children}</div>
    </div>
  );
};

/**
 * Permission checker utility
 * Use to determine if current user role has access to a feature
 */
export function hasPermission(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Role-restricted component wrapper
 */
export interface RoleRestrictedProps {
  userRole: UserRole;
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleRestricted: React.FC<RoleRestrictedProps> = ({
  userRole,
  allowedRoles,
  children,
  fallback = null,
}) => {
  if (!hasPermission(userRole, allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
