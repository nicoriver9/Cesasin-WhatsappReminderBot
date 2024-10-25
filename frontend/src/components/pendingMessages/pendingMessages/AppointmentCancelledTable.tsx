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
    <div className="overflow-x-auto bg-gradient-to-r from-blue-400 to-indigo-600 p-4 rounded-lg shadow-md overflow-y-auto max-h-96">
      <div className="overflow-x-auto bg-gradient-to-r from-blue-400 to-indigo-600 p-4 rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-lg">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="py-2">Nombre del Paciente</th>
              <th className="py-2">Fecha de Cancelación</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.cancelled_appointment_id}>
                <td className="py-2 text-center">{appointment.patient_full_name}</td>
                <td className="py-2 text-center">{new Date(appointment.cancellation_date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
};

export default AppointmentCancelledTable;
