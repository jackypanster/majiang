/**
 * Modal component
 */

import { useEffect, useState, ReactNode } from 'react';
import Button from './Button';

interface ModalProps {
  title: string;
  content: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  closable?: boolean;
  /**
   * T080: 自动延迟秒数（血战继续提示）
   * 如果设置，确认按钮会禁用并显示倒计时，倒计时结束后才能点击
   */
  autoDelaySeconds?: number;
}

export function Modal({
  title,
  content,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  closable = true,
  autoDelaySeconds
}: ModalProps) {
  // T080: 自动延迟倒计时状态
  const [countdown, setCountdown] = useState(autoDelaySeconds || 0);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // T080: 自动延迟倒计时逻辑
  useEffect(() => {
    if (!autoDelaySeconds || autoDelaySeconds <= 0) return;

    setCountdown(autoDelaySeconds);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoDelaySeconds]);

  const handleMaskClick = () => {
    if (closable && onCancel) {
      onCancel();
    }
  };

  // T080: 确认按钮是否禁用（倒计时中）
  const isConfirmDisabled = countdown > 0;

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
        <div className="text-gray-700 mb-6 whitespace-pre-wrap">
          {typeof content === 'string' ? content : content}
        </div>
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          {onConfirm && (
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isConfirmDisabled}
            >
              {/* T080: 倒计时显示 */}
              {isConfirmDisabled ? `${confirmText} (${countdown}s)` : confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
