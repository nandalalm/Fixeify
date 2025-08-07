import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Briefcase, Wallet, User, MessageSquare, Star, Calendar1, LogOut } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { useDispatch,useSelector } from "react-redux";
import { AppDispatch,RootState } from "../../store/store";
import { logoutUser } from "../../store/authSlice";
import { useState } from "react";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal"; 

interface NavItem {
  icon: FC<LucideProps>;
  label: string;
  path: string;
  onClick?: () => void;
}

interface ProNavbarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const ProNavbar: FC<ProNavbarProps> = ({ isOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const [showLogoutModal, setShowLogoutModal] = useState(false); 
    const user = useSelector((state: RootState) => state.auth.user); // ✅ Moved inside
  const proId = user?.id;

  const handleLogout = () => {
    dispatch(logoutUser("pro")).then(() => {
      window.location.href = "/home";
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
    { icon: Home, label: "Dashboard", path: "/pro-dashboard" },
    { icon: Briefcase, label: "Jobs", path: "/pro/jobs" },
    { icon: Wallet, label: "Wallet", path: `/pro/wallet/${proId}` },
    { icon: MessageSquare, label: "Messages", path: "/pro/messages" },
    { icon: Star, label: "Rating", path: "/pro/ratings" },
    { icon: Calendar1, label: "Slots", path: "/pro/slot-management" },
    { icon: User, label: "Profile", path: "/pro/profile" },
    { icon: LogOut, label: "Log Out", path: "/login", onClick: handleLogoutClick },
  ];

  return (
    <>
      <aside
        className={`bg-white h-screen w-64 border-r border-gray-200 overflow-y-auto fixed left-0 top-0 transition-transform duration-300 ease-in-out z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Fixeify Pro</h1>
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
                    <item.icon className="h-5 w-5 mr-3 text-red-600" />
                    <span className="text-red-600">{item.label}</span> 
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