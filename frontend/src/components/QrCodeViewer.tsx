import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";
import Navbar from "./NavBar";
import { Loader2, RefreshCcw, Inbox } from "lucide-react";
import "./QrCodeViewer.css"; // Si usás el CSS externo

const QRCodeViewer: React.FC = () => {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [restarting, setRestarting] = useState<boolean>(false);
  const [restartMessage, setRestartMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchAndUpdateQRCode = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/whatsapp/get-qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (
        response.data.message === "Client is already authenticated" ||
        response.data.message === "ready"
      ) {
        navigate("/excel-viewer");
      } else if (response.data.message === "Client status unknown") {
        setError("Estado del cliente desconocido.");
        setQrCodeData(null);
      } else if (response.data.qrCode) {
        if (response.data.qrCode !== qrCodeData) {
          setQrCodeData(response.data.qrCode);
          setCountdown(30);
        }
        setError(null);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate("/");
      } else {
        setError("Error al obtener el código QR");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, apiUrl, token, qrCodeData]);

  useEffect(() => {
    fetchAndUpdateQRCode();
    const intervalId = setInterval(fetchAndUpdateQRCode, 5000);
    return () => clearInterval(intervalId);
  }, [fetchAndUpdateQRCode]);

  useEffect(() => {
    let timerId: number;
    if (qrCodeData && countdown > 0) {
      timerId = window.setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [qrCodeData, countdown]);

  const handleRestartClient = async () => {
    setRestarting(true);
    setRestartMessage(null);
    try {
      const response = await axios.post(
        `${apiUrl}/api/whatsapp/restart-client`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRestartMessage(response.data.message || "Cliente reiniciado.");
      fetchAndUpdateQRCode();
    } catch (error) {
      setRestartMessage("Error al reiniciar WhatsApp.");
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-r from-blue-400 to-indigo-600 flex flex-col">
      <Navbar />
      <div className="flex-grow flex justify-center items-center animate-fade-in-up px-4">
        <div className="bg-white shadow-xl rounded-2xl my-2 p-6 w-full max-w-md border-t-4 border-blue-500 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-blue-600 mb-6 text-center">
            Escanea el código QR
          </h2>

          <button
            onClick={() => navigate("/pending-messages")}
            className="mb-6 px-6 py-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 hover:shadow-lg transition flex items-center gap-2"
          >
            <Inbox className="h-5 w-5" />
            Ir a mensajes pendientes
          </button>


          <button
            onClick={handleRestartClient}
            className="mb-6 px-6 py-3 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 hover:shadow-lg transition flex items-center gap-2"
            disabled={restarting}
          >
            {restarting ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Reiniciando...
              </>
            ) : (
              <>
                <RefreshCcw className="h-5 w-5" />
                Reiniciar WhatsApp
              </>
            )}
          </button>

          {restartMessage && (
            <p className="text-gray-700 text-center text-lg font-semibold mb-4">
              {restartMessage}
            </p>
          )}

          {loading ? (
            <p className="text-gray-700 text-lg">Cargando código QR...</p>
          ) : error ? (
            <p className="text-red-500 text-lg">{error}</p>
          ) : qrCodeData ? (
            <div className="mt-2 flex flex-col items-center text-center">
              <div className="flex justify-center">
                <QRCode value={qrCodeData} size={240} level="H" />
              </div>
              <p className="mt-4 text-lg text-gray-800 font-medium">
                Escaneá con WhatsApp en tu teléfono
              </p>
              <p className="mt-2 text-sm text-gray-700 italic">
                QR válido por {countdown} segundos
              </p>
            </div>

          ) : (
            <p className="text-gray-700 text-lg">No hay código QR disponible</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeViewer;
