import React from 'react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Loading({ 
  message = 'Loading...', 
  fullScreen = false,
  size = 'md'
}: LoadingProps) {
  const spinnerSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClass = fullScreen 
    ? 'min-h-screen flex items-center justify-center bg-background'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className={`animate-spin ${spinnerSizes[size]} border-2 border-primary border-t-transparent rounded-full mx-auto mb-4`}></div>
        <p className={`${textSizes[size]} font-medium text-foreground`}>{message}</p>
      </div>
    </div>
  );
}

