export const TYPES = {
  DatabaseConnector: Symbol.for("DatabaseConnector"),
  IUserRepository: Symbol.for("IUserRepository"),
  IAdminRepository: Symbol.for("IAdminRepository"),
  IProRepository: Symbol.for("IProRepository"),
  AuthService: Symbol.for("AuthService"),
  AuthController: Symbol.for("AuthController"),
  AdminController: Symbol.for("AdminController"),
  ProController: Symbol.for("ProController"),
  IAdminService: Symbol.for("IAdminService"),
  IProService: Symbol.for("IProService"),
  IUserService: Symbol.for("IUserService"), // Add this
  UserController: Symbol.for("UserController"), // Add this
};