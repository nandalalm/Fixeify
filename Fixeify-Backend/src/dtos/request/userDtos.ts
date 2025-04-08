import { UserRole } from "../../enums/roleEnum";

export class UserRegistrationRequest {
  constructor(
    public name: string,
    public email: string,
    public password: string
  ) {
    if (!name || !email || !password) {
      throw new Error("Name, email, and password are required");
    }
  }
}

export class UserLoginRequest {
  constructor(
    public email: string,
    public password: string,
    public role: UserRole
  ) {
    if (!email || !password || !role) {
      throw new Error("Email, password, and role are required");
    }
  }
}