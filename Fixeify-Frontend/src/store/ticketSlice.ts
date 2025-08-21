import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { CreateTicketRequest, TicketListResponse, TicketResponse } from "../interfaces/ticketInterface";
import * as ticketApi from "../api/ticketApi";

interface TicketState {
  items: TicketResponse[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: TicketState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const fetchTicketsByComplainant = createAsyncThunk<
  TicketListResponse,
  { complainantId: string; page?: number; limit?: number }
>("tickets/fetchByComplainant", async ({ complainantId, page = 1, limit = 10 }) => {
  return await ticketApi.getTicketsByComplainant(complainantId, page, limit);
});

export const createTicket = createAsyncThunk<
  TicketResponse,
  CreateTicketRequest
>("tickets/create", async (payload) => {
  return await ticketApi.createTicket(payload);
});

const ticketSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTicketsByComplainant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTicketsByComplainant.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.tickets;
        state.total = action.payload.total;
      })
      .addCase(fetchTicketsByComplainant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch tickets";
      })
      .addCase(createTicket.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.loading = false;
        state.items = [action.payload, ...state.items];
        state.total += 1;
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create ticket";
      });
  },
});

export default ticketSlice.reducer;
