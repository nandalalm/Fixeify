import api from "./axios";

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
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

export const getProProfile = async (userId: string): Promise<ProProfile> => {
  const response = await api.get(`/pro/getProfile/${userId}`, { withCredentials: true });
  const proData = response.data;
  return {
    id: proData._id,
    firstName: proData.firstName,
    lastName: proData.lastName,
    email: proData.email,
    phoneNumber: proData.phoneNumber,
    location: proData.location,
    profilePhoto: proData.profilePhoto,
    about: proData.about,
    isBanned: proData.isBanned,
  };
};

export const updateProProfile = async (userId: string, data: Partial<ProProfile>): Promise<ProProfile> => {
  const response = await api.put(`/pro/updateProfile/${userId}`, data, { withCredentials: true });
  const proData = response.data;
  return {
    id: proData._id,
    firstName: proData.firstName,
    lastName: proData.lastName,
    email: proData.email,
    phoneNumber: proData.phoneNumber,
    location: proData.location,
    profilePhoto: proData.profilePhoto,
    about: proData.about,
    isBanned: proData.isBanned,
  };
};

export const changeProPassword = async (
  userId: string,
  data: { currentPassword: string; newPassword: string }
): Promise<void> => {
  await api.put(`/pro/change-password/${userId}`, data, { withCredentials: true });
};