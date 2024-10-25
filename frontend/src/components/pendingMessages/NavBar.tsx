import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi"; // Icono para el botón de logout
import { jwtDecode } from "jwt-decode"; // Asegúrate de instalar esta dependencia
import { Switch } from "@headlessui/react"; // Asegúrate de instalar @headlessui/react
import { useConversationModeStore } from "../store/ConversationalMode";

const Navbar: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { isConversationalMode, setIsConversationalMode } =
    useConversationModeStore();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUserName(decoded.username || "Usuario"); // Asume que el nombre está en el campo 'name' del payload
      } catch (error) {
        console.error("Error decoding token:", error);
        setUserName("Usuario");
      }
    }

    const fetchWhatsAppModeStatus = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/whatsapp-mode/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { isActive } = response.data; // Extrae isActive de la respuesta
        setIsConversationalMode(isActive); // Modifica el estado según isActive
      } catch (error) {
        console.error("Error fetching WhatsApp mode status:", error);
      }
    };

    const fetchPhoneNumber = async () => {
      
      try {
        const response = await axios.get(
          `${apiUrl}/api/whatsapp/phone-number`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const { phoneNumber } = response.data;
        setPhoneNumber(phoneNumber ? phoneNumber : false);
        localStorage.setItem("phoneNumber", phoneNumber);        
      } catch (err) {
        console.error("Error fetching phone number:", err);
        setPhoneNumber("No autenticado");
        navigate('/');
      }
    };

    // Llama a la nueva función para obtener el estado del modo
    fetchWhatsAppModeStatus();
    fetchPhoneNumber();

    const intervalWhatsAppMode = setInterval(fetchWhatsAppModeStatus, 5000); // Ejecuta cada 5 segundos
    const intervalPhoneNumber = setInterval(fetchPhoneNumber, 12000); // Ejecuta cada 12 segundos

    return () => {
      clearInterval(intervalWhatsAppMode); // Limpia el intervalo de WhatsApp mode
      clearInterval(intervalPhoneNumber); // Limpia el intervalo de phone number
    }; 
  }, []);

  const handleToggleConversationalMode = async () => {
    const newMode = !isConversationalMode;
    setIsConversationalMode(newMode);
    try {
      const token = localStorage.getItem("access_token");
      const url = newMode
        ? `${apiUrl}/api/whatsapp-mode/start-conversation`
        : `${apiUrl}/api/whatsapp-mode/start-reminder`;
      await axios.post(
        url,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error("Error toggling conversation mode:", error);
      setIsConversationalMode(!newMode); // Revert state if request fails
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  return (
    <nav className="bg-gradient-to-r from-blue-500 to-purple-600 py-4 px-15 flex justify-between items-center shadow-md">
      <div className="text-white text-lg font-semibold ml-2">
        {phoneNumber ? (
          <span>
            {" "}
            {userName} - 📱 {phoneNumber}
          </span>
        ) : (
          <span>⌛ Esperando el escaneo del código QR...</span>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {phoneNumber && (
          <>
            <Switch
              checked={isConversationalMode}
              onChange={handleToggleConversationalMode}
              className={`${isConversationalMode ? "bg-green-600" : "bg-gray-200"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
            >
              <span className="sr-only">Enable conversational mode</span>
              <span
                className={`${isConversationalMode ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-white text-sm">
              Modo conversacional {isConversationalMode ? "ON" : "OFF"}
            </span>
          </>
        )}
        <button
          className="flex items-center font-semibold text-white mx-3  px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition duration-200 ease-in-out focus:outline-none"
          onClick={handleLogout}
        >
          <FiLogOut className="mr-2" /> Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
