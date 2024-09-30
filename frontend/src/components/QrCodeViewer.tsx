import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";
import Navbar from "./NavBar"; // Importar el componente Navbar

const QRCodeViewer: React.FC = () => {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchAndUpdateQRCode = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/whatsapp/get-qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.message === "Client is already authenticated" || response.data.message === "ready") {
        navigate("/excel-viewer");
      } else if (response.data.message === "Client status unknown") {
        setError("Client status unknown. Please wait...");
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
        setError("Error fetching QR code");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, apiUrl, token, qrCodeData]);

  useEffect(() => {
    fetchAndUpdateQRCode();
    const intervalId = setInterval(fetchAndUpdateQRCode, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchAndUpdateQRCode]);

  useEffect(() => {
    let timerId: number;
    if (qrCodeData && countdown > 0) {
      timerId = window.setInterval(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
      }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [qrCodeData, countdown]);

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-indigo-600 flex flex-col items-center">
      <Navbar /> {/* Agregar el Navbar aquí */}
      <div className="flex justify-center items-center mt-10">
        <div className="bg-white shadow-2xl rounded-lg p-6 w-full max-w-md">
          <div className="flex flex-col justify-center items-center">
            {/* Botón para redirigir a /pending-messages */}
            <button
              onClick={() => navigate("/pending-messages")}
              className="mb-6 px-6 py-3 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 hover:shadow-lg transition duration-300 ease-in-out"
            >
              Go to Pending Messages
            </button>

            {loading ? (
              <p className="text-gray-700 text-lg">Loading QR Code...</p>
            ) : error ? (
              <p className="text-red-500 text-lg">{error}</p>
            ) : qrCodeData ? (
              <div className="mt-4 text-center">
                <QRCode value={qrCodeData} size={256} level="H" />
                <p className="mt-4 text-gray-700 font-semibold">
                  Scan this QR with your cellphone
                </p>
                <p className="mt-2 text-gray-600">
                  QR Code expires in: {countdown} seconds
                </p>
              </div>
            ) : (
              <p className="text-gray-700 text-lg">No QR code available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeViewer;
