// ConfirmationModal.tsx
import React from 'react';
import Modal from 'react-modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onRequestClose, onConfirm, isLoading }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Confirm Send Message"
      className="modal"
      overlayClassName="overlay"
    >
      <h2 className="text-lg font-semibold mb-4">Confirm Send Message</h2>
      <p className="mb-4">Are you sure you want to send this message?</p>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Sending...' : 'Confirm'}
        </button>
        <button type="button" className="bg-gray-300 text-gray-800 px-4 py-2 rounded" onClick={onRequestClose}>Cancel</button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
