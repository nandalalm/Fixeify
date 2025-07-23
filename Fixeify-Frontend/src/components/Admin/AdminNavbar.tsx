import type { FC } from "react";
import { Home, Users, Award, Grid, Calendar, BadgeIndianRupee, Star, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideProps } from "lucide-react";
import { useDispatch } from "react-redux";
import { logoutUser } from "../../store/authSlice";
import { AppDispatch } from "../../store/store";
import { useState } from "react";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";

interface NavItem {
  icon: FC<LucideProps>;
  label: string;
  path: string;
  onClick?: () => void;
}

interface AdminNavbarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const AdminNavbar: FC<AdminNavbarProps> = ({ isOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
    { icon: Award, label: "Fixeify Pro Management", path: "/admin/pro-management" },
    { icon: Grid, label: "Category Management", path: "/admin/categories" },
    { icon: Calendar, label: "Booking Management", path: "/admin/bookings" },
    { icon: BadgeIndianRupee, label: "Revenue Management", path: "/admin/revenue" },
    { icon: Star, label: "Reviews Management", path: "/admin/reviews" },
    { icon: LogOut, label: "Log Out", path: "/admin-login", onClick: handleLogoutClick },
  ];

  return (
    <>
      <aside
        className={`bg-white h-screen w-64 border-r border-gray-200 overflow-y-auto fixed left-0 top-0 transition-transform duration-300 ease-in-out z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Fixeify</h1>
        </div>
        <nav className="py-4">
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
                    <item.icon className="h-5 w-5 mr-3 text-red-600" /> {/* Red color for icon */}
                    <span className="text-red-600">{item.label}</span> {/* Red color for text */}
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
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.label}</span>
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