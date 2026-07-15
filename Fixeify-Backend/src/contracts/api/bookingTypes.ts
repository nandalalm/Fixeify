export interface BookingTimeSlot {
  startTime: string;
  endTime: string;
  booked: boolean;
}

export interface BookingLocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export type BookingStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled" | "failed";
