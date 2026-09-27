import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI } from "@/services/api";
import { 
  UserIcon, 
  MailIcon, 
  PhoneIcon, 
  CalendarIcon, 
  KeyIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ClockIcon
} from "lucide-react";

export default function AdminAccountPage() {
  const { user, token, updateUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (token && user) {
      fetchUserProfile();
    }
  }, [token, user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUser(token, user.id);
      
      if (response.success) {
        const userData = response.data?.data || response.data;
        setUserProfile(userData);
        setEditForm({
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
        });
      } else {
        // Show error message from API response
        const errorMessage = response.data?.error || response.data?.message || "Failed to fetch profile data";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      // Reset form when canceling
      setEditForm({
        name: userProfile?.name || "",
        email: userProfile?.email || "",
        phone: userProfile?.phone || "",
      });
    }
    setEditing(!editing);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setSaving(true);
      // Only send name and phone (email cannot be changed)
      const response = await usersAPI.updateMyProfile(token, {
        name: editForm.name,
        phone: editForm.phone,
      });
      
      if (response.success) {
        const updatedUser = response.data?.data || response.data;
        setUserProfile(updatedUser);
        setEditing(false);
        // Show success message from API
        toast.success(response.data?.message || "Profile updated successfully!");
        
        // Update auth context if needed
        if (updateUser) {
          updateUser(updatedUser);
        }
      } else {
        // Show error message from API response
        const errorMessage = response.data?.error || response.data?.message || "Failed to update profile";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    try {
      setPasswordChanging(true);
      const response = await usersAPI.changeMyPassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      
      if (response.success) {
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        // Show success message from API
        toast.success(response.data?.message || "Password changed successfully!");
      } else {
        // Show error message from API response
        const errorMessage = response.data?.error || response.data?.message || "Failed to change password";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setPasswordChanging(false);
    }
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={userProfile?.avatar} />
            <AvatarFallback className="bg-white text-blue-600 text-xl font-bold">
              {getInitials(userProfile?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Admin Account</h1>
            <p className="opacity-90">Manage your administrator profile and settings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                disabled={saving}
              >
                {editing ? (
                  <>
                    <XIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                {editing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span>{userProfile?.name || "Not set"}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <MailIcon className="h-4 w-4 text-gray-500" />
                  <span>{userProfile?.email || "Not set"}</span>
                </div>
                {editing && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              <div>
                <Label>Phone Number</Label>
                {editing ? (
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <PhoneIcon className="h-4 w-4 text-gray-500" />
                    <span>{userProfile?.phone || "Not set"}</span>
                  </div>
                )}
              </div>

              {editing && (
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="h-4 w-4 mr-1" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Role</span>
                </div>
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  Administrator
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Member Since</span>
                </div>
                <span className="text-sm text-gray-600">
                  {userProfile?.createdAt ? formatDate(userProfile.createdAt) : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Last Updated</span>
                </div>
                <span className="text-sm text-gray-600">
                  {userProfile?.updatedAt ? formatDate(userProfile.updatedAt) : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Account ID</span>
                </div>
                <span className="text-sm text-gray-600 font-mono">
                  {userProfile?._id ? userProfile._id.slice(-8).toUpperCase() : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="mt-4">
              <Button
                onClick={handlePasswordChange}
                disabled={passwordChanging}
                variant="outline"
              >
                {passwordChanging ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                    Changing...
                  </>
                ) : (
                  <>
                    <KeyIcon className="h-4 w-4 mr-1" />
                    Change Password
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Privileges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            Administrator Privileges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Zone & Spot Management</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Device Management</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Live Feed Access</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Booking Management</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Reports & Analytics</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">User Management</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
