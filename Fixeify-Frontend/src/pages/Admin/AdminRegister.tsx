"use client";

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { setAuth, UserRole } from "../../store/authSlice"; // Import setAuth and UserRole
import { registerUser } from "../../api/authApi";
import { useNavigate } from "react-router-dom";

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [serverError, setServerError] = useState<string>("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setServerError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    try {
      const { accessToken, user } = await registerUser(
        formData.name,
        formData.email,
        formData.password,
        "admin"
      );
      // Map the string role to UserRole enum
      const mappedUser = {
        ...user,
        role: user.role === "user" ? UserRole.USER : user.role === "pro" ? UserRole.PRO : UserRole.ADMIN,
      };
      dispatch(setAuth({ user: mappedUser, accessToken }));
      navigate("/admin-dashboard");
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError("Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen dark:bg-gray-900">
      <div className="w-full flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">Admin Register</h1>
          <p className="text-gray-600 mb-4 dark:text-gray-300">Create an admin account.</p>
          <form onSubmit={handleSubmit}>
            {serverError && <p className="text-red-500 text-sm mb-4">{serverError}</p>}
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>

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
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#00205B] text-white py-2 px-4 rounded-md hover:bg-blue-800 transition duration-300 dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600"
            >
              Register Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;