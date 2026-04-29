import { useCallback, useEffect, useRef, useState } from 'react';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'emerald';
}

interface ActionResultState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  items?: { title: string; code: string }[];
}

interface UseActionProcessingParams {
  itemTitle: string;
  itemCode: string;
}

export const useActionProcessing = ({ itemTitle, itemCode }: UseActionProcessingParams) => {
  const isMounted = useRef(true);
  const activeActionIdRef = useRef(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('');
  const [processProgress, setProcessProgress] = useState(0);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info'
  });
  const [actionResultModal, setActionResultModal] = useState<ActionResultState | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setProcessProgress(0);
      interval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 10) + 5;
        });
      }, 200);
    } else {
      setProcessProgress(100);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const showActionResult = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setActionResultModal({
      isOpen: true,
      title,
      message,
      type,
      items: [{ title: itemTitle, code: itemCode }]
    });
  }, [itemCode, itemTitle]);

  const wrapAction = useCallback(async (
    action: () => Promise<boolean | void> | boolean | void,
    message = 'Processing...',
    _targetStatus?: unknown
  ) => {
    if (!isMounted.current) return;
    const actionId = ++activeActionIdRef.current;
    setIsProcessing(true);
    setProcessMessage(message);

    const timeoutId = setTimeout(() => {
      if (isMounted.current && activeActionIdRef.current === actionId) {
        setIsProcessing(false);
        setProcessProgress(0);
        showActionResult('Action Timed Out', 'Action timed out. Please check your connection or try again.', 'warning');
      }
    }, 15000);

    try {
      const result = await action();
      if (result === false) {
        return false;
      }

      if (isMounted.current && activeActionIdRef.current === actionId) {
        setProcessProgress(100);
      }
      return true;
    } catch (e) {
      console.error('Action failed', e);
      if (isMounted.current && activeActionIdRef.current === actionId) {
        showActionResult('Action Failed', 'An error occurred. Please try again.', 'warning');
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
      if (isMounted.current && activeActionIdRef.current === actionId) {
        setIsProcessing(false);
        setProcessProgress(0);
      }
    }
  }, [showActionResult]);

  return {
    isProcessing,
    processMessage,
    processProgress,
    confirmModal,
    setConfirmModal,
    actionResultModal,
    setActionResultModal,
    wrapAction,
    showActionResult
  };
};
