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
    <div>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2">Nombre del Paciente</th>
            <th className="py-2">Fecha de Turno</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.confirmed_appointment_id}>
              <td className="py-2">{appointment.patient_full_name}</td>
              <td className="py-2">{appointment.appointment_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={refreshAppointments}>Actualizar</button>
    </div>
  );
};

export default AppointmentConfirmedTable;

