"use client";

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { setUser, setAccessToken } from "../store/authSlice";
import { loginUser } from "../api/authApi";
import { useNavigate, Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { loginSchema } from "../validationSchemas";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"; 

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [userRole, setUserRole] = useState<"user" | "pro">("user");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false); 
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trim() }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");
  
    try {
      const validatedData = loginSchema.parse({ ...formData, role: userRole });
      const { accessToken, user } = await loginUser(validatedData.email, validatedData.password, validatedData.role);
      dispatch(setAccessToken(accessToken));
      dispatch(setUser({ name: user.name, email: user.email, role: user.role }));
      if (user.role === "user") {
        navigate("/home");
      } else if (user.role === "pro") {
        navigate("/pro-dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        const message = error.message;
        if (message === "Email not registered") {
          setServerError("The email you have entered is not registered. Please sign up.");
        } else if (message === "Incorrect password") {
          setServerError("Incorrect password");
        } else if (message === "Invalid role for this user") {
          setServerError(`This email is not registered as a ${userRole} account.`);
        } else if (message === "Your account is banned. Please contact support.") {
          setServerError(message); 
        } else if (message === "Session expired. Please log in again.") {
          setServerError(message);
        } else if (message.includes("FixeifyPro authentication not implemented")) {
          setServerError("Pro login is not available yet");
        } else {
          setServerError("Login failed. Please try again.");
        }
      } else {
        setServerError("An unexpected error occurred");
      }
    }
  };
  
  return (
    <div className="flex min-h-screen dark:bg-gray-900">
      <div className="hidden md:block md:w-1/2 bg-gray-100 relative dark:bg-gray-800">
        <img
          src="/loginPic.png?height=800&width=600"
          alt="Technician working"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">Login</h1>
          <p className="text-gray-600 mb-4 dark:text-gray-300">
            Access your account to manage your home services.
          </p>

          <Tabs
            defaultValue="user"
            onValueChange={(value) => setUserRole(value as "user" | "pro")}
            className="mb-4"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-200 dark:bg-gray-700">
              <TabsTrigger value="user" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-600">
                User
              </TabsTrigger>
              <TabsTrigger value="pro" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-600">
                Fixeify Pro
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit}>
            {serverError && <p className="text-red-500 text-sm mb-4">{serverError}</p>}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-[#00205B] text-white py-2 px-4 rounded-md hover:bg-[#003087] transition duration-300 dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600"
              disabled={!formData.email || !formData.password}
            >
              Login
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Don’t Have An Account?{" "}
              <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">
                Sign Up Now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;