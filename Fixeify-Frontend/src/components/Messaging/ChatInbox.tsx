import { FC, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { format } from "date-fns";
import { fetchConversations } from "../../store/chatSlice";
import { RotateCcw } from "lucide-react";
import { getSocket, isSocketConnected } from "../../services/socket";

interface ChatInboxProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string;
}

const ChatInbox: FC<ChatInboxProps> = ({ onSelectConversation, selectedConversationId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const socket = getSocket();
  const isConnected = isSocketConnected();
  const role = user?.role as "user" | "pro";
  const [searchQuery, setSearchQuery] = useState("");

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
    return format(new Date(timestamp), "MMM d");
  };

  const truncateMessage = (message: string) => {
    if (message.length > 30) {
      return message.substring(0, 30) + "...";
    }
    return message;
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) =>
    (user?.role === "user"
      ? conversation.participants.proName
      : conversation.participants.userName
    )
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white text-center md:text-left">
          Conversations
        </h2>
        {conversations.length > 0 && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No conversations
            </div>
          ) : filteredConversations.length === 0 && searchQuery ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No user found with that name
              <button
                onClick={handleClearSearch}
                className="ml-2 text-blue-500 dark:text-blue-400 hover:underline"
              >
                <a className="mt-2 inline-flex items-center text-blue-500 hover:text-blue-700" href="#">
                  <RotateCcw className="h-4 w-4 mr-1" /> Clear Search
                  </a>
              </button>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`p-4 mb-2 rounded-lg cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id
                    ? "bg-blue-100 dark:bg-gray-700"
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
                      <h3 className="text-sm font-medium text-gray-800 dark:text-white">
                        {user?.role === "user"
                          ? conversation.participants.proName
                          : conversation.participants.userName}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.lastMessage &&
                          formatTimestamp(conversation.lastMessage.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
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