import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { setAuth, UserRole } from "../../store/authSlice";
import { loginUser, googleLogin } from "../../api/authApi";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { loginSchema } from "../../Validation/validationSchemas";
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import ForgotPassword from "../../components/User/ForgotPassword";
import { GoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [userRole, setUserRole] = useState<"user" | "pro">("user");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // Responsive Google button width (GIS only accepts 120–400px)
  const [gsiWidth, setGsiWidth] = useState<number>(400);
  const gsiContainerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    dispatch({ type: "auth/clearError" });
    dispatch({ type: "auth/logoutUserSync" });
  }, [location, dispatch]);

  useEffect(() => {
    const updateWidth = () => {
      const containerWidth = gsiContainerRef.current?.clientWidth ?? 400;
      const clamped = Math.max(120, Math.min(400, Math.floor(containerWidth)));
      setGsiWidth(clamped);
    };

    const timeoutId = setTimeout(updateWidth, 100);

    let ro: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window && gsiContainerRef.current) {
      ro = new ResizeObserver(() => updateWidth());
      ro.observe(gsiContainerRef.current);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateWidth);
    }

    return () => {
      clearTimeout(timeoutId);
      if (ro && gsiContainerRef.current) ro.unobserve(gsiContainerRef.current);
      if (typeof window !== 'undefined') window.removeEventListener('resize', updateWidth);
    };
  }, [userRole]); // Re-run when userRole changes

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
      if (user.role === "user") {
        navigate("/home", { replace: true });
      } else if (user.role === "pro") {
        navigate("/pro-dashboard", { replace: true });
      } else if (user.role === "admin") {
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
              <div className="w-full max-w-[400px] mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">Login</h1>
                <p className="text-gray-600 mb-4 dark:text-gray-300">
                  Access your account to manage your home services.
                </p>
              </div>

              <div className="w-full max-w-[400px] mx-auto">
                <Tabs
                  defaultValue="user"
                  onValueChange={(value) => {
                    setUserRole(value as "user" | "pro");
                    setErrors({});
                    setServerError("");
                    setFormData({ email: "", password: "" });
                  }}
                  className="mb-4"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-gray-200 dark:bg-gray-700">
                  <TabsTrigger value="user" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-600">
                    User
                  </TabsTrigger>
                  <TabsTrigger value="pro" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-600">
                    Provider
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

                {/* Fixed height container for dynamic content */}
                <div className="mt-4" style={{ minHeight: '140px' }}>
                  {userRole === "user" ? (
                    <>
                      <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500 dark:bg-gray-900 dark:text-gray-300">Or</span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div ref={gsiContainerRef} className="w-full">
                          <GoogleLogin
                            key={`google-login-${userRole}`}
                            onSuccess={handleGoogleLoginSuccess}
                            onError={() => {
                              setServerError("Google login failed. Please try again.");
                            }}
                            theme="outline"
                            size="large"
                            width={String(gsiWidth)}
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Don't Have An Account?{" "}
                          <Link
                            to="/register"
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Sign Up Now
                          </Link>
                        </p>
                        <div className="mt-2 flex justify-center">
                          <Link
                            to="/home"
                            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#032B44] transition-colors dark:text-gray-300 dark:hover:text-white"
                            aria-label="Back Home"
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back Home
                          </Link>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center pt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Don't Have An Account?{" "}
                        <Link
                          to="/become-pro"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Sign Up Now
                        </Link>
                      </p>
                      <div className="mt-2 flex justify-center">
                        <Link
                          to="/home"
                          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#032B44] transition-colors dark:text-gray-300 dark:hover:text-white"
                          aria-label="Back Home"
                        >
                          <ArrowLeftIcon className="h-4 w-4" />
                          Back Home
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;