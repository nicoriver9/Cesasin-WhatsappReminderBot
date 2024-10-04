// MessagesRescheduleTable.tsx
import React, { useEffect, useState } from 'react';
import { FaCommentDots } from 'react-icons/fa';
import MessageModal from './utils/MessageModal';
import ConfirmationModal from './utils/ConfirmationModal';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { useConversationModeStore } from '../../store/ConversationalMode';

interface Message {
  whatsapp_msg_id: number;
  patient_full_name: string;
  patient_phone: string;
  message: string;
  appointment_date: string;
  doctor_name: string;
  creation_date: string;
}

interface DecodedUser {
  id: number;
  username: string;
  // Add other user properties as needed
}

const MessagesRescheduleTable: React.FC<{ messages: any[], refreshMessages: () => void }> = ({ messages, refreshMessages }) => {
  const navigate = useNavigate();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [currentUser, setCurrentUser] = useState<DecodedUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPhoneNumber, setIsPhoneNumber] = useState<string>('');

  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>('');


  const apiUrl = import.meta.env.VITE_API_URL;

  const { isConversationalMode } = useConversationModeStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const phoneNumber = localStorage.getItem('phoneNumber');
    if (phoneNumber) setIsPhoneNumber(phoneNumber);

    if (token) {
      try {
        const decodedUser = jwtDecode(token) as DecodedUser;
        setCurrentUser(decodedUser);
      } catch (error) {
        console.error('Error decoding token:', error);
        navigate('/login');
      }
    }
  }, []);

  const handleOpenMessageModal = (message: Message) => {
    setSelectedMessage(message);
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = (message: string) => {
    if (selectedMessage) {
      setSelectedMessage({ ...selectedMessage, message });
    }
    setIsConfirmationModalOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!selectedMessage) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No token found');

      const response = await fetch(`${apiUrl}/api/whatsapp/send-rescheduled-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selectedMessage.whatsapp_msg_id, // Assuming this is the correct ID to use
          message: selectedMessage.message,
          patientPhone: selectedMessage.patient_phone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      console.log('Message sent successfully');
      setIsConfirmationModalOpen(false);
      setIsMessageModalOpen(false);
      refreshMessages(); // Call the refreshMessages function after successful send
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowAlert = (message: string) => {
    setAlertMessage(message);
    setIsAlertVisible(true);
  };

  const handleCloseAlert = () => {
    setIsAlertVisible(false);
  };

  return (
    <>
      <div className="overflow-x-auto bg-gradient-to-r from-blue-400 to-indigo-600 p-4 rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-lg">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Acción</th>              
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre del Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Mensaje</th>              
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre del Profesional</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha de Pedido</th>

            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {messages.length > 0 ? (
              messages.map((message) => (
                <tr key={message.whatsapp_msg_id} className="hover:bg-gray-100 transition-colors duration-150">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                    {isPhoneNumber.length > 0 && !isConversationalMode && (
                      <button
                        onClick={() => handleOpenMessageModal(message)}
                        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                      >
                        <FaCommentDots />
                      </button>
                    )}
                  </td>                
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{message.patient_full_name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{message.patient_phone}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                    {/* {message.message} */}
                  <button
                      onClick={() => handleShowAlert(message.message)} // Cambiado aquí
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    >
                      Ver mensaje completo
                    </button>
                  </td>                
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{message.doctor_name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(message.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No hay turnos reprogramados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        onSend={handleSendMessage}
        selectedMessage={selectedMessage}
      />

      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onRequestClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={handleConfirmSend}
        isLoading={isLoading}
      />

      {error && <div className="mt-4 text-red-500">{error}</div>}

      {isAlertVisible && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 mt-4 p-4 bg-blue-100 text-blue-700 rounded shadow-lg z-50 flex justify-between items-center">
          <span>{alertMessage}</span>
          <button onClick={handleCloseAlert} className="ml-4 text-blue-700 hover:text-blue-900">
            &times; {/* Cruz para cerrar */}
          </button>
        </div>
      )}
    </>
  );
};

export default MessagesRescheduleTable;
