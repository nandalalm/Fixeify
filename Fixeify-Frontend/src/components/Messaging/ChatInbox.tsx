import { FC, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { format } from "date-fns";
import { fetchConversations, updateOnlineStatus, addMessage, updateConversationReadStatus } from "../../store/chatSlice";
import { RotateCcw, Image as ImageIcon } from "lucide-react";
import { getSocket, isSocketConnected } from "../../services/socket";

interface ChatInboxProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string;
}

const ChatInbox: FC<ChatInboxProps> = ({ onSelectConversation, selectedConversationId }) => {

  const conversationsDebug = useSelector((state: RootState) => state.chat.conversations);
  console.log('[ChatInbox Render] conversations:', conversationsDebug.map(c => ({id: c.id, unreadCount: c.unreadCount, lastMessage: c.lastMessage?.content?.slice(0, 30)})), 'selectedConversationId:', selectedConversationId);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const onlineUsers = useSelector((state: RootState) => state.chat.onlineUsers);
  const socket = getSocket();
  const isConnected = isSocketConnected();
  const role = user?.role as "user" | "pro";
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    dispatch(fetchConversations({ userId: user.id, role }));
  }, [user, role, dispatch]);


  useEffect(() => {
    if (!socket || !isConnected || !user || !conversations.length) return;
    const participantId = user.id;
    const participantModel = role === "pro" ? "ApprovedPro" : "User";

    conversations.forEach(conv => {
      socket.emit("joinChat", { chatId: conv.id, participantId, participantModel });
      console.log(`[SOCKET][ChatInbox] joinChat emitted for chatId: ${conv.id}, participantId: ${participantId}, participantModel: ${participantModel}`);
    });
   
    return () => {
      conversations.forEach(conv => {
        socket.emit("leaveChat", { chatId: conv.id });
        console.log(`[SOCKET][ChatInbox] leaveChat emitted for chatId: ${conv.id}`);
      });
    };
  }, [socket, isConnected, user?.id, role, conversations.length]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (message: any) => {
      console.log('[SOCKET][ChatInbox] newMessage received:', message);
     
      dispatch(addMessage(message));
    };

    const handleMessageRead = ({ chatId }: { chatId: string }) => {
     
      dispatch(updateConversationReadStatus({ chatId }));
    };

    const handleMessagesRead = ({ chatId }: { chatId: string }) => {
     
      dispatch(updateConversationReadStatus({ chatId }));
    };

    const handleOnlineStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      dispatch(updateOnlineStatus({ userId, isOnline }));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageRead", handleMessageRead);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("onlineStatus", handleOnlineStatus);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageRead", handleMessageRead);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("onlineStatus", handleOnlineStatus);
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

  const filteredConversations = conversations
    .filter((conversation) =>
      (user?.role === "user"
        ? conversation.participants.proName
        : conversation.participants.userName
      )
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by latest message timestamp (most recent first)
      const aTimestamp = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const bTimestamp = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return bTimestamp - aTimestamp;
    });

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
                    {/* Online status indicator */}
                    {onlineUsers[
                      user?.role === "user"
                        ? conversation.participants.proId
                        : conversation.participants.userId
                    ] && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-800 dark:text-white">
                        {user?.role === "user"
                          ? conversation.participants.proName
                          : conversation.participants.userName}
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* Unread count badge */}
                        {conversation.unreadCount > 0 && (
                          <div className="bg-green-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                          </div>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.lastMessage &&
                            formatTimestamp(conversation.lastMessage.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {conversation.lastMessage ? (
                        conversation.lastMessage.content ? (
                          truncateMessage(conversation.lastMessage.content)
                        ) : (
                          <div className="flex items-center space-x-1">
                            <ImageIcon className="w-4 h-4" />
                            <span>Image</span>
                          </div>
                        )
                      ) : (
                        "No messages yet"
                      )}
                    </div>
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