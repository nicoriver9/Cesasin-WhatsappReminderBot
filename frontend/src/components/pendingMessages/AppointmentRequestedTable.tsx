import React, { useState, useEffect } from 'react';
import { FaCommentDots, FaSearch, FaTimes } from 'react-icons/fa';
import MessageModal from './utils/MessageModal';
import ConfirmationModal from './utils/ConfirmationModal';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { useConversationModeStore } from '../../store/ConversationalMode';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface User {
  id: number;
  username: string;
}

interface Response {
  response_id: number;
  patient_full_name: string;
  patient_phone: string;
  response: string;
  created_at: string;
  [key: string]: any;
}

const PatientResponsesTable: React.FC<{ responses: any[], refreshResponses: () => void }> = ({ responses, refreshResponses }) => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPhoneNumber, setIsPhoneNumber] = useState<string>('');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'patient_full_name' | 'patient_phone' | 'date'>('patient_full_name');
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);

  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const { isConversationalMode } = useConversationModeStore();

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

  // Filtrado y ordenación
  useEffect(() => {
    let results = [...responses];
    
    // Aplicar filtro
    if (searchTerm) {
      results = results.filter(response => {
        let fieldValue: string;
        
        if (searchField === 'date') {
          fieldValue = new Date(response.created_at).toLocaleDateString('es-AR');
        } else {
          fieldValue = String(response[searchField]).toLowerCase();
        }
        
        return fieldValue.includes(searchTerm.toLowerCase());
      });
    }
    
    // Ordenar por fecha descendente
    results.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
    
    setFilteredResponses(results);
  }, [responses, searchTerm, searchField]);

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
    setIsMessageModalOpen(false);
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
          patientId: selectedMessage.patient_id,
          message: selectedMessage.message,
          patientPhone: selectedMessage.patient_phone
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      setIsConfirmationModalOpen(false);
      refreshResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowAlert = (message: string) => {
    Swal.fire({
      title: '📩 Respuesta del paciente',
      html: `<div style="max-height: 300px; overflow-y: auto; text-align: left;">${message}</div>`,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'rounded-xl shadow-md',
        confirmButton: 'text-sm px-4 py-2'
      },
      width: '40em',
      padding: '1.5em'
    });
  };

  return (
    <>
      <div className="overflow-x-auto bg-gradient-to-r from-blue-400 to-indigo-600 p-4 rounded-lg shadow-md overflow-y-auto max-h-[80vh]">
        {/* Filtros de búsqueda */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por:
              </label>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="patient_full_name">Nombre del Paciente</option>
                <option value="patient_phone">Teléfono</option>
                <option value="date">Fecha</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {searchField === "date" ? "Seleccionar fecha" : "Término de búsqueda"}
              </label>
              <div className="relative">
                {searchField === "date" ? (
                  <input
                    type="date"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Buscar por ${searchField.replace("_", " ")}`}
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setSearchTerm("");
                setSearchField("patient_full_name");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-2"
            >
              <FaTimes /> Limpiar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-lg">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Acción</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre del Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Mensaje</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredResponses.length > 0 ? (
              filteredResponses.map((message) => (
                <tr key={message.response_id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                    {isPhoneNumber.length > 0 && !isConversationalMode && (
                      <button
                        onClick={() => handleSendClick(message)}
                        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                        title="Enviar mensaje"
                      >
                        <FaCommentDots />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {message.patient_full_name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {message.patient_phone}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleShowAlert(message.response)}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Ver completo
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(message.created_at).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {searchTerm ? "No se encontraron resultados" : "No hay turnos solicitados"}
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

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </>
  );
};

export default PatientResponsesTable;