import React, { useState } from "react";
import { z } from "zod";
import { emailSchema } from "../../Validation/validationSchemas";
import { forgotPassword } from "../../api/authApi";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim());
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      await forgotPassword(email);
      setSuccessMessage("A password reset link has been sent to your email.");
      setEmail("");
    } catch (error) {
      console.error("Forgot password error:", error);
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof Error) {
        const err = error as any;
        if (err.response?.status || err.status) {
          const status = err.response?.status || err.status;
          const message = err.response?.data?.message || err.message || "Request failed";
          switch (status) {
            case 404:
              setError("Email not registered. Please sign up.");
              break;
            case 403:
              setError("Your account has been banned. Please contact our support team.");
              break;
            default:
              setError(message || "Failed to send reset link. Please try again.");
          }
        } else {
          setError("Unable to connect to the server. Please try again later.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 text-sm mb-4">{successMessage}</p>}
        <div className="mb-4">
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
          className="w-full bg-[#032B44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition duration-300 dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600"
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;