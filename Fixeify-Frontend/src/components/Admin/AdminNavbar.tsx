import type { FC } from "react";
import { Home, Users, Award, Grid, Calendar, BadgeIndianRupee, Star, LogOut, OctagonAlert } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideProps } from "lucide-react";
import { useDispatch } from "react-redux";
import { logoutUser } from "../../store/authSlice";
import { AppDispatch } from "../../store/store";
import { useState, useEffect } from "react";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";

interface NavItem {
  icon: FC<LucideProps>;
  label: string;
  path: string;
  onClick?: () => void;
}

interface AdminNavbarProps {
  isOpen: boolean;
}

export const AdminNavbar: FC<AdminNavbarProps> = ({ isOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  // Removed sidebar shrink persistence (no longer needed)

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Removed sidebar shrink persistence effect

  // Shrink toggle removed

  const handleLogout = () => {
    dispatch(logoutUser("admin")).then(() => {
      navigate("/admin-login");
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

  const navItems: NavItem[] = [
    { icon: Home, label: "Dashboard", path: "/admin-dashboard" },
    { icon: Users, label: "User Management", path: "/admin/users" },
    { icon: Award, label: "Professional Management", path: "/admin/pro-management" },
    { icon: Grid, label: "Category Management", path: "/admin/categories" },
    { icon: Calendar, label: "Booking Management", path: "/admin/bookings" },
    { icon: BadgeIndianRupee, label: "Revenue Management", path: "/admin/revenue" },
    { icon: Star, label: "Rating Management", path: "/admin/reviews" },
    { icon: OctagonAlert, label: "Conflit Management", path: "/admin/conflits" },
    { icon: LogOut, label: "Log Out", path: "/admin-login", onClick: handleLogoutClick },
  ];

  return (
    <>
      <aside
        className={`bg-white h-screen w-64 border-r border-gray-200 overflow-visible transition-all duration-300 ease-in-out z-20 ${
          isLargeScreen 
            ? "relative" 
            : `fixed left-0 ${
                isOpen ? "translate-x-0" : "-translate-x-full"
              }`
        } ${!isLargeScreen ? "top-16" : "top-0"}`}
      >
        <nav className="py-4 h-full overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) =>
              item.label === "Log Out" ? (
                <li key={item.label}>
                  <div
                    onClick={item.onClick}
                    className={`flex items-center px-4 py-3 text-sm ${
                      location.pathname === item.path
                        ? "bg-blue-100 font-semibold"
                        : "hover:bg-gray-100"
                    } rounded-md mx-2 transition-colors duration-200 cursor-pointer`}
                  >
                    <item.icon className="h-5 w-5 text-red-600 mr-3" />
                    <span className="text-red-600 block">{item.label}</span>
                  </div>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    onClick={item.onClick}
                    className={`flex items-center px-4 py-3 text-sm ${
                      location.pathname === item.path
                        ? "bg-blue-100 text-blue-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    } rounded-md mx-2 transition-colors duration-200`}
                    title={""}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="block">{item.label}</span>
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>
      </aside>
      <ConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        action="logout"
        isProcessing={false}
      />
    </>
  );
};