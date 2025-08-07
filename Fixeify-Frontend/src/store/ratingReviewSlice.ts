import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createReview,
  getReviewsByPro,
  getReviewsByUser,
  RatingReviewResponse,
  PaginatedReviews,
  CreateReviewPayload,
} from "../api/ratingReviewApi";

interface RatingReviewState {
  items: RatingReviewResponse[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error?: string | null;
}

const initialState: RatingReviewState = {
  items: [],
  total: 0,
  page: 1,
  limit: 5,
  loading: false,
  error: null,
};

export const fetchReviewsByPro = createAsyncThunk<PaginatedReviews, { proId: string; page?: number }, { rejectValue: string }>(
  "ratingReview/fetchByPro",
  async ({ proId, page = 1 }, { rejectWithValue }) => {
    try {
      return await getReviewsByPro(proId, page, 5);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to load reviews");
    }
  }
);

export const fetchReviewsByUser = createAsyncThunk<PaginatedReviews, { userId: string; page?: number }, { rejectValue: string }>(
  "ratingReview/fetchByUser",
  async ({ userId, page = 1 }, { rejectWithValue }) => {
    try {
      return await getReviewsByUser(userId, page, 5);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to load reviews");
    }
  }
);

export const submitReview = createAsyncThunk<RatingReviewResponse, CreateReviewPayload, { rejectValue: string }>(
  "ratingReview/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await createReview(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to create review");
    }
  }
);

const ratingReviewSlice = createSlice({
  name: "ratingReview",
  initialState,
  reducers: {
    resetError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviewsByPro.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchReviewsByPro.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchReviewsByPro.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed";
      })
      .addCase(fetchReviewsByUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchReviewsByUser.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchReviewsByUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed";
      })
      .addCase(submitReview.pending, (state) => {
        state.loading = true;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed";
      });
  },
});

export const { resetError } = ratingReviewSlice.actions;
export default ratingReviewSlice.reducer;
