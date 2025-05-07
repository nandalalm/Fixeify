import React, { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { forgotPassword } from "../../api/authApi"; 
import { emailSchema } from "../../Validation/validationSchemas";

const UserForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim());
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      emailSchema.parse(email);
      await forgotPassword(email);
      setSuccess("A password reset link has been sent to your email.");
      setEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof Error) {
        const err = error as any;
        if (err.response?.status === 404) {
          setError("Email not registered");
        } else {
          setError(err.response?.data?.message || "Failed to send reset link. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">Forgot Password</h1>
          <p className="text-gray-600 mb-6 dark:text-gray-300">
            Enter your email to receive a password reset link.
          </p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-500 text-sm mb-4">{success}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#032B44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition duration-300 dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600 disabled:opacity-50"
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Remembered your password?{" "}
              <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
                Login
              </Link>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserForgotPassword;