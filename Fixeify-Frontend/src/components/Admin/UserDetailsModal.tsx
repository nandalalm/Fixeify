import { type FC } from "react";
import { User } from "../../pages/Admin/AdminUserManagement";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onToggleBan: (user: User) => void;
}

export const UserDetailsModal: FC<UserDetailsModalProps> = ({ isOpen, onClose, user, onToggleBan }) => {
  if (!isOpen || !user) return null;

  const location = user.address
    ? `${user.address.address}, ${user.address.city}, ${user.address.state}`
    : "N/A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/30 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User Details</h2>
        <div className="flex items-center mb-4">
          <img
            src={user.photo || "/placeholder.svg"}
            alt={user.name}
            className="h-16 w-16 rounded-full mr-4"
          />
          <div>
            <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <span className="font-medium text-gray-700">Phone Number: </span>
            <span className="text-gray-600">{user.phoneNo || "N/A"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Location: </span>
            <span className="text-gray-600">{location}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status: </span>
            <span
              className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                user.isBanned ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}
            >
              {user.isBanned ? "Banned" : "Active"}
            </span>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
          <button
            onClick={() => onToggleBan(user)}
            className="px-4 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869]"
          >
            {user.isBanned ? "Unban" : "Ban"}
          </button>
        </div>
      </div>
    </div>
  );
};