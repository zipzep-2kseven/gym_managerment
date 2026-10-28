import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
}) => {
  return (
    <div className="management-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="management-page-subtitle">{subtitle}</div>}
      </div>
      {action && <div className="management-header-actions">{action}</div>}
    </div>
  );
};
