// ExcelViewer.tsx
import React, { useState, useEffect } from "react";
import { json, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import axios from "axios";
import Navbar from "./NavBar"; // Importar el componente Navbar
import { FiUpload } from "react-icons/fi"; // Asegúrate de instalar react-icons
import { FaSpinner } from "react-icons/fa"; // Import spinner icon
import { useConversationModeStore } from "../store/ConversationalMode";

interface MedicalService {
  medical_service: string;
  table: Record<string, any>[];
}

const ExcelViewer: React.FC = () => {
  const [token, setToken] = useState<any>(localStorage.getItem("access_token"));
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [formattedPatients, setFormattedPatients] = useState<any[]>([]);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const { setIsConversationalMode } = useConversationModeStore();


  const activeReminderMode = async () => {
    try {
      await axios.post(
        `${apiUrl}/api/whatsapp-mode/start-reminder`,
        {}, // Cuerpo vacío de la solicitud
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsConversationalMode(false);
      console.log("Reminder mode started successfully");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        console.log("error", err);
      }
    }
  };

  const startConversationMode = async () => {
    try {
      await axios.post(
        `${apiUrl}/api/whatsapp-mode/start-conversation`,
        {}, // Cuerpo vacío de la solicitud
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsConversationalMode(true);
      console.log("Conversation mode started successfully");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Error starting conversation mode:", err.response?.data);
      } else {
        console.error("An unexpected error occurred:", err);
      }
    }
  };


const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][];

      if (!isValidExcelFormat(jsonData)) {
        alert(
          "El archivo Excel cargado no se corresponde al formato exportado por el sistema RAS. Por favor, verifique el archivo e intente nuevamente."
        );
        return;
      }

      setExcelData(jsonData.map(row => 
        row.map(cell => cell !== undefined && cell !== null && cell !== "" ? cell : "-") // Cambiado aquí
      ));

      const services: MedicalService[] = [];
      let i = 0;

      while (i < jsonData.length) {
        const row = jsonData[i];
        const nonEmptyCells = row.filter(
          (cell) => cell !== undefined 
          // && cell !== null 
          // && cell !== ""
        );

        if (nonEmptyCells.length === 1 && typeof row[0] === 'string' && nonEmptyCells.length === 1 && !row[0].includes('Turnos del día')) {
          const serviceName = nonEmptyCells[0] as string;
          i++;

          const table: Record<string, any>[] = [];
          const headers = jsonData[i];

          i++;
          while (
            i < jsonData.length &&
            jsonData[i].some(
              (cell) => cell !== undefined 
              // && cell !== null 
              // && cell !== ""
            )
          ) {
            const rowData = jsonData[i];
            const record: Record<string, any> = {};

            headers.forEach((header, index) => {
              if (header === "Teléfono") {
                record[header] = rowData[index]
                  ? rowData[index].toString().match(/\b\d{7,}\b/g) || []
                  : [];
              } else {
                // Asignar un guion si la celda está vacía
                record[header] = rowData[index];
                  
              }
            });

            table.push(record);
            i++;
          }

          services.push({ medical_service: serviceName, table });
        } else {
          i++;
        }
      }

      
      generatePatientData(services, jsonData);
    };
    reader.readAsArrayBuffer(file);
  }
};

  const generatePatientData = (
    services: MedicalService[],
    excelData: any[][]
  ) => {
    // console.log(services)
    // Extract the date from the first row
    const dateString: string = excelData[0][0];
    const [day, month, year] = dateString.replace("Turnos del día ", "").split("/").map(Number);
    const excelDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    
    if (excelDate.toISOString().split("T")[0] <= new Date().toISOString().split("T")[0]) {
      alert("El archivo 'Turnos del día' no coincide con la fecha de mañana. Por favor, asegúrate de que el archivo está actualizado.");
    }
    // Calculate the next business day
    const nextBusinessDay = getNextBusinessDay(excelDate);
    const attachment = nextBusinessDay.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // const today = new Date().toISOString().split("T")[0];
    const patientsArray = services.flatMap((service) =>      
      service.table.map((row, rowIndex) => { // Agregar rowIndex como segundo argumento
        // Validar que todos los campos necesarios estén presentes
        if (!row["Nombre"] || !row["Apellido"] || !row["Hora"] || !Array.isArray(row["Teléfono"]) || row["Teléfono"].length === 0) {
          alert(`Faltan campos necesarios en la fila ${rowIndex + 1} del paciente. Por favor, verifica el archivo. Se obviará esa fila`); // Incluir el número de fila
          return null; // Retornar null si falta algún campo
        }
        else {
          return {
            patient_fullname: `${row["Nombre"]} ${row["Apellido"]}`,
            attachment: `${attachment} at ${row["Hora"]}hs`,
            doctor: service.medical_service,
            patient_cel: row["Teléfono"].map((phone: string) => `${phone}@c.us`),
            // patient_cel: row["Teléfono"].map((phone: string) => `5492616689241@c.us`),
          };
        }
        
      }).filter(row => row !== null) // Filtrar los nulls
  );

  
    setFormattedPatients(patientsArray);
    console.log("Formatted Patients:", patientsArray);
  };

  const getNextBusinessDay = (date: Date): Date => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (nextDay.getDay() === 0) {
      // Skip Sundays
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  };

  const isValidExcelFormat = (data: any[][]): boolean => {
    // Check if the file is empty
    if (data.length === 0) return false;

    // Find the header row
    const headerRowIndex = data.findIndex(
      (row) =>
        row.includes("Nombre") &&
        row.includes("Apellido") &&
        row.includes("Teléfono") &&
        row.includes("Hora")
    );

    if (headerRowIndex === -1) return false;

    // Check if there's at least one medical specialty and one patient
    let foundSpecialty = false;
    let foundPatient = false;

    for (let i = 0; i < data.length; i++) {
      if (i === headerRowIndex) continue;

      const row = data[i];
      const nonEmptyCells = row.filter(
        (cell) => cell !== undefined && cell !== null && cell !== ""
      );

      if (nonEmptyCells.length === 1) {
        foundSpecialty = true;
      } else if (nonEmptyCells.length >= 4) {
        foundPatient = true;
      }

      if (foundSpecialty && foundPatient) return true;
    }

    return false;
  };

  const handleSendReminders = async () => {
    setLoading(true);
    await activeReminderMode();
    const token = localStorage.getItem("access_token");
    try {
      await axios.post(
        `${apiUrl}/api/whatsapp/send-reminders`,
        formattedPatients,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setExcelData([]);
      setFormattedPatients([]);
      startConversationMode();
      alert("Recordatorios enviados exitosamente!");
    } catch (err) {
      console.error("Error sending reminders:", err);
      alert("Error al enviar los recordatorios.");
      navigate('/');
    } finally {
      await startConversationMode();
      setExcelData([]);
      setFormattedPatients([]);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-300 min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Turnos del dia (Sistema RAS)
        </h1>

        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Subir archivo Excel
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Subir un archivo</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".xlsx, .xls"
                      className="sr-only"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <p className="pl-1">o arrastrar y soltar</p>
                </div>
                <p className="text-xs text-gray-500">Solo archivos Excel</p>
              </div>
            </div>
          </div>

          {excelData.length > 0 && (
            <button
              onClick={handleSendReminders}
              className={`w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              disabled={loading || excelData.length === 0}
            >
              {loading ? (
                <>
                  <FaSpinner className="inline-block mr-2 animate-spin" />
                  Enviando recordatorios...
                </>
              ) : (
                "Enviar recordatorios de WhatsApp"
              )}
            </button>
          )}
          <button
            onClick={() => navigate("/pending-messages")}
            className="w-full mt-4 py-2 px-4 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Ir a mensajes pendientes
          </button>
        </div>

        {excelData.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {excelData[0].map((header, index) => (
                    <th key={index} className="p-2 font-medium text-gray-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelData.map((row, rowIndex) => {
                  const nonEmptyCells = row.filter(
                    (cell) => cell !== undefined 
                     && cell !== null 
                     && cell !== ""
                  );
                  const isMedicalSpecialty = nonEmptyCells.length === 1;

                  return (
                    <tr
                      key={rowIndex}
                      className={
                        isMedicalSpecialty
                          ? "bg-gray-100 font-bold"
                          : rowIndex % 2 === 0
                            ? "bg-white"
                            : "bg-gray-50"
                      }
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`p-2 ${isMedicalSpecialty
                            ? "text-gray-800"
                            : "text-gray-500"
                            }`}
                          colSpan={isMedicalSpecialty ? row.length : 1}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelViewer;
