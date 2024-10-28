// Dashboard.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import MessagesRescheduleTable from "./AppointmentReschedulesTable";
import PatientResponsesTable from "./AppointmentRequestedTable";
import Dropdown from "./utils/Dropdown";
import { FaChevronLeft } from "react-icons/fa"; // Font Awesome icon for navigation
import Navbar from "../NavBar";
import AppointmentCancelledTable from "./AppointmentCancelledTable";
import AppointmentConfirmedTable from "./AppointmentConfirmedTable";

interface Message {
  whatsapp_msg_id: number;
  patient_full_name: string;
  patient_phone: string;
  message: string;
  appointment_date: string;
  doctor_name: string;
  creation_date: string;
}

interface Response {
  response_id: number;
  patient_full_name: string;
  patient_phone: string;
  response: string;
  received_at: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [confirmedAppointments, setConfirmedAppointments] = useState<any[]>([]);
  const [loadingConfirmed, setLoadingConfirmed] = useState(true);
  const [cancelledAppointments, setCancelledAppointments] = useState<any[]>([]);
  const [loadingCancelled, setLoadingCancelled] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("access_token");

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/whatsapp/messages-reschedule`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/whatsapp/patient-responses`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setResponses(response.data);
    } catch (error) {
      console.error("Error fetching responses:", error);
    } finally {
      setLoadingResponses(false);
    }
  };

  const fetchConfirmedAppointments = async () => {
    setLoadingConfirmed(true); // Iniciar carga
    try {
      const response = await axios.get(
        `${apiUrl}/api/whatsapp/confirmed-appointments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setConfirmedAppointments(response.data); // Guardar datos
    } catch (error) {
      console.error("Error fetching confirmed appointments:", error);
    } finally {
      setLoadingConfirmed(false); // Finalizar carga
    }
  };

  const fetchCancelledAppointments = async () => {
    setLoadingCancelled(true); // Iniciar carga
    try {
      const response = await axios.get(
        `${apiUrl}/api/whatsapp/cancelled-appointments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCancelledAppointments(response.data); // Guardar datos
    } catch (error) {
      console.error("Error fetching cancelled appointments:", error);
    } finally {
      setLoadingCancelled(false); // Finalizar carga
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchResponses();
    fetchConfirmedAppointments();
    fetchCancelledAppointments();
  }, [apiUrl]);

  const handleDropdownToggle = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  return (
    <div className="relative bg-gradient-to-r from-blue-400 to-indigo-600 min-h-screen p-4">
      <Navbar />
      {/* Navigation Button */}
      <div className="mt-24">
        {" "}
        {/* Increased margin-top to create more space below Navbar */}
        <a
          href="/whatsapp-status"
          className="fixed top-24 left-4 bg-white text-blue-500 rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
        >
          <FaChevronLeft size={24} />
        </a>
      </div>

      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold text-white mb-4">
          Tablero de turnos
        </h2>
        <div className="space-y-4">
          {/* Messages Reschedule Section */}
          <Dropdown
            title="Reprogramados"
            isOpen={openDropdown === "messages"}
            onToggle={() => handleDropdownToggle("messages")}
          >
            {loadingMessages ? (
              <p>Cargando turnos reprogramados...</p>
            ) : (
              <MessagesRescheduleTable
                messages={messages}
                refreshMessages={fetchMessages}
              />
            )}
          </Dropdown>

          {/* Patient Responses Section */}
          <Dropdown
            title="Solicitados"
            isOpen={openDropdown === "responses"}
            onToggle={() => handleDropdownToggle("responses")}
          >
            {loadingResponses ? (
              <p>Cargando turnos solicitados...</p>
            ) : (
              <PatientResponsesTable
                responses={responses}
                refreshResponses={fetchResponses}
              />
            )}
          </Dropdown>

          {/* Confirmed Appointments Section */}
          <Dropdown
            title="Confirmados"
            isOpen={openDropdown === "confirmed"}
            onToggle={() => handleDropdownToggle("confirmed")}
          >
            {loadingConfirmed ? (
              <p>Cargando turnos confirmadas...</p>
            ) : (
              <AppointmentConfirmedTable
                appointments={confirmedAppointments}
                refreshAppointments={fetchConfirmedAppointments}
              />
            )}
          </Dropdown>

          {/* Cancelled Appointments Section */}
          <Dropdown
            title="Cancelados"
            isOpen={openDropdown === "cancelled"}
            onToggle={() => handleDropdownToggle("cancelled")}
          >
            {loadingCancelled ? (
              <p>Cargando turnos canceladas...</p>
            ) : (
              <AppointmentCancelledTable
                appointments={cancelledAppointments}
                refreshAppointments={fetchCancelledAppointments}
              />
            )}
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
