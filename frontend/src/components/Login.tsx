import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaCircleUser, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa6";
import { RiLockPasswordFill } from "react-icons/ri";
import AOS from "aos";
import "aos/dist/aos.css";

AOS.init();

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

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
        "⚠️ No se pudo acceder al servidor. Intente nuevamente más tarde."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex justify-center items-center min-h-screen">
      {/* Video de fondo */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover filter blur-sm"
        src="/video/videoligin1.mp4"
        autoPlay
        loop
        muted
      />

      {/* Capa de oscurecimiento */}
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-30 backdrop-blur-lg"></div>

      {/* Contenedor principal */}
      <div
        className="relative w-full max-w-md p-8 space-y-6 bg-white shadow-2xl rounded-tl-lg rounded-br-lg rounded-tr-3xl rounded-bl-3xl"
        data-aos="zoom-in"
        data-aos-duration="2000"
      >
        <img
          src="/img/logo-cesasin1.png"
          alt="Logo"
          className="flex h-14 w-auto mx-auto mt-4"
        />
        <div className="flex items-center justify-center space-x-4 mt-4">
          <img src="/img/boticon.png" alt="Bot Icon" className="h-16 w-16" />
          <h1 className="text-center text-2xl font-semibold text-gray-800 drop-shadow-sm">
            WhatsappBot
          </h1>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Usuario */}
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
              className={`p-3 border rounded-lg transition-all duration-300 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 ${
                errors.username ? "border-red-500" : "border-gray-300"
              }`}
              {...register("username", { required: "Usuario es requerido" })}
              autoFocus
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                ❌ {errors.username.message}
              </p>
            )}
          </div>

          {/* Contraseña */}
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
              className={`p-3 border rounded-lg transition-all duration-300 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              {...register("password", {
                required: "La contraseña es requerida",
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-11 text-gray-500 hover:text-blue-600 transition duration-300"
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                ❌ {errors.password.message}
              </p>
            )}
          </div>

          {/* Error general */}
          {errorMessage && (
            <div
              className="flex items-center justify-center text-red-600 bg-red-100 border border-red-300 rounded-lg p-2 text-sm shadow animate-pulse"
              role="alert"
            >
              <span className="mr-2">❌</span>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Botón de ingreso */}
          <button
            type="submit"
            className={`w-full py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-xl transition duration-300 transform hover:scale-105 ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
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
        <footer className="w-full mt-6 text-center text-xs text-gray-600 px-4 sm:px-0">
          Sitio creado por{" "}
          <a
            href="https://www.cuyoweb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black no-underline font-semibold hover:text-purple-400"
          >
            CuyoWeb
          </a>{" "}
          © {new Date().getFullYear()} - Todos los derechos reservados.
        </footer>
        </form>
      </div>
    </div>
  );
};

export default Login;
