/**
 * UI state types (frontend-specific, no backend correspondence)
 */

/**
 * Toast message configuration
 */
export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;  // Default 3000ms
}

export interface ToastMessage extends ToastConfig {
  id: string;  // Unique identifier (for multiple toasts)
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  title: string;
  content: string;
  confirmText?: string;  // Default "确定"
  cancelText?: string;   // Default "取消"
  onConfirm?: () => void;
  onCancel?: () => void;
  closable?: boolean;    // Whether can be closed by clicking mask, default true
}
