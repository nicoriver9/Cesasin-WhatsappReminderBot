// Dashboard.tsx
import React, { useState, useEffect } from "react";
import { FaCalendarAlt } from 'react-icons/fa';
// import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from "axios";
import MessagesRescheduleTable from "./AppointmentReschedulesTable";
import PatientResponsesTable from "./AppointmentRequestedTable";
import Dropdown from "./utils/Dropdown";
import { FaChevronLeft } from "react-icons/fa";
import Navbar from "../NavBar";
import AppointmentCancelledTable from "./AppointmentCancelledTable";
import AppointmentConfirmedTable from "./AppointmentConfirmedTable";
import "./dashboard.css";

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
    setLoadingConfirmed(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/whatsapp/confirmed-appointments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setConfirmedAppointments(response.data);
    } catch (error) {
      console.error("Error fetching confirmed appointments:", error);
    } finally {
      setLoadingConfirmed(false);
    }
  };

  const fetchCancelledAppointments = async () => {
    setLoadingCancelled(true);
    try {
      const response = await axios.get(
        `${apiUrl}/api/whatsapp/cancelled-appointments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCancelledAppointments(response.data);
    } catch (error) {
      console.error("Error fetching cancelled appointments:", error);
    } finally {
      setLoadingCancelled(false);
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

  const renderDropdown = (
    key: string,
    label: string,
    isOpen: boolean,
    onToggle: () => void,
    content: React.ReactNode
  ) => (
    <Dropdown
      key={key}
      title={label} // Solo el texto (string)
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {content}
    </Dropdown>
  );

  return (
    <div id="dashboard-root">
      <Navbar />
      <div className="mt-20">
        <a
          href="/whatsapp-status"
          className="fixed top-24 left-10 bg-white text-blue-500 rounded-full p-2 shadow-lg hover:bg-gray-100 z-10 hover:scale-110 hover:duration-300"
          title="Volver"
        >
          <FaChevronLeft size={24} />
        </a>
      </div>

      <div className="container mx-auto p-4">
        <h2 className="title-animated text-2xl font-bold text-white mb-4 flex items-center gap-2 relative pb-2">
          Tablero de turnos
          <FaCalendarAlt className="text-white text-xl ml-2" />
        </h2>

        <div className="space-y-4">
          {/* Reprogramados */}
          {renderDropdown(
            "messages",
            "Reprogramados",
            openDropdown === "messages",
            () => handleDropdownToggle("messages"),
            loadingMessages ? (
              <p>Cargando turnos reprogramados...</p>
            ) : (
              <MessagesRescheduleTable messages={messages} refreshMessages={fetchMessages} />
            )
          )}

          {/* Solicitados */}
          {renderDropdown(
            "responses",
            "Solicitados",
            openDropdown === "responses",
            () => handleDropdownToggle("responses"),
            loadingResponses ? (
              <p>Cargando turnos solicitados...</p>
            ) : (
              <PatientResponsesTable responses={responses} refreshResponses={fetchResponses} />
            )
          )}

          {/* Confirmados */}
          {renderDropdown(
            "confirmed",
            "Confirmados",
            openDropdown === "confirmed",
            () => handleDropdownToggle("confirmed"),
            loadingConfirmed ? (
              <p>Cargando turnos confirmados...</p>
            ) : (
              <AppointmentConfirmedTable appointments={confirmedAppointments} refreshAppointments={fetchConfirmedAppointments} />
            )
          )}

          {/* Cancelados */}
          {renderDropdown(
            "cancelled",
            "Cancelados",
            openDropdown === "cancelled",
            () => handleDropdownToggle("cancelled"),
            loadingCancelled ? (
              <p>Cargando turnos cancelados...</p>
            ) : (
              <AppointmentCancelledTable appointments={cancelledAppointments} refreshAppointments={fetchCancelledAppointments} />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;