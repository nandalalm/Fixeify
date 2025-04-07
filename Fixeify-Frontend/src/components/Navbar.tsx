"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { logoutUser } from "../store/authSlice";
import { Sun, Moon } from "lucide-react"; 
import { useTheme } from "../context/ThemeContext";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
    dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "shadow-md" : "shadow-none"
      } bg-white dark:bg-gray-900`}
    >
      <div className="container flex justify-between items-center mx-auto px-4 py-3">
        <img
          src="/logo.png"
          alt="Fixeify Logo"
          className="h-8 w-auto md:h-10 dark:filter dark:invert"
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

          {accessToken ? (
            <div className="relative">
              <button
                className="border border-[#032B44] rounded-md text-[#032B44] text-sm font-medium px-4 py-1.5 flex items-center gap-2 dark:border-gray-600 dark:text-gray-300"
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
                      to=""
                      className="block px-4 py-2 text-sm hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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
            className="bg-white border-t shadow-md md:hidden pb-4 px-4 py-2 dark:bg-gray-900 dark:border-gray-700"
          >
            <nav className="flex flex-col space-y-3">
              <Link to="#how-it-works" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                How It Works
              </Link>
              <Link to="#help" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                Help
              </Link>
              {accessToken ? (
                <>
                  <Link to="/profile" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                >
                  Login
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;