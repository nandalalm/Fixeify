import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setAuth, UserRole } from "../../store/authSlice";
import { registerUser, sendOtp, verifyOtp } from "../../api/authApi";
import { Link, useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { z } from "zod";
import { registerSchema, baseRegisterSchema } from "../../Validation/validationSchemas";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trim() }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSendOtp = async () => {
    setErrors({});
    setServerError("");
    try {
      const { email } = baseRegisterSchema.pick({ email: true }).parse({ email: formData.email });
      setIsSendingOtp(true);
      await sendOtp(email);
      setOtpSent(true);
      setTimeLeft(60);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ email: error.errors[0].message });
      } else if (error instanceof Error) {
        if (error.message.includes("already registered")) {
          setServerError("This email is already registered. Please use a different email or login.");
        } else {
          setServerError("Failed to send OTP. Please try again.");
        }
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrors({});
    setServerError("");
    try {
      const { email, otp } = baseRegisterSchema.pick({ email: true, otp: true }).parse({
        email: formData.email,
        otp: formData.otp,
      });
      if (!otp) throw new Error("OTP is required");
      const result = await verifyOtp(email, otp);
      if (result.message === "OTP verified") {
        setOtpVerified(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ otp: error.errors[0].message });
      } else if (error instanceof Error) {
        if (error.message.includes("Invalid or expired OTP")) {
          setServerError("Invalid or expired OTP. Please try again.");
        } else {
          setServerError("Invalid or expired OTP. Please try again.");
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    try {
      const validatedData = registerSchema.parse({
        ...formData,
        name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
      });
      if (!otpVerified) throw new Error("Please verify your email with OTP");
      const { accessToken, user } = await registerUser(
        validatedData.name,
        validatedData.email,
        validatedData.password,
        "user"
      );
      const mappedUser = {
        ...user,
        role: user.role === "user" ? UserRole.USER : user.role === "pro" ? UserRole.PRO : UserRole.ADMIN,
      };
      dispatch(setAuth({ user: mappedUser, accessToken }));
      navigate("/home");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "name") {
            fieldErrors.firstName = "First name must be at least 4 characters long";
          } else {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        if (error.message.includes("already registered")) {
          setServerError("This email is already registered. Please use a different email or login.");
        } else {
          setServerError(error.message);
        }
      }
    }
  };

  useEffect(() => {
    if (otpSent && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [otpSent, timeLeft]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.trim();
    if (/^\d$/.test(value) || value === "") {
      const newOtp = formData.otp.split("");
      newOtp[index] = value;
      setFormData((prev) => ({ ...prev, otp: newOtp.join("") }));
      setErrors((prev) => ({ ...prev, otp: "" }));
      if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !formData.otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  return (
    <div className="flex min-h-screen dark:bg-gray-900">
      <div className="hidden md:block md:w-1/2 bg-gray-100 relative dark:bg-gray-800">
        <img
          src="/signupPic.png?height=800&width=600"
          alt="Technician installing ceiling light"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">Signup</h1>
          <p className="text-gray-600 mb-4 dark:text-gray-300">
            Join our trusted network of home service providers.
          </p>
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
                disabled={otpVerified}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              {!otpSent && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="mt-4 bg-[#032B44] text-white py-1 px-3 rounded-md hover:bg-[#054869] flex items-center justify-center dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600 transition duration-300"
                  disabled={isSendingOtp || !formData.email}
                >
                  {isSendingOtp ? (
                    <>
                      <ClipLoader size={20} color="#ffffff" className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </button>
              )}
            </div>

            {otpSent && !otpVerified && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">OTP</label>
                <div className="flex justify-start space-x-2">
                  {Array(6)
                    .fill(0)
                    .map((_, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        value={formData.otp[index] || ""}
                        onChange={(e) => handleOtpChange(e, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        className="w-12 h-12 text-center text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    ))}
                </div>
                {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
                <p className="text-sm text-red-600 mt-2 dark:text-red-400">
                  Time left: {timeLeft}s
                </p>
                {timeLeft === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResendingOtp(true);
                      handleSendOtp().finally(() => setIsResendingOtp(false));
                    }}
                    className="mt-4 bg-[#00205B] text-white py-1 px-3 rounded-md hover:bg-[#003087] flex items-center justify-center dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600 transition duration-300"
                    disabled={isResendingOtp}
                  >
                    {isResendingOtp ? (
                      <>
                        <ClipLoader size={20} color="#ffffff" className="mr-2" />
                        Resending...
                      </>
                    ) : (
                      "Resend OTP"
                    )}
                  </button>
                )}
                {timeLeft > 0 && (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="mt-4 bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 transition-all duration-300 transform hover:scale-105 dark:bg-green-600 dark:hover:bg-green-700"
                    disabled={formData.otp.length !== 6}
                  >
                    Verify OTP
                  </button>
                )}
              </div>
            )}

            {otpVerified && (
              <>
                <div className="mb-4">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    required
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div className="mb-4">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Last Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div className="mb-4">
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
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#032B44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition duration-300 dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600"
                  disabled={!formData.firstName || !formData.email || !formData.password || !formData.confirmPassword}
                >
                  Sign Up
                </button>
              </>
            )}
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already Have An Account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
                Login Now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;