// AppointmentConfirmedTable.tsx
import React from "react";

interface Appointment {
  confirmed_appointment_id: number;
  patient_full_name: string;
  appointment_date: string;
}

interface AppointmentConfirmedTableProps {
  appointments: Appointment[];
  refreshAppointments: () => void;
}

const AppointmentConfirmedTable: React.FC<AppointmentConfirmedTableProps> = ({ appointments, refreshAppointments }) => {
  return (
    <div className="overflow-x-auto bg-gradient-to-r from-blue-400 to-indigo-600 p-4 rounded-lg shadow-md overflow-y-auto max-h-96">
      <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-lg">
        <thead className="bg-blue-500 text-white">
          <tr>
            <th className="py-2">Nombre del Paciente</th>
            <th className="py-2">Fecha de Turno</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.confirmed_appointment_id}>
              <td className="py-2 text-center">{appointment.patient_full_name}</td>
              <td className="py-2 text-center">{new Date(appointment.appointment_date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>      
    </div>
  );
};

export default AppointmentConfirmedTable;
