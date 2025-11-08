/**
 * Modal component
 */

import { useEffect } from 'react';
import Button from './Button';

interface ModalProps {
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  closable?: boolean;
}

export function Modal({
  title,
  content,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  closable = true
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleMaskClick = () => {
    if (closable && onCancel) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleMaskClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="text-gray-700 mb-6 whitespace-pre-wrap">{content}</div>
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          {onConfirm && (
            <Button variant="primary" onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
