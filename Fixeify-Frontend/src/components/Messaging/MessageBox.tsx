import { FC, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { Check, CheckCheck, Send, ArrowLeft, ChevronDown } from "lucide-react";
import { Message, User } from "../../interfaces/messagesInterface";
import { useTheme } from "../../context/ThemeContext";
import { getSocket, isSocketConnected } from "../../services/socket";
import { fetchConversationMessages, markMessagesRead, addMessage, updateOnlineStatus } from "../../store/chatSlice";
import { sendNewMessage } from "../../api/chatApi";

// Define Role enum locally
enum Role {
  USER = "user",
  PRO = "pro",
  ADMIN = "admin",
}

interface MessageBoxProps {
  conversationId: string;
  currentUser: User;
  otherUser: User;
  onBack?: () => void;
}

const MessageBox: FC<MessageBoxProps> = ({
  conversationId,
  currentUser,
  otherUser: initialOtherUser,
  onBack,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [otherUser, setOtherUser] = useState<User>(initialOtherUser);
  const messagesPerPage = 10;
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.chat.messages[conversationId] || []);
  const socket = getSocket();

  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (containerRef.current && memoizedMessages.length > 0) {
      const container = containerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      if (isAtBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [memoizedMessages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (containerRef.current && memoizedMessages.length > 0 && !loading) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [memoizedMessages.length, loading]);

  // Type guard for role
  const isValidChatRole = (role: Role): role is Role.USER | Role.PRO => {
    return role === Role.USER || role === Role.PRO;
  };

  // Join chat room and mark messages as read
  useEffect(() => {
    if (socket && isSocketConnected()) {
      const role = currentUser.role as Role;
      if (isValidChatRole(role)) {
        socket.emit("joinChat", {
          chatId: conversationId,
          participantId: currentUser.id,
          participantModel: role === Role.PRO ? "ApprovedPro" : "User",
        });
        // Mark messages as read when joining the chat
        dispatch(markMessagesRead({ chatId: conversationId, userId: currentUser.id, role }));
      }
    }

    return () => {
      if (socket && isSocketConnected()) {
        socket.emit("leaveChat", { chatId: conversationId });
      }
    };
  }, [socket, conversationId, currentUser.id, currentUser.role, dispatch]);

  const loadMessages = useCallback(async () => {
    if (loading || !hasMore) return;
    const role = currentUser.role as Role;
    if (!isValidChatRole(role)) {
      setError("Admins cannot access chat functionality.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await dispatch(
        fetchConversationMessages({
          chatId: conversationId,
          page,
          limit: messagesPerPage,
          role,
        })
      ).unwrap();
      
      if (result.messages.length < messagesPerPage) {
        setHasMore(false);
      } else {
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, dispatch, currentUser, loading, hasMore, page, messagesPerPage]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setError(null);
    const timer = setTimeout(() => {
      loadMessages();
    }, 1000);
    return () => clearTimeout(timer);
  }, [conversationId, currentUser.id, currentUser.role, loadMessages]);

  // Socket event handlers
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message: Message) => {
        if (message.chatId === conversationId) {
          dispatch(addMessage(message));
          setOtherUserTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          // Mark messages as read if the current user is viewing the conversation
          if (message.senderId !== currentUser.id) {
            dispatch(markMessagesRead({ chatId: conversationId, userId: currentUser.id, role: currentUser.role as "user" | "pro" }));
          }
        }
      };

      const handleTyping = ({ chatId, userId }: { chatId: string; userId: string }) => {
        if (chatId === conversationId && userId !== currentUser.id) {
          setOtherUserTyping(true);
        }
      };

      const handleStopTyping = ({ chatId, userId }: { chatId: string; userId: string }) => {
        if (chatId === conversationId && userId !== currentUser.id) {
          setOtherUserTyping(false);
        }
      };

      const handleUserJoined = ({ chatId, participantId }: { chatId: string; participantId: string }) => {
        if (chatId === conversationId && participantId === otherUser.id) {
          setOtherUser((prev) => ({ ...prev, isOnline: true }));
          dispatch(updateOnlineStatus({ userId: participantId, isOnline: true }));
        }
      };

      const handleUserLeft = ({ chatId, participantId }: { chatId: string; participantId: string }) => {
        if (chatId === conversationId && participantId === otherUser.id) {
          setOtherUser((prev) => ({ ...prev, isOnline: false }));
          dispatch(updateOnlineStatus({ userId: participantId, isOnline: false }));
        }
      };

      const handleOnlineStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
        if (userId === otherUser.id) {
          setOtherUser((prev) => ({ ...prev, isOnline }));
          dispatch(updateOnlineStatus({ userId, isOnline }));
        }
      };

      const handleError = (error: { message: string; error: string }) => {
        console.error("Socket error:", error);
        setError(error.message);
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("userJoined", handleUserJoined);
      socket.on("userLeft", handleUserLeft);
      socket.on("onlineStatus", handleOnlineStatus);
      socket.on("error", handleError);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("userJoined", handleUserJoined);
        socket.off("userLeft", handleUserLeft);
        socket.off("onlineStatus", handleOnlineStatus);
        socket.off("error", handleError);
      };
    }
  }, [socket, conversationId, currentUser.id, otherUser.id, dispatch]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShowScrollToBottom(!isAtBottom);
      if (scrollTop < 100 && hasMore && !loading) {
        const loadMoreMessages = async () => {
          const role = currentUser.role as Role;
          if (!isValidChatRole(role)) {
            setError("Admins cannot access chat functionality.");
            return;
          }

          setLoading(true);
          try {
            const result = await dispatch(
              fetchConversationMessages({
                chatId: conversationId,
                page: page + 1,
                limit: messagesPerPage,
                role,
              })
            ).unwrap();
            if (result.messages.length < messagesPerPage) {
              setHasMore(false);
            } else {
              setPage((prev) => prev + 1);
            }
          } catch (error) {
            console.error("Failed to load more messages:", error);
            setError("Failed to load more messages.");
          } finally {
            setLoading(false);
          }
        };
        loadMoreMessages();
      }
    }
  }, [containerRef, hasMore, loading, currentUser.role, dispatch, conversationId, page, messagesPerPage]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentUser && !isSending) {
      const role = currentUser.role as Role;
      if (!isValidChatRole(role)) {
        setError("Admins cannot send messages.");
        return;
      }

      setIsSending(true);
      try {
        if (socket && isSocketConnected()) {
          socket.emit("stopTyping", { chatId: conversationId });
          socket.emit("sendMessage", {
            chatId: conversationId,
            senderId: currentUser.id,
            senderModel: role === Role.PRO ? "ApprovedPro" : "User",
            body: newMessage.trim(),
            role: role,
          });
          setNewMessage("");
        } else {
          const message = await sendNewMessage(
            conversationId,
            currentUser.id,
            role === Role.PRO ? "ApprovedPro" : "User",
            newMessage.trim()
          );
          dispatch(addMessage(message));
          setNewMessage("");
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setError("Failed to send message. Please check your connection.");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const handleTyping = useCallback(() => {
    if (socket && isSocketConnected()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit("typing", { chatId: conversationId });
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit("stopTyping", { chatId: conversationId });
      }, 3000);
    }
  }, [socket, conversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Invalid time";
      }
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Error formatting timestamp:", timestamp, error);
      return "Invalid time";
    }
  };

  const renderReadReceipt = (status: "sent" | "delivered" | "read") => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isCurrentUser = message.senderId === currentUser.id;

    return (
      <div
        key={`${message.id}-${index}`}
        className={`flex mb-4 ${isCurrentUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`
            max-w-xs lg:max-w-md px-4 py-2 rounded-lg
            ${
              isCurrentUser
                ? "bg-[#032b44] text-white"
                : theme === "dark"
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-200 text-gray-800"
            }
          `}
        >
          <p className="text-sm break-words">{message.content}</p>
          <div
            className={`flex items-center justify-end mt-1 space-x-1 ${
              isCurrentUser ? "text-gray-300" : "text-gray-500"
            }`}
          >
            <span className="text-xs">{formatTime(message.timestamp)}</span>
            {isCurrentUser && <div className="flex">{renderReadReceipt(message.status)}</div>}
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={`flex flex-col h-full ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
        <div className="flex items-center p-4 border-b bg-[#032b44] text-white">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-3 p-1 hover:bg-white/10 rounded md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <img
              src={otherUser.avatar || "/placeholder.svg"}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full"
            />
            {otherUser.isOnline && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="font-semibold">{otherUser.name}</h3>
            <p className="text-sm text-gray-300">
              {otherUser.isOnline
                ? "Online"
                : `Last seen ${otherUser.lastSeen ? formatTime(otherUser.lastSeen) : "recently"}`}
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${theme === "dark" ? "bg-gray-800" : "bg-white"} rounded-lg shadow-lg`}>
      <div className="flex items-center justify-between p-4 border-b bg-[#032b44] text-white">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center flex-1">
          <div className="relative">
            <img
              src={otherUser.avatar || "/placeholder.svg"}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full"
            />
            {otherUser.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="font-semibold">{otherUser.name}</h3>
            <p className="text-sm text-gray-300">
              {otherUser.isOnline
                ? "Online"
                : `Last seen ${otherUser.lastSeen ? formatTime(otherUser.lastSeen) : "recently"}`}
            </p>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
        style={{ minHeight: '200px' }}
        onScroll={handleScroll}
      >
        {loading && page > 1 && (
          <div className="text-center py-4">
            <div className="inline-flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#032b44] mr-2"></div>
              Loading more messages...
            </div>
          </div>
        )}
        {memoizedMessages.map((message, index) => renderMessage(message, index))}
        {otherUserTyping && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 p-2 bg-[#032b44] text-white rounded-full hover:bg-[#032b44]/90 transition-colors shadow-lg"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className={`p-4 border-t ${theme === "dark" ? "bg-gray-700" : "bg-gray-50"}`}>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isSending}
            className={`flex-1 px-4 py-2 border ${
              theme === "dark" ? "border-gray-600 bg-gray-800 text-gray-200" : "border-gray-300"
            } rounded-full focus:outline-none focus:ring-2 focus:ring-[#032b44] focus:border-transparent disabled:opacity-50`}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="p-2 bg-[#032b44] text-white rounded-full hover:bg-[#032b44]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;