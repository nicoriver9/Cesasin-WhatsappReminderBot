import React, { useState, useEffect } from 'react';
import { FaCommentDots } from 'react-icons/fa';
import MessageModal from './utils/MessageModal';
import ConfirmationModal from './utils/ConfirmationModal';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { useConversationModeStore } from '../../store/ConversationalMode';

interface User {
  id: number;
  username: string;
  // Añade más campos según la estructura de tu payload
}

// Update the component props to include the refresh function
const PatientResponsesTable: React.FC<{ responses: any[], refreshResponses: () => void }> = ({ responses, refreshResponses }) => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPhoneNumber, setIsPhoneNumber] = useState<string>('');
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const { isConversationalMode } = useConversationModeStore();

  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const phoneNumber = localStorage.getItem('phoneNumber');
    if (phoneNumber) setIsPhoneNumber(phoneNumber);

    if (token) {
      try {
        const decodedUser = jwtDecode(token) as User;
        setUser(decodedUser);
      } catch (error) {
        console.error('Error decoding token:', error);
        navigate('/login');
      }
    }
  }, []);

  const handleSendClick = (message: any) => {
    setSelectedMessage(message);
    setIsMessageModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsMessageModalOpen(false);
    setSelectedMessage(null);
  };

  const handleSendMessage = (message: string) => {
    if (selectedMessage) {
      setSelectedMessage({ ...selectedMessage, message });
    }
    setIsMessageModalOpen(false); // Cerrar el modal de mensaje
    setIsConfirmationModalOpen(true); // Abrir el modal de confirmación
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
          patientId: selectedMessage.patient_id, // Asegúrate de que este campo exista en tu objeto message
          message: selectedMessage.message,
          patientPhone: selectedMessage.patient_phone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      console.log('Message sent successfully');
      setIsConfirmationModalOpen(false);
      // Call the refresh function after successful send
      refreshResponses();
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha de Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {responses.length > 0 ? (
              responses.map((message, index) => (
                <tr key={`${message.whatsapp_msg_id}-${index}`} className="hover:bg-gray-100 transition-colors duration-150">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                    {isPhoneNumber.length > 0 && !isConversationalMode && (
                      <button
                        onClick={() => handleSendClick(message)}
                        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                      >
                        <FaCommentDots />
                      </button>
                    )}
                  </td>                
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{message.patient_full_name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{message.patient_phone}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleShowAlert(message.response)} // Cambiado aquí
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    >
                      Ver mensaje completo
                    </button>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(message.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No hay turnos solicitados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={handleCloseModal}
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

export default PatientResponsesTable;
