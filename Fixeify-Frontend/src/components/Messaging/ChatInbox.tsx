import { useState, useEffect, FC, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import { format } from "date-fns";
import { fetchConversations, updateOnlineStatus, addIncomingMessage, updateConversationReadStatus, setConversationLastMessageStatus, updateMessageStatus, updateConversation } from "../../store/chatSlice";
import { RotateCcw, Image as ImageIcon, User as UserIcon } from "lucide-react";
import { getSocket, isSocketConnected } from "../../services/socket";

interface ChatInboxProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string;
}

const ChatInbox: FC<ChatInboxProps> = ({ onSelectConversation, selectedConversationId }) => {

  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const onlineUsers = useSelector((state: RootState) => state.chat.onlineUsers);
  const socket = getSocket();
  const isConnected = isSocketConnected();
  const role = user?.role as "user" | "pro";
  const [searchQuery, setSearchQuery] = useState("");
  const lastFetchRef = useRef<number>(0);

  const handleNewNotification = useCallback((notification: any) => {
    const now = Date.now();
    if (notification.receiverId === user?.id && user && now - lastFetchRef.current > 1000) {
      lastFetchRef.current = now;
      dispatch(fetchConversations({ userId: user.id, role }));
    }
  }, [user, role, dispatch]);

  useEffect(() => {
    if (!user) return;
    dispatch(fetchConversations({ userId: user.id, role }));
  }, [user, role, dispatch]);


  useEffect(() => {
    if (!socket || !isConnected) {
      console.warn("Socket not connected, real-time features may not work");
      return;
    }

    const handleNewMessage = (raw: any) => {
      
      const message = {
        id: raw.id || raw._id || raw.messageId,
        chatId: raw.chatId,
        senderId: raw.senderId,
        senderModel: raw.senderModel,
        content: raw.content ?? raw.body ?? "",
        timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
        status: raw.status || (raw.isRead ? 'read' : 'delivered'),
        isRead: typeof raw.isRead === 'boolean' ? raw.isRead : raw.status === 'read',
        attachments: raw.attachments,
        type: raw.type,
      } as any;
      
      if (user) {
        dispatch(addIncomingMessage({ message, currentUserId: user.id, activeChatId: selectedConversationId }));
      }
    };

    const handleMessageRead = ({ chatId, messageId, messageIds }: { chatId: string; messageId?: string; messageIds?: string[] }) => {
      dispatch(updateConversationReadStatus({ chatId }));
      dispatch(setConversationLastMessageStatus({ chatId, status: 'read' }));
      const ids = messageIds || (messageId ? [messageId] : []);
      ids.forEach(id => dispatch(updateMessageStatus({ chatId, messageId: id, status: 'read' })));
    };

    const handleMessagesRead = ({ chatId, messageIds }: { chatId: string; messageIds?: string[] }) => {
      dispatch(updateConversationReadStatus({ chatId }));
      dispatch(setConversationLastMessageStatus({ chatId, status: 'read' }));
      (messageIds || []).forEach(id => dispatch(updateMessageStatus({ chatId, messageId: id, status: 'read' })));
    };

    const handleOnlineStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      dispatch(updateOnlineStatus({ userId, isOnline }));
    };

    const handleConversationUpdated = (updatedConversation: any) => {
      dispatch(updateConversation(updatedConversation));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageRead", handleMessageRead);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("onlineStatus", handleOnlineStatus);
    socket.on("conversationUpdated", handleConversationUpdated);
    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageRead", handleMessageRead);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("onlineStatus", handleOnlineStatus);
      socket.off("conversationUpdated", handleConversationUpdated);
      socket.off("newNotification", handleNewNotification);
    };
  }, [socket, isConnected, user?.id, role, dispatch, selectedConversationId, handleNewNotification]);

  const Avatar: React.FC<{ src?: string | null; alt: string; className?: string }> = ({ src, alt, className }) => {
    const placeholder = "/placeholder-user.jpg";
    const [displayedSrc, setDisplayedSrc] = useState<string>(placeholder);

    useEffect(() => {
      const url = (src || "").trim();
      if (!url) {
        setDisplayedSrc(placeholder);
        return;
      }
      let cancelled = false;
      const img = new Image();
      img.onload = () => { if (!cancelled) setDisplayedSrc(url); };
      img.onerror = () => { if (!cancelled) setDisplayedSrc(placeholder); };
      img.src = url;
      return () => { cancelled = true; };
    }, [src]);

    if (displayedSrc === placeholder) {
      return (
        <div
          aria-label={alt}
          className={(className || "w-10 h-10 rounded-full") + " bg-gray-200 dark:bg-gray-700 border flex items-center justify-center text-gray-500 dark:text-gray-300"}
        >
          <UserIcon className="w-5 h-5" />
        </div>
      );
    }
    return <img src={displayedSrc} alt={alt} className={className || "w-10 h-10 rounded-full object-cover"} />;
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d");
  };

  const truncateMessage = (message: string) => {
    if (message.length > 15) {
      return message.substring(0, 15) + "...";
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
                    <Avatar
                      src={
                        user?.role === "user"
                          ? conversation.participants.proPhoto
                          : conversation.participants.userPhoto
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