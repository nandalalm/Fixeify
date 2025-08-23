import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import ChatInbox from "./ChatInbox";
import MessageBox from "./MessageBox";
import { useTheme } from "../../context/ThemeContext";
import { getSocket, isSocketConnected, reconnectSocket } from "../../services/socket";
import { fetchConversations, addMessage, fetchAllNotifications, markMessagesRead } from "../../store/chatSlice";
import { refreshToken } from "../../store/authSlice";
import { User, Message } from "../../interfaces/messagesInterface";
import { useLocation } from "react-router-dom";

interface MessagingAppProps {
  role: "user" | "pro";
}

export default function MessagingApp({ role }: MessagingAppProps) {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const { conversations } = useSelector((state: RootState) => state.chat);
  const { theme } = useTheme();
  const socket = getSocket();
  const isConnected = isSocketConnected();
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const currentUser: User = {
    id: user?.id || "",
    name: user?.name || "User",
    avatar: user?.photo || undefined,
    isOnline: true,
    role: user?.role || role,
  };

  useEffect(() => {
    if (!user) return;
    dispatch(fetchConversations({ userId: user.id, role }));
  }, [user, role, dispatch]);

  useEffect(() => {
    if (conversations.length > 0 && location.pathname.includes('/chat/')) {
      const proIdMatch = location.pathname.match(/\/chat\/([^\/]+)/);
      if (proIdMatch) {
        const proId = proIdMatch[1];
        const targetConversation = conversations.find(conv => 
          conv.participants.proId === proId || conv.participants.userId === proId
        );
        if (targetConversation) {
          setSelectedConversationId(targetConversation.id);
          setShowMessageBox(true);
        } else {
          const mostRecentConversation = conversations[0];
          if (mostRecentConversation) {
            setSelectedConversationId(mostRecentConversation.id);
            setShowMessageBox(true);
          }
        }
      }
    }
  }, [conversations, location.pathname]);

  useEffect(() => {
    if (!socket || !isConnected) {
      setConnectionError("Connection lost. Attempting to reconnect...");
      return;
    }

    setConnectionError(null);

    const handleNewMessage = (message: Message) => {
      dispatch(addMessage(message));
      dispatch(fetchConversations({ userId: user?.id || "", role }));
    };

    const handleNewNotification = () => {
      dispatch(fetchAllNotifications({ userId: user?.id || "", role, page: 1, limit: 10, filter: "all" }));
    };


    socket.on("newMessage", handleNewMessage);
    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("newNotification", handleNewNotification);
    };
  }, [socket, isConnected, user?.id, dispatch, role]);

  useEffect(() => {
    if (!isConnected && accessToken && user) {
      let retryCount = 0;
      const maxRetries = 5;
      const retryInterval = setInterval(async () => {
        if (retryCount >= maxRetries) {
          setConnectionError("Failed to reconnect after multiple attempts. Please refresh the page.");
          clearInterval(retryInterval);
          return;
        }
        try {
          const result = await dispatch(refreshToken()).unwrap();
          reconnectSocket(result.accessToken || accessToken);
          retryCount = 0;
          setConnectionError(null);
        } catch (error) {
          console.error("Failed to reconnect socket:", error);
          retryCount++;
          setConnectionError(`Connection lost. Attempt ${retryCount}/${maxRetries}...`);
        }
      }, 5000);
      return () => clearInterval(retryInterval);
    }
  }, [isConnected, accessToken, user, dispatch]);

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowMessageBox(true);
    
    if (socket && isConnected && user) {
      socket.emit("joinChat", {
        chatId: conversationId,
        participantId: user.id,
        participantModel: role === "pro" ? "ApprovedPro" : "User",
      });
      dispatch(markMessagesRead({ chatId: conversationId, userId: user.id, role }));
    }
  };

  const handleBackToInbox = () => {
    if (socket && isConnected && selectedConversationId) {
      socket.emit("leaveChat", { chatId: selectedConversationId });
    }
    
    setShowMessageBox(false);
    setSelectedConversationId("");
  };

  const getOtherUser = (conversationId: string): User | null => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return null;

    const isCurrentUserPro = role === "pro";
    const participant = conversation.participants;

    return {
      id: isCurrentUserPro ? participant.userId : participant.proId,
      name: isCurrentUserPro ? participant.userName : participant.proName,
      avatar: isCurrentUserPro 
        ? (participant.userPhoto ?? undefined)
        : (participant.proPhoto ?? undefined),
      isOnline: false,
      role: isCurrentUserPro ? "user" : "pro",
    };
  };

  return (
   <div className={`h-[calc(100vh-5rem)] flex flex-col ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"}`}>
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`w-full md:w-1/3 border-r ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          } ${showMessageBox ? "hidden md:block" : "block"}`}
        >
          <ChatInbox
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </div>
        <div className={`flex-1 flex flex-col ${showMessageBox ? "flex" : "hidden md:flex"}`}>
          {selectedConversationId ? (
            <MessageBox
              conversationId={selectedConversationId}
              currentUser={currentUser}
              otherUser={getOtherUser(selectedConversationId) || {
                id: "",
                name: "Unknown",
                avatar: undefined,
                isOnline: false,
                role: role === "user" ? "pro" : "user",
              }}
              onBack={handleBackToInbox}
            />
          ) : (
            <div
              className={`flex-1 flex items-center justify-center ${
                theme === "dark" ? "bg-gray-800" : "bg-gray-50"
              }`}
            >
              <div className="text-center">
                <h3
                  className={`text-lg font-medium ${
                    theme === "dark" ? "text-gray-200" : "text-gray-900"
                  } mb-2`}
                >
                  Select a conversation
                </h3>
                <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                  Choose a conversation from the sidebar to start messaging.
                </p>
                {connectionError && (
                  <p className="text-red-500 mt-2">
                    {connectionError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}