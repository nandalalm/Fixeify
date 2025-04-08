export const TYPES = {
  DatabaseConnector: Symbol.for("DatabaseConnector"),
  IUserRepository: Symbol.for("IUserRepository"),
  IAdminRepository: Symbol.for("IAdminRepository"),
  IProRepository: Symbol.for("IProRepository"),
  AuthService: Symbol.for("AuthService"),
  AuthController: Symbol.for("AuthController"),
  AdminController: Symbol.for("AdminController"),
  ProController: Symbol.for("ProController"),
  IAdminService: Symbol.for("IAdminService"), // Add this
  IProService: Symbol.for("IProService"), // Add this
};