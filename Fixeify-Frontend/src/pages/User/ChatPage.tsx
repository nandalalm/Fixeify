import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { RootState, AppDispatch } from "../../store/store";
import { UserRole, User } from "../../store/authSlice";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import MessageBox from "../../components/Messaging/MessageBox";
import { createChat, fetchConversationMessages, markMessagesRead, fetchExistingChat } from "../../store/chatSlice";
import { fetchApprovedProById } from "../../api/adminApi";
import { IApprovedPro } from "@/interfaces/adminInterface";
import { MUser } from "../../interfaces/messagesInterface";

const ChatPage = () => {
  const { proId } = useParams<{ proId: string }>();
  const location = useLocation();
  const proFromState = location.state?.pro as IApprovedPro | undefined;
  const user = useSelector((state: RootState) => state.auth.user) as User | null;
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<MUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [minLoadingTime, setMinLoadingTime] = useState<boolean>(true);

  const currentUser = useMemo(() => ({
    id: user?.id || "",
    name: user?.name || "User",
    avatar: user?.photo || "/placeholder.svg?height=40&width=40",
    isOnline: true,
    role: user?.role || UserRole.USER,
  }), [user?.id, user?.name, user?.photo, user?.role]);

  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const initializeChat = useCallback(async () => {
    if (!user || !accessToken || !proId) {
      console.error("Missing user, accessToken, or proId", { user, accessToken, proId });
      navigate("/login");
      return;
    }
    if (user.role !== UserRole.USER) {
      console.error("Invalid user role", { role: user.role });
      navigate("/home");
      return;
    }

    setLoading(true);
    setError(null);
    setMinLoadingTime(true);
    
    const minLoadingTimer = setTimeout(() => {
      setMinLoadingTime(false);
    }, 500);
    
    try {
      if (!proId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Invalid proId format");
      }

      let pro: IApprovedPro | undefined = proFromState;
      if (!pro) {
        pro = await fetchApprovedProById(proId);
        if (!pro) {
          throw new Error("Professional not found");
        }
      }

      let conversation = await dispatch(
        fetchExistingChat({ userId: user.id, proId, role: user.role })
      ).unwrap();
      console.log("Existing chat fetched:", { conversation, userId: user.id, proId });

      if (!conversation) {
        conversation = await dispatch(
          createChat({ userId: user.id, proId, role: user.role })
        ).unwrap();
        console.log("New chat created:", { conversation });
      }

      if (!conversation?.id || !conversation.participants) {
        throw new Error("Invalid chat response: missing id or participants");
      }

      if (
        conversation.participants.userId !== user.id &&
        conversation.participants.proId !== user.id
      ) {
        throw new Error("User is not a participant in this chat");
      }

      setConversationId(conversation.id);

      setOtherUser({
        id: proId,
        name: pro ? `${pro.firstName} ${pro.lastName}` : conversation.participants.proName || "Professional",
        avatar: pro?.profilePhoto || conversation.participants.proPhoto || "/placeholder.svg?height=40&width=40",
        isOnline: false, 
        role: UserRole.PRO,
      });

      console.log("Fetching messages for chatId:", conversation.id);
      await dispatch(
        fetchConversationMessages({ chatId: conversation.id, page: 1, limit: 20, role: user.role })
      ).unwrap();

      await dispatch(markMessagesRead({ chatId: conversation.id, userId: user.id, role: user.role }));
    } catch (err: any) {
      const errorMessage = typeof err === "string" ? err : err.message || "Failed to initialize chat";
      setError(errorMessage);
      console.error("Error initializing chat:", {
        error: errorMessage,
        message: err.message,
        stack: err.stack,
        userId: user?.id,
        proId,
        role: user?.role,
        conversationId,
      });
    } finally {
      clearTimeout(minLoadingTimer);
      setLoading(false);
      setMinLoadingTime(false);
    }
  }, [user?.id, user?.role, accessToken, proId, proFromState, dispatch, navigate]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  if (loading || minLoadingTime) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex justify-center items-center flex-1">
          <div className="spinner border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !conversationId || !otherUser) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex justify-center items-center flex-1 text-red-500 dark:text-red-400">
          {error || "Failed to load chat"}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <div className="w-full h-full">
          <MessageBox
            key={conversationId}
            conversationId={conversationId}
            currentUser={currentUser}
            otherUser={otherUser}
            onBack={handleBack}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatPage;