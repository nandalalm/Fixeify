import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import chatReducer from "./chatSlice";
import ratingReviewReducer from "./ratingReviewSlice";
import ticketReducer from "./ticketSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    ratingReview: ratingReviewReducer,
    tickets: ticketReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;