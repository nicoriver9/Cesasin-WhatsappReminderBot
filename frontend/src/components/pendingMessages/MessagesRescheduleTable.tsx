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
  const apiUrl = import.meta.env.VITE_API_URL;

  const { isConversationalMode } = useConversationModeStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const phoneNumber = localStorage.getItem('phoneNumber');
    if(phoneNumber) setIsPhoneNumber(phoneNumber);
    
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

  return (
    <>      
      <div className="overflow-x-auto bg-gradient-to-r from-blue-400 to-indigo-600 p-4 rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-lg">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Action</th>
              {/* <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th> */}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Patient Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Message</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Appointment Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Doctor Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Creation Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {messages.map((message) => (
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
                {/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{message.whatsapp_msg_id}</td> */}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{message.patient_full_name}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{message.patient_phone}</td>
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">{message.message}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(message.appointment_date).toLocaleString()}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{message.doctor_name}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(message.creation_date).toLocaleString()}</td>
              </tr>
            ))}
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
    </>
  );
};

export default MessagesRescheduleTable;
