import React, { useState } from 'react';
import { Modal } from '../Modal';
import { TransferRequest } from '../../types';

interface TransferApprovalModalProps {
  transferApprovalModal: {
    mode: 'accept' | 'hold' | 'decline';
    request: TransferRequest;
  };
  onAcceptTransfer?: (request: TransferRequest, remarks: string) => Promise<boolean | void> | boolean | void;
  onHoldTransfer?: (request: TransferRequest, remarks: string) => Promise<boolean | void> | boolean | void;
  onDeclineTransfer?: (request: TransferRequest, remarks: string) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
  isProcessing?: boolean;
}

export const TransferApprovalModal: React.FC<TransferApprovalModalProps> = ({
  transferApprovalModal,
  onAcceptTransfer,
  onHoldTransfer,
  onDeclineTransfer,
  onClose,
  isProcessing,
  wrapAction
}) => {
  const [transferApprovalRemarks, setTransferApprovalRemarks] = useState('');

  return (
    <Modal
      title={`${transferApprovalModal.mode === 'accept' ? 'Authorize' : transferApprovalModal.mode === 'hold' ? 'Hold' : 'Decline'} Transfer Request`}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Request Summary</p>
          <p className="text-sm font-bold text-neutral-900 leading-tight">
            Transfer to {transferApprovalModal.request.toBranch} requested by {transferApprovalModal.request.requestedBy}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1 flex items-center justify-between">
            <span>Administrative Remarks</span>
            <span className="text-red-500 text-[8px] font-black">Required for Audit</span>
          </label>
          <textarea
            value={transferApprovalRemarks}
            onChange={(e) => setTransferApprovalRemarks(e.target.value)}
            className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all min-h-[100px] resize-none"
            placeholder={`Required: Reason for ${transferApprovalModal.mode === 'accept' ? 'authorizing' : transferApprovalModal.mode === 'hold' ? 'holding' : 'declining'} this transfer...`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded-md font-bold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (transferApprovalRemarks.trim()) {
                const mode = transferApprovalModal.mode;
                const request = transferApprovalModal.request;
                const remarks = transferApprovalRemarks;
                
                const action = mode === 'accept' ? onAcceptTransfer : mode === 'hold' ? onHoldTransfer : onDeclineTransfer;
                const label = mode === 'accept' ? 'Accepting Transfer...' : mode === 'hold' ? 'Holding Transfer...' : 'Declining Transfer...';
                
                const success = await wrapAction(async () => { await action?.(request, remarks); }, label);
                if (success) {
                  onClose();
                }
              }
            }}
            disabled={!transferApprovalRemarks.trim() || isProcessing}
            className={`px-8 py-2.5 rounded-md font-bold transition-all shadow-lg text-sm ${
              transferApprovalRemarks.trim()
                ? (transferApprovalModal.mode === 'decline' ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-100' : 'bg-neutral-900 text-white hover:bg-black shadow-neutral-200')
                : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none'
            }`}
          >
            Confirm {transferApprovalModal.mode.charAt(0).toUpperCase() + transferApprovalModal.mode.slice(1)}
          </button>
        </div>
      </div>
    </Modal>
  );
};
