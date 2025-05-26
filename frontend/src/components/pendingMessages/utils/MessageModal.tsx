import React, { useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  selectedMessage: {
    patient_full_name: string;
    patient_phone: string;
    message: string;
  } | null;
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, onSend, selectedMessage }) => {
  const [message, setMessage] = useState(selectedMessage?.message || '');

  if (!isOpen || !selectedMessage) return null;

  const handleSendClick = () => {
    Swal.fire({
      title: '¿Enviar mensaje?',
      text: "¿Estás seguro de enviar este mensaje al paciente?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
    }).then((result) => {
      if (result.isConfirmed) {
        onSend(message);
        onClose(); // Cierra el modal después del envío

        Swal.fire({
          title: '✅ Mensaje enviado',
          text: 'El mensaje fue enviado correctamente.',
          icon: 'success',
          confirmButtonColor: '#3b82f6'
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
      <div className="bg-gray-100 p-6 rounded-xl shadow-xl w-full max-w-xl" data-aos="zoom-in">
        <h2 className="text-2xl font-semibold mb-6 text-blue-600">Enviar mensaje</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del paciente</label>
            <input
              type="text"
              value={selectedMessage.patient_full_name}
              readOnly
              className="mt-1 block w-full rounded-md border border-blue-500 bg-gray-100 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Número de teléfono</label>
            <input
              type="text"
              value={selectedMessage.patient_phone.replace('@c.us', '')}
              readOnly
              className="mt-1 block w-full rounded-md border border-blue-500 bg-gray-100 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribí el mensaje aquí..."
            className="w-full h-32 p-3 rounded-md border border-blue-500 bg-gray-100 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-5600"
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={handleSendClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
          >
            Enviar mensaje
          </button>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2 rounded-lg border transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
