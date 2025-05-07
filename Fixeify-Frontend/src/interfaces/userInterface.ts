export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: {
    address: string;
    city: string;
    state: string;
    coordinates: { type: "Point"; coordinates: [number, number] };
  } | null;
  photo?: string | null;
}
