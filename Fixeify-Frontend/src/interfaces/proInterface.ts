export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface ProProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: ILocation;
  profilePhoto: string;
  about: string | null;
  isBanned: boolean;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  booked:boolean
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

export interface EditProProfileFormData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: LocationData;
  profilePhoto: string;
  about: string | null;
}

export interface LocationData {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}