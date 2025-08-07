import { FC, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { Check, CheckCheck, Send, ArrowLeft, ChevronDown } from "lucide-react";
import { Message, User } from "../../interfaces/messagesInterface";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesPerPage = 10;
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.chat.messages[conversationId] || []);
  const onlineUsers = useSelector((state: RootState) => state.chat.onlineUsers);
  const socket = getSocket();

  // Get online status from Redux state
  const isOtherUserOnline = onlineUsers[initialOtherUser.id] || false;

  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  // Auto-scroll to bottom when new messages are added or on initial load
  useEffect(() => {
    if (containerRef.current && memoizedMessages.length > 0 && !loadingMore) {
      const container = containerRef.current;

      // Auto-scroll on initial load or when shouldAutoScroll is true
      if (isInitialLoad || shouldAutoScroll) {
        container.scrollTop = container.scrollHeight;
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
        setShouldAutoScroll(false);
      } else {
        // For existing messages, only auto-scroll if user is already at bottom
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
        if (isAtBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  }, [memoizedMessages.length, loadingMore, isInitialLoad, shouldAutoScroll]);

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
        dispatch(markMessagesRead({ chatId: conversationId, userId: currentUser.id, role }));
      }
    }

    return () => {
      if (socket && isSocketConnected()) {
        socket.emit("leaveChat", { chatId: conversationId });
      }
    };
  }, [socket, conversationId, currentUser.id, currentUser.role, dispatch]);

  const loadMessages = useCallback(async (isLoadingMore = false) => {
    if ((isLoadingMore ? loadingMore : loading) || !hasMore) return;
    const role = currentUser.role as Role;
    if (!isValidChatRole(role)) {
      setError("Admins cannot access chat functionality.");
      return;
    }

    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const currentPage = isLoadingMore ? page : 1;

      // Add a 1-second delay for loading more messages to show loading indicator
      if (isLoadingMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const result = await dispatch(
        fetchConversationMessages({
          chatId: conversationId,
          page: currentPage,
          limit: messagesPerPage,
          role,
        })
      ).unwrap();

      if (result.messages.length < messagesPerPage) {
        setHasMore(false);
      }

      if (isLoadingMore) {
        setPage((prev) => prev + 1);
      } else {
        setPage(2); // Next page for future loads
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setError("Failed to load messages.");
    } finally {
      if (isLoadingMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [conversationId, dispatch, currentUser, loading, loadingMore, hasMore, page, messagesPerPage]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setError(null);
    setIsInitialLoad(true);
    const timer = setTimeout(() => {
      loadMessages(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [conversationId, currentUser.id, currentUser.role]);

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
          // Auto-scroll to bottom when new message arrives
          setShouldAutoScroll(true);
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

      const handleOnlineStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
        dispatch(updateOnlineStatus({ userId, isOnline }));
      };

      const handleError = (error: { message: string; error: string }) => {
        console.error("Socket error:", error);
        setError(error.message);
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("onlineStatus", handleOnlineStatus);
      socket.on("error", handleError);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("onlineStatus", handleOnlineStatus);
        socket.off("error", handleError);
      };
    }
  }, [socket, conversationId, currentUser.id, dispatch]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShowScrollToBottom(!isAtBottom);

      // Load more messages when scrolling near the top (pagination should load older messages)
      if (scrollTop < 100 && hasMore && !loadingMore && !isInitialLoad) {
        const currentScrollHeight = scrollHeight;
        const currentScrollTop = scrollTop;

        loadMessages(true).then(() => {
          // Maintain scroll position after loading more messages
          requestAnimationFrame(() => {
            if (containerRef.current) {
              const newScrollHeight = containerRef.current.scrollHeight;
              const scrollDiff = newScrollHeight - currentScrollHeight;
              // Set scroll position to maintain user's view
              containerRef.current.scrollTop = currentScrollTop + scrollDiff;
            }
          });
        });
      }
    }
  }, [containerRef, hasMore, loadingMore, isInitialLoad, loadMessages]);

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
        return <Check className="w-3 h-3 text-gray-400 dark:text-gray-300" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400 dark:text-gray-300" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500 dark:text-blue-400" />;
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
      px-4 py-2 rounded-lg
      max-w-[75%] sm:max-w-[60%]
      ${isCurrentUser
              ? "bg-[#032b44] text-white dark:!text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
            }
    `}
        >
          {/* Message text */}
          <p className="text-sm break-words break-all">{message.content}</p>

          {/* Time + Read Receipts */}
          <div
            className={`flex items-center justify-end mt-1 space-x-1 ${isCurrentUser
                ? "text-gray-300 dark:text-gray-300"
                : "text-gray-500 dark:text-gray-300"
              }`}
          >
            <span className="text-xs">{formatTime(message.timestamp)}</span>
            {isCurrentUser && (
              <div className="flex">{renderReadReceipt(message.status)}</div>
            )}
          </div>
        </div>
      </div>

    );
  };

  const renderAvatar = () => {
    if (initialOtherUser.avatar) {
      return (
        <img
          src={initialOtherUser.avatar}
          alt={initialOtherUser.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
        <span className="text-white text-lg font-medium">{initialOtherUser.name.charAt(0).toUpperCase()}</span>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between p-4 border-b bg-[#032b44] text-white dark:text-white">
          <div className="flex items-center flex-1 justify-center md:justify-start">
            <div className="relative">
              {renderAvatar()}
              {isOtherUserOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>
            <div className="ml-3">
              <h3 className="font-semibold text-white dark:!text-white">{initialOtherUser.name}</h3>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white dark:!text-white" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b bg-[#032b44] text-white dark:text-white">
        <div className="flex items-center flex-1 justify-center md:justify-start">
          <div className="relative">
            {renderAvatar()}
            {isOtherUserOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            )}
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-white dark:!text-white">{initialOtherUser.name}</h3>
          </div>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white dark:!text-white" />
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
        style={{ minHeight: '200px' }}
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className="text-center py-4">
            <div className="inline-flex items-center text-sm text-gray-500 dark:text-gray-300">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#032b44] dark:border-gray-300 mr-2"></div>
              Loading more messages...
            </div>
          </div>
        )}
        {memoizedMessages.map((message, index) => renderMessage(message, index))}
        {otherUserTyping && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-300">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 p-2 bg-gray-300 dark:bg-gray-500 text-white dark:text-white rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors shadow-lg"
          >
            <ChevronDown className="w-5 h-5 text-black dark:text-white" />
          </button>
        )}
      </div>
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-700">
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
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-[#032b44] dark:focus:ring-gray-50 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="p-2 bg-[#032b44] dark:bg-gray-500 text-white dark:text-white rounded-full hover:bg-[#032b44]/90 dark:hover:bg-gray-600 transition-colors"
          >
            <Send className="w-5 h-5 text-white dark:!text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;