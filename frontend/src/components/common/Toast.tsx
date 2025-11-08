/**
 * Toast notification component
 */

import type { ToastMessage } from '@/types';

interface ToastProps {
  message: ToastMessage;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  const typeStyles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-yellow-600 text-white'
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div
        className={`${typeStyles[message.type]} px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}
      >
        <span className="flex-1">{message.message}</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Toast;
