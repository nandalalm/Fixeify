import { FC, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { Check, CheckCheck, Send, ArrowLeft, ChevronDown, X, Image as ImageIcon, User as UserIcon } from "lucide-react";
import { Message, User } from "../../interfaces/messagesInterface";
import { getSocket, isSocketConnected } from "../../services/socket";
import { fetchConversationMessages, updateOnlineStatus, updateMessageStatus, addIncomingMessage, setConversationLastMessageStatus } from "../../store/chatSlice";
import { sendNewMessage } from "../../api/chatApi";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// S3 Client configuration
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

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
  // Local Avatar component with preload + placeholder (no flicker)
  const Avatar: FC<{ src?: string | null; alt?: string; size?: number; className?: string }> = ({ src, alt = "", size = 40, className = "" }) => {
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
    const [errored, setErrored] = useState(false);

    useEffect(() => {
      if (!src) {
        setLoadedSrc(null);
        setErrored(true);
        return;
      }
      let cancelled = false;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setLoadedSrc(src);
          setErrored(false);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          setLoadedSrc(null);
          setErrored(true);
        }
      };
      img.src = src;
      return () => {
        cancelled = true;
      };
    }, [src]);

    if (loadedSrc && !errored) {
      return (
        <img
          src={loadedSrc}
          alt={alt}
          className={`rounded-full object-cover ${className}`}
          style={{ width: size, height: size }}
        />
      );
    }

    return (
      <div
        className={`rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
        role="img"
      >
        {/* Try placeholder image if available; otherwise show icon */}
        <img
          src="/placeholder-user.jpg"
          alt="placeholder"
          className="w-full h-full object-cover hidden"
          onError={(e) => {
            // If placeholder missing, show icon visually
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          onLoad={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "block";
          }}
        />
        <UserIcon className="w-1/2 h-1/2 text-white" />
      </div>
    );
  };

  // Apply mobile-specific tweaks only for Pro side
  const isPro = currentUser.role === "pro";

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesPerPage = 10;
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.chat.messages[conversationId] || []);
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const onlineUsers = useSelector((state: RootState) => state.chat.onlineUsers);
  const socket = getSocket();

  // Get online status from Redux state
  const isOtherUserOnline = onlineUsers[initialOtherUser.id] || false;

  // S3 Upload function
  const uploadToS3 = async (file: File, folder: string): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const params = {
      Bucket: import.meta.env.VITE_S3_BUCKET_NAME as string,
      Key: `${folder}/${Date.now()}-${file.name}`,
      Body: uint8Array,
      ContentType: file.type,
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${params.Bucket}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${params.Key}`;
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  // Join chat room and mark existing messages as read since MessageBox is open
  useEffect(() => {
    if (socket && isSocketConnected()) {
      const role = currentUser.role as Role;
      if (isValidChatRole(role)) {
        socket.emit("joinChat", {
          chatId: conversationId,
          participantId: currentUser.id,
          participantModel: role === Role.PRO ? "ApprovedPro" : "User",
        });
        // Mark existing unread messages as read since user opened MessageBox
        socket.emit("markMessageRead", { chatId: conversationId });
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
      const handleNewMessage = (raw: any) => {
        // Normalize to our Message shape
        const message: Message = {
          id: raw.id || raw._id || raw.messageId,
          chatId: raw.chatId,
          senderId: raw.senderId,
          senderModel: raw.senderModel,
          content: raw.content ?? raw.body ?? "",
          timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
          status: (raw.status as any) || (raw.isRead ? 'read' : 'delivered'),
          isRead: typeof raw.isRead === 'boolean' ? raw.isRead : raw.status === 'read',
          attachments: raw.attachments,
          type: raw.type,
        } as any;
        if (message.chatId === conversationId) {
          dispatch(addIncomingMessage({ message, currentUserId: currentUser.id, activeChatId: conversationId }));
          setOtherUserTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          // Auto-scroll to bottom when new message arrives
          setShouldAutoScroll(true);
          // If MessageBox is open and user is actively viewing, mark as read immediately
          if (message.senderId !== currentUser.id) {
            const socket = getSocket();
            if (socket && isSocketConnected()) {
              socket.emit("markMessageRead", { chatId: conversationId, messageId: message.id });
            }
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

      const handleMessagesRead = ({ chatId, participantId }: { chatId: string; participantId?: string }) => {
        if (chatId === conversationId && (participantId ? participantId !== currentUser.id : true)) {
          // Update message status to 'read' for all messages sent by current user
          const currentMessages = messagesRef.current;
          currentMessages.forEach(message => {
            if (message.senderId === currentUser.id && message.status !== 'read') {
              dispatch(updateMessageStatus({
                chatId: conversationId,
                messageId: message.id,
                status: 'read'
              }));
            }
          });
          // Also update the conversation lastMessage status for clarity in the list
          dispatch(setConversationLastMessageStatus({ chatId: conversationId, status: 'read' }));
        }
      };

      const handleMessageRead = ({ chatId, messageId, participantId }: { chatId: string; messageId: string; participantId?: string }) => {
        if (chatId === conversationId && (participantId ? participantId !== currentUser.id : true)) {
          // Mark this single message as read
          dispatch(updateMessageStatus({ chatId, messageId, status: 'read' }));
          // If it's the last message in the conversation, update list preview status
          dispatch(setConversationLastMessageStatus({ chatId, status: 'read' }));
        }
      };

      const handleMessagesDelivered = ({ chatId, participantId }: { chatId: string; participantId: string }) => {
        if (chatId === conversationId && participantId !== currentUser.id) {
          // Update message status to 'delivered' for messages sent by current user
          const currentMessages = messagesRef.current;
          currentMessages.forEach(message => {
            if (message.senderId === currentUser.id && message.status === 'sent') {
              dispatch(updateMessageStatus({
                chatId: conversationId,
                messageId: message.id,
                status: 'delivered'
              }));
            }
          });
        }
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("onlineStatus", handleOnlineStatus);
      socket.on("messagesRead", handleMessagesRead);
      socket.on("messageRead", handleMessageRead);
      socket.on("messagesDelivered", handleMessagesDelivered);
      socket.on("error", handleError);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("onlineStatus", handleOnlineStatus);
        socket.off("messagesRead", handleMessagesRead);
        socket.off("messageRead", handleMessageRead);
        socket.off("messagesDelivered", handleMessagesDelivered);
        socket.off("error", handleError);
      };
    }
  }, [socket, conversationId, currentUser.id, dispatch]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShowScrollToBottom(!isAtBottom);

      // Messages are already marked as read when MessageBox opens
      // No need for scroll-based read receipts

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
    if ((newMessage.trim() || selectedImage) && currentUser && !isSending) {
      const role = currentUser.role as Role;
      if (!isValidChatRole(role)) {
        setError("Admins cannot send messages.");
        return;
      }

      setIsSending(true);
      setIsUploadingImage(!!selectedImage);
      
      try {
        let attachments: { url: string; mime: string; size: number }[] = [];
        let messageType: "text" | "image" = "text";
        
        // Upload image to S3 if selected
        if (selectedImage) {
          const imageUrl = await uploadToS3(selectedImage, "chat-images");
          attachments = [{
            url: imageUrl,
            mime: selectedImage.type,
            size: selectedImage.size
          }];
          messageType = "image";
        }

        if (socket && isSocketConnected()) {
          socket.emit("stopTyping", { chatId: conversationId });
          socket.emit("sendMessage", {
            chatId: conversationId,
            senderId: currentUser.id,
            senderModel: role === Role.PRO ? "ApprovedPro" : "User",
            body: newMessage.trim(),
            attachments: attachments.length > 0 ? attachments : undefined,
            type: messageType,
            role: role,
          });
          setNewMessage("");
          clearSelectedImage();
        } else {
          // For API call, we need to update the sendNewMessage function to accept attachments
          const message = await sendNewMessage(
            conversationId,
            currentUser.id,
            role === Role.PRO ? "ApprovedPro" : "User",
            newMessage.trim(),
            messageType,
            attachments.length > 0 ? attachments : undefined
          );
          dispatch(addIncomingMessage({ message, currentUserId: currentUser.id, activeChatId: conversationId }));
          setNewMessage("");
          clearSelectedImage();
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setError("Failed to send message. Please check your connection.");
      } finally {
        setIsSending(false);
        setIsUploadingImage(false);
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
          {/* Message content */}
          {message.content && (
            <p className="text-sm break-words break-all">{message.content}</p>
          )}
          
          {/* Image attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                attachment.mime.startsWith('image/') && (
                  <div key={index} className="relative">
                    <img
                      src={attachment.url}
                      alt="Attachment"
                      className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(attachment.url, '_blank')}
                      loading="lazy"
                    />
                  </div>
                )
              ))}
            </div>
          )}

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
    return (
      <Avatar
        src={initialOtherUser.avatar}
        alt={initialOtherUser.name}
        size={40}
        className="w-10 h-10"
      />
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
        className={`flex-1 overflow-y-auto p-4 space-y-2 relative ${isPro ? 'pb-28' : ''}`}
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
      <div className={`p-4 border-t bg-gray-50 dark:bg-gray-700 ${isPro ? 'sticky bottom-0 z-10' : ''}`}> 
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Image Preview */}
          {imagePreview && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-xs max-h-32 rounded-lg object-cover"
                />
                <button
                  onClick={clearSelectedImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2 p-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {/* Image attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploadingImage}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#032b44] dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Attach image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isSending || isUploadingImage}
              className={`flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-[#032b44] dark:focus:ring-gray-50 focus:border-transparent disabled:opacity-50 resize-none ${isPro ? 'min-h-[40px] max-h-28 overflow-y-auto' : ''}`}
              rows={1}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || isSending || isUploadingImage}
              className="p-2 bg-[#032b44] dark:bg-gray-500 text-white dark:text-white rounded-full hover:bg-[#032b44]/90 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {isUploadingImage ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white dark:!text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;