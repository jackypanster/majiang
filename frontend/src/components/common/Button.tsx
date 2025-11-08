/**
 * Button component
 */

import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  children: React.ReactNode;
}

export function Button({
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  children
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors cursor-pointer';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
  };

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
