import { UserRegistrationRequest } from "../dtos/request/userDtos";
import { CreateUserData } from "../repositories/IUserRepository";

export const mapUserDtoToModel = (dto: UserRegistrationRequest): CreateUserData => ({
  name: dto.name,
  email: dto.email,
  password: dto.password,
});