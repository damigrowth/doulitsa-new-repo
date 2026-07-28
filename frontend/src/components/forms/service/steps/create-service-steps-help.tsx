'use client';

import React from 'react';

interface CreateServiceStepHelpProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'tip' | 'warning' | 'optional';
  className?: string;
}

export default function CreateServiceStepsHelp({
  title,
  children,
  variant = 'info',
  className,
}: CreateServiceStepHelpProps) {
  const variantClasses = {
    info: 'bg-gray-50 text-gray-600',
    tip: 'bg-blue-50 text-blue-600 border border-blue-200',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    optional: 'bg-green-50 text-green-600 border border-green-200',
  };

  return (
    <div
      className={`text-center text-sm p-4 rounded-lg ${variantClasses[variant]} ${className || ''}`}
    >
      {title ? (
        <p>
          <strong>{title}:</strong> {children}
        </p>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}
