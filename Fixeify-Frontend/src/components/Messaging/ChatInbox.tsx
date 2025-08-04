import { FC, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";
import { fetchConversations } from "../../store/chatSlice";
import { getSocket, isSocketConnected } from "../../services/socket";

interface ChatInboxProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string;
}

const ChatInbox: FC<ChatInboxProps> = ({ onSelectConversation, selectedConversationId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const { theme } = useTheme();
  const socket = getSocket();
  const isConnected = isSocketConnected();
  const role = user?.role as "user" | "pro";

  useEffect(() => {
    if (!user) return;
    dispatch(fetchConversations({ userId: user.id, role }));
  }, [user, role, dispatch]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = () => {
      dispatch(fetchConversations({ userId: user?.id || "", role }));
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, isConnected, user?.id, role, dispatch]);

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  const truncateMessage = (message: string) => {
    if (message.length > 30) {
      return message.substring(0, 30) + "...";
    }
    return message;
  };

  return (
    <div className={`h-full flex flex-col ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Conversations
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No conversations
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`p-4 mb-2 rounded-lg cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <img
                      src={
                        user?.role === "user"
                          ? conversation.participants.proPhoto || "/placeholder.svg"
                          : conversation.participants.userPhoto || "/placeholder.svg"
                      }
                      alt={
                        user?.role === "user"
                          ? conversation.participants.proName
                          : conversation.participants.userName
                      }
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {user?.role === "user"
                          ? conversation.participants.proName
                          : conversation.participants.userName}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.lastMessage &&
                          formatTimestamp(conversation.lastMessage.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {conversation.lastMessage?.content
                        ? truncateMessage(conversation.lastMessage.content)
                        : "No messages yet"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInbox;