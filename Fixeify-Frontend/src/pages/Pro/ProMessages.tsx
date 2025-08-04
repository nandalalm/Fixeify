import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { UserRole, User } from "../../store/authSlice";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import MessagingApp from "../../components/Messaging/MessasingApp";

const ProMessages = () => {
  const user = useSelector((state: RootState) => state.auth.user) as User | null;
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true); 


  useEffect(() => {
    if (!user || !accessToken) {
      navigate("/login");
      return;
    }
    if (user.role !== UserRole.PRO) {
      navigate("/pro-dashboard");
      return;
    }

    setLoading(false);
  }, [user, accessToken, dispatch, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen((prev: boolean) => !prev);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== UserRole.PRO) {
    return null; 
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ProTopNavbar toggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <ProNavbar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <main
          className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="max-w-7xl mx-auto h-full">
            <MessagingApp role="pro" />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProMessages;