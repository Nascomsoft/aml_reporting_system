/**
 * KPI Card Component
 * Displays key performance indicator with title, value, and optional trend
 */

import React from 'react';
import { Card } from './Card';

export interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtext?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string | number;
    label?: string;
  };
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  subtext,
  trend,
  onClick,
}) => {
  const trendColor =
    trend?.direction === 'up'
      ? 'text-accent-600'
      : trend?.direction === 'down'
        ? 'text-danger-600'
        : 'text-text-secondary';

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <h6 className="heading-6 text-text-secondary">{title}</h6>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>

      <div className="mb-3">
        <p className="heading-3 text-primary">{value}</p>
        {subtext && <p className="text-xs text-text-tertiary mt-1">{subtext}</p>}
      </div>

      {trend && (
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <span>
            {trend.direction === 'up'
              ? '📈'
              : trend.direction === 'down'
                ? '📉'
                : '➡️'}
          </span>
          <span className="font-medium">{trend.value}</span>
          {trend.label && <span className="text-xs">{trend.label}</span>}
        </div>
      )}
    </Card>
  );
};
