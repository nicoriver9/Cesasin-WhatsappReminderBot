// MessageModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';


interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  selectedMessage: {
    patient_full_name: string;
    patient_phone: string;
  } | null;
}



const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, onSend, selectedMessage }) => {
  const [message, setMessage] = useState('');


  useEffect(() => {
    if (isOpen) {
      setMessage(''); // Reset message when modal opens
    }
  }, [isOpen]);

  const handleSend = () => {
    onSend(message);
    setMessage('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Send Message"
      className="fixed inset-0 flex items-center justify-center z-50"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50"
    >
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Enviar mensaje</h2>
        {selectedMessage && (
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del paciente</label>
                <input
                  type="text"
                  value={selectedMessage.patient_full_name}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de teléfono</label>
                <input
                  type="number"
                  value={parseFloat(selectedMessage.patient_phone)}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={8}
                placeholder="Type your message here..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Enviar mensaje
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default MessageModal;
