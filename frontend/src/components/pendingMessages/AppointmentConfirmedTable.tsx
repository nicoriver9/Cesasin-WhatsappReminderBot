import React, { useState, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

interface Appointment {
  confirmed_appointment_id: number;
  patient_full_name: string;
  appointment_date: string;
  [key: string]: any;
}

interface AppointmentConfirmedTableProps {
  appointments: Appointment[];
  refreshAppointments: () => void;
}

const AppointmentConfirmedTable: React.FC<AppointmentConfirmedTableProps> = ({ 
  appointments, 
  // refreshAppointments 
}) => {
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'patient_full_name' | 'date'>('patient_full_name');
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);

  // Filtrado y ordenación
  useEffect(() => {
    let results = [...appointments];
    
    // Aplicar filtro
    if (searchTerm) {
      results = results.filter(appointment => {
        let fieldValue: string;
        
        if (searchField === 'date') {
          fieldValue = new Date(appointment.appointment_date).toLocaleDateString('es-AR');
        } else {
          fieldValue = String(appointment[searchField]).toLowerCase();
        }
        
        return fieldValue.includes(searchTerm.toLowerCase());
      });
    }
    
    // Ordenar por fecha descendente
    results.sort((a, b) => {
      const dateA = new Date(a.appointment_date).getTime();
      const dateB = new Date(b.appointment_date).getTime();
      return dateB - dateA;
    });
    
    setFilteredAppointments(results);
  }, [appointments, searchTerm, searchField]);

  return (
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
              <option value="date">Fecha de Turno</option>
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
                    placeholder="Buscar pacientes"
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
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Nombre del Paciente
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Fecha de Turno
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => (
              <tr key={appointment.confirmed_appointment_id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {appointment.patient_full_name}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(appointment.appointment_date).toLocaleString('es-AR', {
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
              <td colSpan={2} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                {searchTerm ? "No se encontraron resultados" : "No hay turnos confirmados"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AppointmentConfirmedTable;