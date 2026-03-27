/**
 * Table Component
 */

import React from 'react';

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  hoverable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  striped = true,
  hoverable = true,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="p-6 text-center text-text-secondary">
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 text-center text-text-tertiary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border-default rounded-lg">
      <table>
        <thead>
          <tr className="bg-bg-secondary">
            {columns.map((column, index) => (
              <th key={String(index)} style={{ width: column.width }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={String(row[rowKey])}
              className={`
                ${striped && idx % 2 === 1 ? 'bg-bg-tertiary' : ''}
                ${hoverable && onRowClick ? 'cursor-pointer hover:bg-bg-secondary' : ''}
                transition-colors
              `.trim()}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, index) => (
                <td key={String(index)}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
