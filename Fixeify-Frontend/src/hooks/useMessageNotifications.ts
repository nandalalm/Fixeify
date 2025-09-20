import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  fetchAllMessageNotifications,
  markNotificationRead,
  markAllMessageNotificationsRead,
} from '../store/chatSlice';

interface UseMessageNotificationsProps {
  userId: string;
  role: "user" | "pro" | "admin";
}

export const useMessageNotifications = ({ userId, role }: UseMessageNotificationsProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { messageNotifications, status, error } = useSelector((state: RootState) => state.chat);
  
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const limit = 10;

  const fetchNotifications = useCallback(async (pageNum: number = 1, filterType: 'all' | 'unread' = filter) => {
    if (!userId || !role) return;
    
    try {
      const result = await dispatch(fetchAllMessageNotifications({
        userId,
        role,
        page: pageNum,
        limit,
        filter: filterType
      })).unwrap();
      
      setHasMore(result.length === limit);
    } catch (error) {
      console.error('Failed to fetch message notifications:', error);
      setHasMore(false);
    }
  }, [dispatch, userId, role, filter, limit]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || status === 'loading') return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      await fetchNotifications(nextPage, filter);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchNotifications, filter, hasMore, isLoadingMore, page, status]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await dispatch(markNotificationRead(notificationId)).unwrap();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [dispatch]);

  const markAllAsRead = useCallback(async () => {
    if (!userId || !role) return;
    
    try {
      await dispatch(markAllMessageNotificationsRead({ userId, role })).unwrap();
    } catch (error) {
      console.error('Failed to mark all message notifications as read:', error);
    }
  }, [dispatch, userId, role]);

  const toggleFilter = useCallback((newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
    setPage(1);
    setHasMore(true);
    fetchNotifications(1, newFilter);
  }, [fetchNotifications]);

  useEffect(() => {
    if (userId && role) {
      fetchNotifications(1, filter);
    }
  }, [userId, role]); 

  const unreadCount = messageNotifications.filter(n => !n.isRead).length;

  return {
    notifications: messageNotifications,
    loading: status === 'loading',
    error,
    filter,
    hasMore,
    unreadCount,
    markAsRead,
    markAllAsRead,
    toggleFilter,
    loadMore,
    refetch: () => fetchNotifications(1, filter),
  };
};
