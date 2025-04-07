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
    public role: "user" | "pro" | "admin" // Add "admin" role
  ) {
    if (!email || !password || !role) {
      throw new Error("Email, password, and role are required");
    }
  }
}

export class UserResponse {
  constructor(
    public name: string,
    public email: string,
    public role: "user" | "pro" | "admin" // Add "admin" role
  ) {}
}

export class LoginResponse {
  constructor(
    public accessToken: string,
    public user: UserResponse
  ) {}
}