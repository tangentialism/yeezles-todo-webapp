import React from 'react';
import PasskeyEnrollment from './PasskeyEnrollment';
import Dialog from './ui/Dialog';

interface PasskeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Gives PasskeyEnrollment a mount point from the account menu, in the
 * shared Dialog shell (Escape, scrim click and the close button all close it).
 */
const PasskeyManagementModal: React.FC<PasskeyManagementModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Dialog title="Passkeys" onClose={onClose}>
      <PasskeyEnrollment />
    </Dialog>
  );
};

export default PasskeyManagementModal;
