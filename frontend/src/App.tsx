/**
 * Main Application Component
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Toast } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/stores';
import './App.css';

// Lazy load GameBoard to improve initial load time
const GameBoard = React.lazy(() => import('@/components/game/GameBoard'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
    },
  },
});

function App() {
  const toast = useUIStore((s) => s.toast);
  const hideToast = useUIStore((s) => s.hideToast);
  const modal = useUIStore((s) => s.modal);
  const hideModal = useUIStore((s) => s.hideModal);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-100">
          {/* Game Board */}
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl text-gray-600">加载中...</div>
              </div>
            }
          >
            <GameBoard />
          </React.Suspense>

          {/* Toast Notifications */}
          {toast && <Toast message={toast} onClose={hideToast} />}

          {/* Modal Dialogs */}
          {modal && (
            <Modal
              title={modal.title}
              content={modal.content}
              confirmText={modal.confirmText}
              cancelText={modal.cancelText}
              onConfirm={modal.onConfirm}
              onCancel={modal.onCancel || hideModal}
              closable={modal.closable}
            />
          )}
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
