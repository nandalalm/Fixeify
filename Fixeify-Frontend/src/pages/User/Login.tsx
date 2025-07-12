import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setAuth, UserRole } from "../../store/authSlice";
import { loginUser, googleLogin } from "../../api/authApi";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { loginSchema } from "../../Validation/validationSchemas";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import ForgotPassword from "../../components/User/ForgotPassword";
import { GoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [userRole, setUserRole] = useState<"user" | "pro">("user");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log("LoginPage location:", location.pathname);
    dispatch({ type: "auth/clearError" });
    dispatch({ type: "auth/logoutUserSync" });
  }, [location, dispatch]);

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
      console.log("Attempting login with:", validatedData);
      const { accessToken, user } = await loginUser(
        validatedData.email,
        validatedData.password,
        validatedData.role
      );
      const mappedUser = {
        ...user,
        role: user.role === "user" ? UserRole.USER : user.role === "pro" ? UserRole.PRO : UserRole.ADMIN,
      };
      dispatch(setAuth({ user: mappedUser, accessToken }));
      console.log("Login successful, user role:", user.role);
      if (user.role === "user") {
        console.log("Navigating to /home");
        navigate("/home", { replace: true });
      } else if (user.role === "pro") {
        console.log("Navigating to /pro-dashboard");
        navigate("/pro-dashboard", { replace: true });
      } else if (user.role === "admin") {
        console.log("Navigating to /admin-dashboard");
        navigate("/admin-dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => (fieldErrors[err.path[0]] = err.message));
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        const err = error as any;
        if (err.response?.status || err.status) {
          const status = err.response?.status || err.status;
          const message = err.response?.data?.message || err.message || "Login failed";
          console.log(`API Error - Status: ${status}, Message: ${message}`);

          switch (status) {
            case 400:
              if (message === "Invalid role selected") {
                setServerError("Invalid role selected. Please choose the correct role.");
              } else {
                setServerError(message);
              }
              dispatch({ type: "auth/logoutUserSync" });
              break;
            case 422:
              setServerError("Incorrect password. Please try again.");
              dispatch({ type: "auth/logoutUserSync" });
              break;
            case 403:
              setServerError("Your account has been banned. Please contact our support team.");
              dispatch({ type: "auth/logoutUserSync" });
              break;
            case 404:
              setServerError("Email not registered. Please sign up.");
              dispatch({ type: "auth/logoutUserSync" });
              break;
            default:
              setServerError(message || "Login failed. Please try again.");
              dispatch({ type: "auth/logoutUserSync" });
          }
        } else {
          setServerError("Unable to connect to the server. Please try again later.");
          dispatch({ type: "auth/logoutUserSync" });
        }
      } else {
        setServerError("An unexpected error occurred. Please try again.");
        dispatch({ type: "auth/logoutUserSync" });
      }
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }
      const response = await googleLogin(credentialResponse.credential, 'user');
      const { accessToken, user } = response;
      const mappedUser = {
        ...user,
        role: user.role === "user" ? UserRole.USER : UserRole.ADMIN,
      };
      dispatch(setAuth({ user: mappedUser, accessToken }));
      console.log("Google login successful, user role:", user.role);
      navigate("/home", { replace: true });
    } catch (error: any) {
      console.error("Google login error:", error);
      setServerError(error.response?.data?.message || error.message || "Google login failed. Please try again.");
      dispatch({ type: "auth/logoutUserSync" });
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
          {showForgotPassword ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">Forgot Password</h1>
              <ForgotPassword />
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Back to{" "}
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Login
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
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

                <div className="mb-2">
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

                <div className="mb-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#032B44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition duration-300 dark:bg-gray-700 dark:!text-white dark:hover:bg-gray-600"
                  disabled={!formData.email || !formData.password}
                >
                  Login
                </button>
              </form>

              {userRole === "user" && (
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500 dark:bg-gray-900 dark:text-gray-300">Or</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full">
                      <GoogleLogin
                        onSuccess={handleGoogleLoginSuccess}
                        onError={() => {
                          setServerError("Google login failed. Please try again.");
                        }}
                        theme="outline"
                        size="large"
                        width="100%"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Don't Have An Account?{" "}
                  <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">
                    Sign Up Now
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;