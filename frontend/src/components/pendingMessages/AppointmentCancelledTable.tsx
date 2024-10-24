// AppointmentCancelledTable.tsx
import React from "react";

interface CancelledAppointment {
  cancelled_appointment_id: number;
  patient_full_name: string;
  cancellation_date: string;
}

interface AppointmentCancelledTableProps {
  appointments: CancelledAppointment[];
  refreshAppointments: () => void;
}

const AppointmentCancelledTable: React.FC<AppointmentCancelledTableProps> = ({ appointments, refreshAppointments }) => {
  return (
    <div>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2">Nombre del Paciente</th>
            <th className="py-2">Fecha de Cancelación</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.cancelled_appointment_id}>
              <td className="py-2">{appointment.patient_full_name}</td>
              <td className="py-2">{appointment.cancellation_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={refreshAppointments}>Actualizar</button>
    </div>
  );
};

export default AppointmentCancelledTable;

