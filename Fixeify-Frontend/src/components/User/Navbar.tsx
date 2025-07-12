"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { logoutUser } from "../../store/authSlice";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { ConfirmationModal } from "../Admin/ConfirmationModal"; 

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false); 
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    const role = user?.role === "admin" ? "admin" : "user";
    dispatch(logoutUser(role)).then(() => {
      navigate("/home");
      setIsDropdownOpen(false);
      setIsMenuOpen(false);
    });
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    handleLogout();
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 left-0 w-full z-60 transition-all duration-300 ${
        isScrolled ? "shadow-md" : "shadow-none"
      } bg-white dark:bg-gray-900`}
      style={{ top: 0, margin: 0, padding: 0, transform: "translateY(0)" }} // Force flush with top
    >
      <div className="container flex justify-between items-center mx-auto px-4 py-3" style={{ margin: 0 }}>
        <img
          src="/logo.png"
          alt="Fixeify Logo"
          className="h-8 w-auto md:h-10 dark:filter dark:invert"
          onClick={() => navigate('/home')}
        />

        <nav className="gap-6 hidden items-center md:flex">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-yellow-400" />}
          </button>
          <Link to="#how-it-works" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
            How It Works
          </Link>
          <Link to="#help" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
            Help
          </Link>

          <button
            onClick={() => navigate("/become-pro")}
            className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
          >
            Become a Fixeify Pro
          </button>

          {accessToken ? (
            <div className="relative">
              <button
                className="border border-[#032B44] rounded-md text-[#032B44] hover:bg-[#032B44] hover:text-white text-sm font-medium px-4 py-1.5 flex items-center gap-2 dark:border-gray-600 dark:text-gray-300"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {user?.name}
                <motion.svg
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border dark:bg-gray-800 dark:border-gray-700"
                  >
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogoutClick}
                      className="block w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
            >
              Login
            </button>
          )}
        </nav>

        <div className="md:hidden flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-yellow-400" />}
          </button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <motion.svg
              initial={{ rotate: 0 }}
              animate={{ rotate: isMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 dark:text-gray-300"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </motion.svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-[60px] left-0 w-full bg-white shadow-md md:hidden pb-4 px-4 py-2 z-50 dark:bg-gray-900 dark:border-gray-700"
          >
            <nav className="flex flex-col space-y-3">
              <Link to="#how-it-works" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                How It Works
              </Link>
              <Link to="#help" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                Help
              </Link>
              <Link to="/become-pro" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                Become a Fixeify Pro
              </Link>
              {accessToken ? (
                <>
                  <Link to="/profile" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogoutClick}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                  Login
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        action="logout"
        isProcessing={false}
      />
    </motion.header>
  );
};

export default Navbar;