import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaCircleUser, FaEye, FaEyeSlash } from "react-icons/fa6";
import { RiLockPasswordFill } from "react-icons/ri";
import { FaSpinner } from "react-icons/fa";

// AOS
import AOS from 'aos';
import 'aos/dist/aos.css'; // You can also use <link> for styles
// ..
AOS.init();

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false); // Estado para mostrar u ocultar contraseña
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await axios.post(`${apiUrl}/api/auth/login`, data);
      if (response.data.error) {
        setErrorMessage(response.data.error);
      } else {
        const { access_token } = response.data;        
        localStorage.setItem("access_token", access_token);
        navigate("/whatsapp-status");
      }
    } catch (error: any) {
      console.log("error", error);
      setErrorMessage(
        "No se pudo acceder al servidor. Por favor, inténtelo de nuevo más tarde."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    // <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
    <div className="relative flex justify-center items-center min-h-screen">
      {/* Video de fondo */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover filter blur-sm"
        src="/video/videoligin1.mp4"
        autoPlay
        loop
        muted
      />

      {/* Capa de difuminado */}
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-30 backdrop-blur-lg"></div>

      <div className="relative  w-full max-w-md p-8 space-y-6 bg-white shadow-2xl rounded-tl-lg rounded-br-lg rounded-tr-3xl rounded-bl-3xl" data-aos="zoom-in"
        data-aos-duration="3000">
        <img
          src="/img/logo-cesasin1.png"
          alt="Logo"
          className="flex h-14 w-auto mx-auto mt-4"
        />
        <div className="flex items-center justify-center space-x-4 mt-4">
          <img
            src="/img/boticon.png"
            alt="Bot Icon"
            className="h-16 w-16" // Ajustar el tamaño de la imagen
          />
          <h1 className="text-center text-2xl font-semibold">WhatsappBot</h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2 text-gray-700 mt-4">
              <FaCircleUser className="text-2xl" />
              <label htmlFor="username" className="text-lg">
                Usuario
              </label>
            </div>
            <input
              type="text"
              id="username"
              className={`p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.username ? "border-red-500" : "border-gray-300"
                }`}
              {...register("username", { required: "Usuario es requerido" })}
              autoFocus
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">
                {errors.username.message}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-3 relative">
            <div className="flex items-center space-x-2 text-gray-700">
              <RiLockPasswordFill className="text-2xl" />
              <label htmlFor="password" className="text-lg">
                Contraseña
              </label>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className={`p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? "border-red-500" : "border-gray-300"
                }`}
              {...register("password", { required: "La contraseña es requerida" })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-11 text-gray-500 focus:outline-none"
            >
              {showPassword ? <FaEye /> : < FaEyeSlash />}
            </button>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          {errorMessage && (
            <p className="text-red-500 text-center">{errorMessage}</p>
          )}
          <button
            type="submit"
            className={`w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-teal-600 transition duration-300 transform hover:scale-105
            ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSpinner className="inline-block mr-2 animate-spin" />
                Accediendo...
              </>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
