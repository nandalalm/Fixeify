"use client";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Home, Edit, Lock } from "lucide-react";
import { getUserProfile } from "@/api/userApi";
import { updateUser } from "@/store/authSlice";

interface ProfileInfoProps {
  onEdit: () => void;
  onChangePassword: () => void;
}

const ProfileInfo = ({ onEdit, onChangePassword }: ProfileInfoProps) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch latest profile details (e.g., updated Google photo) on mount and when user.id changes
  useEffect(() => {
    const syncLatestProfile = async () => {
      try {
        if (!user?.id) return;
        const latest = await getUserProfile(user.id);
        // Merge conservatively to preserve auth-critical fields
        dispatch(
          updateUser({
            ...user,
            name: (latest as any)?.name ?? user.name,
            email: (latest as any)?.email ?? user.email,
            phoneNo: (latest as any)?.phoneNo ?? user.phoneNo,
            address: (latest as any)?.address ?? user.address,
            photo: (latest as any)?.photo ?? user.photo,
            isBanned: (latest as any)?.isBanned ?? user.isBanned,
          })
        );
      } catch (e) {
        // Non-blocking: fail silently to avoid disrupting profile view
        console.warn("Failed to refresh latest user profile", e);
      }
    };
    syncLatestProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    navigate("/login");
    return null;
  }


  return (
    <div className="flex-1 p-6 md:p-10 mb-[70px] mt-5">
      <h1 className="text-3xl font-bold mb-8 text-center dark:text-gray-200">Profile Info</h1>

      <div className="flex flex-col items-center">
        {/* Profile Image */}
        <div className="w-32 h-32 rounded-full overflow-hidden mb-8">
          <img
            src={user.photo || "/placeholder.svg?height=128&width=128"}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if URL is invalid; avoids broken image until refresh completes
              (e.currentTarget as HTMLImageElement).src = "/placeholder.svg?height=128&width=128";
            }}
          />
        </div>

        {/* Profile Information */}
        <div className="w-full max-w-md space-y-6">
          {/* Full Name */}
          <div className="flex items-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</h3>
              <p className="text-gray-900 dark:text-gray-200">{user.name || "John Doe"}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
              <p className="text-gray-900 dark:text-gray-200">{user.email || "johndoe@gmail.com"}</p>
            </div>
          </div>

          {/* Mobile Phone */}
          <div className="flex items-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
              <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Mobile Phone</h3>
              <p className="text-gray-900 dark:text-gray-200">{user.phoneNo || "Update your phone no."}</p>
            </div>
          </div>

          {/* Location & Address */}
          <div className="flex items-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
              <Home className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Location & Address</h3>
              <p className="text-gray-900 dark:text-gray-200">{user.address?.address || "Update your address"}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={onEdit}
              className="flex-1 bg-[#032B44] text-white py-3 px-6 rounded-md hover:bg-[#054869] transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={onChangePassword}
              className="flex-1 bg-white dark:bg-gray-800 border border-[#032B44] text-[#032B44] hover:bg-[#032B44] hover:text-white hover:border-white dark:text-gray-200 dark:border-gray-600 py-3 px-6 rounded-md dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 hover:text-white" />
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;