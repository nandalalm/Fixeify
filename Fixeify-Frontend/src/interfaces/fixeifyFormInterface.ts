export interface LocationData {
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  booked: boolean;
}

export interface Availability {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface Category {
  id: string;
  name: string;
  image: string;
}