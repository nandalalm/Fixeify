import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { UserRole, User } from "../../store/authSlice";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import MessagingApp from "../../components/Messaging/MessasingApp";

const UserMessages = () => {
  const user = useSelector((state: RootState) => state.auth.user) as User | null;
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true); 

  useEffect(() => {
    if (!user || !accessToken) {
      navigate("/login");
      return;
    }
    if (user.role !== UserRole.USER) {
      navigate("/home");
      return;
    }

    setLoading(false);
  }, [user, accessToken, dispatch, navigate]);

  useEffect(() => {
    if (!user || user.role !== UserRole.USER) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== UserRole.USER) {
    return null; 
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden">
            <MessagingApp role="user" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserMessages;
