import React from 'react';
import PasskeyEnrollment from './PasskeyEnrollment';

interface PasskeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Thin modal wrapper that gives PasskeyEnrollment a mount point from the
 * signed-in header. Follows the same modal chrome as AreaManagementModal
 * (backdrop, header with X close button, body) -- no escape-key or
 * backdrop-click handling, matching that existing convention.
 */
const PasskeyManagementModal: React.FC<PasskeyManagementModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Manage Passkeys</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <PasskeyEnrollment />
        </div>
      </div>
    </div>
  );
};

export default PasskeyManagementModal;
