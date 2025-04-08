import { UserRole } from "../../enums/roleEnum";

export class UserResponse {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public role: UserRole,
    public photo: string | null,
    public phoneNo: string | null,
    public address: string | null,
    public isBanned: boolean
  ) {
    this.photo = photo ?? null;
    this.phoneNo = phoneNo ?? null;
    this.address = address ?? null;
  }
}

export class LoginResponse {
  constructor(
    public accessToken: string,
    public user: UserResponse
  ) {}
}