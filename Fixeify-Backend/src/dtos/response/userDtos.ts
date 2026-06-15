import type { UserRole } from "../../enums/roleEnum";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string | null;
  phoneNo?: string | null;
  address?: {
    address: string;
    city: string;
    state: string;
    coordinates: { type: "Point"; coordinates: [number, number] };
  } | null;
  isBanned: boolean;
  createdAt?: Date;
}

export class LoginResponse {
  constructor(
    public accessToken: string,
    public user: UserResponse
  ) {}
}
