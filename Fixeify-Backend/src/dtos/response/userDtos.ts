import { UserRole } from "../../enums/roleEnum";

export class UserResponse {
  public id: string;
  public name: string;
  public email: string;
  public role: UserRole;
  public photo?: string | null;
  public phoneNo?: string | null;
  public address?: {
    address: string;
    city: string;
    state: string;
    coordinates: { type: "Point"; coordinates: [number, number] };
  } | null;
  public isBanned: boolean;

  constructor({
    id,
    name,
    email,
    role,
    photo = null,
    phoneNo = null,
    address = null,
    isBanned,
  }: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    photo?: string | null;
    phoneNo?: string | null;
    address?: { address: string; city: string; state: string; coordinates: { type: "Point"; coordinates: [number, number] } } | null;
    isBanned: boolean;
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.photo = photo;
    this.phoneNo = phoneNo;
    this.address = address;
    this.isBanned = isBanned;
  }
}

export class LoginResponse {
  constructor(
    public accessToken: string,
    public user: UserResponse
  ) {}
}