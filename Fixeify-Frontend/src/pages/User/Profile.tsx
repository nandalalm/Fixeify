import { useState, useEffect } from "react";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import ProfileInfo from "../../components/User/ProfileInfo";
import EditProfile from "../../components/User/EditProfile";
import ChangePassword from "../../components/User/ChangePassword";
import OngoingRequest from "../../components/User/OngoingRequest";
import { User, GitPullRequestDraft, Bell, IndianRupee, ChevronLeft, ChevronRight, ListCollapse, LogOut, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { logoutUser } from "../../store/authSlice";
import { ConfirmationModal } from "../../components/Admin/ConfirmationModal";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("Profile Info");
  const [isSidebarShrunk, setIsSidebarShrunk] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isExtraSmallScreen, setIsExtraSmallScreen] = useState(false);
  const [isToggleActive, setIsToggleActive] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isEditing, setIsEditing] = useState(() => sessionStorage.getItem("isEditing") === "true");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsExtraSmallScreen(width <= 600);
      if (width <= 600) {
        setIsSidebarVisible(false); 
        setIsToggleActive(false); 
        setIsSidebarShrunk(true); 
      } else {
        setIsSidebarVisible(true); 
        setIsToggleActive(false); 
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const savedState = localStorage.getItem("isSidebarShrunk");
    if (savedState !== null) {
      setIsSidebarShrunk(JSON.parse(savedState));
    }

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("isSidebarShrunk", JSON.stringify(isSidebarShrunk));
    sessionStorage.setItem("isEditing", isEditing.toString());
  }, [isSidebarShrunk, isEditing]);

  const toggleSidebarVisibility = () => {
    setIsSidebarVisible(!isSidebarVisible);
    setIsToggleActive(!isSidebarVisible);
  };

  const toggleSidebar = () => {
    setIsSidebarShrunk(!isSidebarShrunk);
  };

  const handleLogout = () => {
    const role = user?.role === "admin" ? "admin" : "user";
    dispatch(logoutUser(role)).then(() => {
      navigate("/home");
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

  const tabs = [
    { name: "Profile Info", icon: <User className="w-5 h-5" /> },
    { name: "Ongoing Request", icon: <GitPullRequestDraft className="w-5 h-5" /> },
    {
      name: "Booking History",
      icon: (
        <div className="flex flex-col w-5 h-5 justify-center">
          <div className="h-0.5 bg-gray-600 dark:bg-gray-400 mb-1"></div>
          <div className="h-0.5 bg-gray-600 dark:bg-gray-400 mb-1"></div>
          <div className="h-0.5 bg-gray-600 dark:bg-gray-400"></div>
        </div>
      ),
    },
    { name: "Payment Section", icon: <IndianRupee className="w-5 h-5" /> },
    { name: "Notifications & Alerts", icon: <Bell className="w-5 h-5" /> },
    { name: "Logout", icon: <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="relative flex flex-row w-full flex-1">
        {isExtraSmallScreen && (
          <button
            onClick={toggleSidebarVisibility}
            className={`absolute top-2 left-[18px] z-50 p-3 rounded-md transition-colors ${
              isToggleActive ? "ring-2 ring-blue-600 dark:ring-gray-50 shadow-md" : ""
            } text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600`}
          >
            {isSidebarVisible ? (
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <ListCollapse className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>
        )}

        <div
          className={`${
            isExtraSmallScreen
              ? `absolute top-0 left-0 z-40 h-full transition-transform duration-300 ${
                  isSidebarVisible ? "translate-x-0" : "-translate-x-full"
                }`
              : "relative"
          } ${isSidebarShrunk ? "w-20" : "w-70"} bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 ${
            isSidebarShrunk ? "md:w-20" : "md:w-70"
          }`}
        >
          <nav className={`p-4 ${isExtraSmallScreen ? "pt-16" : ""}`}>
            <ul className="space-y-2">
              {tabs.map((tab) => (
                <li key={tab.name}>
                  <button
                    onClick={() => {
                      if (tab.name === "Logout") {
                        handleLogoutClick();
                      } else {
                        setActiveTab(tab.name);
                        if (tab.name === "Profile Info") {
                          setIsEditing(false);
                          setIsChangingPassword(false);
                        }
                      }
                    }}
                    title={isSidebarShrunk ? tab.name : ""}
                    className={`flex items-center w-full p-3 rounded-md transition-colors ${
                      activeTab === tab.name
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    } ${isSidebarShrunk ? "justify-center" : ""}`}
                  >
                    <span className={`${isSidebarShrunk ? "mx-auto" : "mr-3"}`}>{tab.icon}</span>
                    {tab.name === "Logout" ? (
                      <span className={`font-medium ${isSidebarShrunk ? "hidden" : "block"} text-red-600 dark:text-red-400`}>
                        {tab.name}
                      </span>
                    ) : (
                      <span className={`font-medium ${isSidebarShrunk ? "hidden" : "block"}`}>{tab.name}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {isSidebarVisible && (
            <button
              onClick={toggleSidebar}
              className="absolute top-1/2 -right-4 transform -translate-y-1/2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isSidebarShrunk ? (
                <ChevronRight className="w-6 h-6 text-blue-600 dark:text-white" />
              ) : (
                <ChevronLeft className="w-6 h-6 text-blue-600 dark:text-white" />
              )}
            </button>
          )}
        </div>

        <div className={`flex-1 transition-all duration-300 ${isExtraSmallScreen ? "pt-0" : ""}`}>
          {activeTab === "Profile Info" && (
            <div>
              {isEditing ? (
                <EditProfile onCancel={() => { setIsEditing(false); sessionStorage.setItem("isEditing", "false"); }} />
              ) : isChangingPassword ? (
                <ChangePassword onCancel={() => { setIsChangingPassword(false); }} />
              ) : (
                <ProfileInfo
                  onEdit={() => { setIsEditing(true); sessionStorage.setItem("isEditing", "true"); }}
                  onChangePassword={() => { setIsChangingPassword(true); }}
                />
              )}
            </div>
          )}
          {activeTab === "Ongoing Request" && <OngoingRequest />}
          {activeTab === "Booking History" && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Booking History</h2>
              <p className="text-gray-700 dark:text-gray-300">Booking history will be displayed here.</p>
            </div>
          )}
          {activeTab === "Payment Section" && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Payment Section</h2>
              <p className="text-gray-700 dark:text-gray-300">Payment details will be displayed here.</p>
            </div>
          )}
          {activeTab === "Notifications & Alerts" && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Notifications & Alerts</h2>
              <p className="text-gray-700 dark:text-gray-300">Notifications will be displayed here.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <ConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        action="logout"
        isProcessing={false}
      />
    </div>
  );
};

export default Profile;