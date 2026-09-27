import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClockIcon } from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI, vehiclesAPI } from "@/services/api";
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
  CarIcon,
  PlusIcon,
  TrashIcon,
  Edit2Icon,
  CheckIcon
} from "lucide-react";

export default function AccountPage() {
  const { user, token, updateUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [userVehicles, setUserVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [updatingVehicle, setUpdatingVehicle] = useState(false);
  
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

  const [vehicleForm, setVehicleForm] = useState({
    number_plate: "",
    type: "Car",
    model: "",
  });

  const [editVehicleForm, setEditVehicleForm] = useState({
    number_plate: "",
    type: "Car",
    model: "",
  });

  useEffect(() => {
    if (token && user) {
      fetchAccountData();
    }
  }, [token, user]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      
      const [userResponse, vehiclesResponse] = await Promise.all([
        usersAPI.getMyProfile(token),
        vehiclesAPI.getUserVehicles(token, user.id)
      ]);

      // Handle user profile
      if (userResponse.success) {
        const userData = userResponse.data?.data || userResponse.data;
        setUserProfile(userData);
        setEditForm({
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
        });
      } else {
        // Show error message from API response
        const errorMessage = userResponse.data?.error || userResponse.data?.message || "Failed to fetch user profile";
        toast.error(errorMessage);
      }

      // Handle vehicles
      if (vehiclesResponse.success) {
        const vehiclesData = vehiclesResponse.data?.data || vehiclesResponse.data || [];
        setUserVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } else {
        setUserVehicles([]);
      }

    } catch (error) {
      console.error("Error fetching account data:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!vehicleForm.number_plate.trim()) {
      toast.error("Please enter vehicle number plate");
      return;
    }

    try {
      setAddingVehicle(true);
      
      const response = await vehiclesAPI.addVehicle(token, {
        user_id: user.id,
        number_plate: vehicleForm.number_plate,
        type: vehicleForm.type,
        model: vehicleForm.model,
      });

      if (response.success) {
        const newVehicle = response.data?.data || response.data;
        setUserVehicles(prev => [...prev, newVehicle]);
        setVehicleForm({
          number_plate: "",
          type: "Car",
          model: "",
        });
        setVehicleDialogOpen(false);
        toast.success("Vehicle added successfully!");
      } else {
        const errorMessage = response.data?.detail || response.data?.message || "Failed to add vehicle";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle");
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) {
      return;
    }

    try {
      const response = await vehiclesAPI.deleteVehicle(token, vehicleId);

      if (response.success) {
        setUserVehicles(prev => prev.filter(v => (v.id || v._id) !== vehicleId));
        toast.success("Vehicle deleted successfully!");
      } else {
        const errorMessage = response.data?.detail || response.data?.message || "Failed to delete vehicle";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    }
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id || vehicle._id);
    setEditVehicleForm({
      number_plate: vehicle.number_plate,
      type: vehicle.type,
      model: vehicle.model || "",
    });
  };

  const handleCancelEditVehicle = () => {
    setEditingVehicleId(null);
    setEditVehicleForm({
      number_plate: "",
      type: "Car",
      model: "",
    });
  };

  const handleUpdateVehicle = async (vehicleId) => {
    if (!editVehicleForm.number_plate.trim()) {
      toast.error("Please enter vehicle number plate");
      return;
    }

    try {
      setUpdatingVehicle(true);
      
      const response = await vehiclesAPI.updateVehicle(token, vehicleId, {
        number_plate: editVehicleForm.number_plate,
        type: editVehicleForm.type,
        model: editVehicleForm.model || null,
      });

      if (response.success) {
        const updatedVehicle = response.data?.data || response.data;
        setUserVehicles(prev => prev.map(v => 
          (v.id || v._id) === vehicleId ? updatedVehicle : v
        ));
        setEditingVehicleId(null);
        setEditVehicleForm({
          number_plate: "",
          type: "Car",
          model: "",
        });
        toast.success("Vehicle updated successfully!");
      } else {
        const errorMessage = response.data?.detail || response.data?.message || "Failed to update vehicle";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Failed to update vehicle");
    } finally {
      setUpdatingVehicle(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      
      // Use the correct API call for self-profile update
      const response = await usersAPI.updateMyProfile(token, {
        name: editForm.name,
        phone: editForm.phone,
      });

      if (response.success) {
        const updatedUser = response.data?.data || response.data;
        setUserProfile(updatedUser);
        
        // Update auth context
        updateUser(updatedUser);
        
        setEditing(false);
        toast.success("Profile updated successfully!");
      } else {
        const errorMessage = response.data?.detail || response.data?.message || "Failed to update profile";
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
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    try {
      setPasswordChanging(true);
      
      // Use the correct API call for self-password change
      const response = await usersAPI.changeMyPassword(token, {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });

      if (response.success) {
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        toast.success(response.data?.message || "Password changed successfully!");
      } else {
        const errorMessage = response.data?.detail || response.data?.message || "Failed to change password";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      // Reset form if canceling
      setEditForm({
        name: userProfile?.name || "",
        email: userProfile?.email || "",
        phone: userProfile?.phone || "",
      });
    }
    setEditing(!editing);
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'US';
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
            <h1 className="text-2xl font-bold">My Account</h1>
            <p className="opacity-90">Manage your profile and parking history</p>
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
                {editing ? (
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <MailIcon className="h-4 w-4 text-gray-500" />
                    <span>{userProfile?.email || "Not set"}</span>
                  </div>
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
                  onClick={handleUpdateProfile}
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
                  <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Role</span>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  User
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

      {/* My Vehicles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CarIcon className="h-5 w-5" />
              My Vehicles
            </CardTitle>
            <Button
              onClick={() => setVehicleDialogOpen(true)}
              size="sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Vehicle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userVehicles.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No vehicles added yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userVehicles.map((vehicle) => {
                const vehicleId = vehicle.id || vehicle._id;
                const isEditing = editingVehicleId === vehicleId;
                
                return (
                  <Card key={vehicleId} className="border">
                    <CardContent className="p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Number Plate</Label>
                            <Input
                              value={editVehicleForm.number_plate}
                              onChange={(e) => setEditVehicleForm(prev => ({ ...prev, number_plate: e.target.value.toUpperCase() }))}
                              placeholder="e.g., MH12AB1234"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Type</Label>
                            <select
                              value={editVehicleForm.type}
                              onChange={(e) => setEditVehicleForm(prev => ({ ...prev, type: e.target.value }))}
                              className="w-full p-2 rounded border mt-1"
                            >
                              <option value="Car">Car</option>
                              <option value="Bike">Bike</option>
                              <option value="EV">Electric Vehicle</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Model (Optional)</Label>
                            <Input
                              value={editVehicleForm.model}
                              onChange={(e) => setEditVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                              placeholder="e.g., Honda City"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateVehicle(vehicleId)}
                              disabled={updatingVehicle}
                              className="flex-1"
                            >
                              <CheckIcon className="h-3 w-3 mr-1" />
                              {updatingVehicle ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditVehicle}
                              disabled={updatingVehicle}
                              className="flex-1"
                            >
                              <XIcon className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CarIcon className="h-4 w-4 text-blue-600" />
                              <span className="font-bold">{vehicle.number_plate}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Type: <span className="font-medium">{vehicle.type}</span>
                            </div>
                            {vehicle.model && (
                              <div className="text-sm text-gray-600">
                                Model: <span className="font-medium">{vehicle.model}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVehicle(vehicle)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2Icon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVehicle(vehicleId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vehicle Dialog */}
      {vehicleDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Vehicle</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVehicleDialogOpen(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Number Plate *</Label>
                <Input
                  value={vehicleForm.number_plate}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, number_plate: e.target.value.toUpperCase() }))}
                  placeholder="e.g., MH12AB1234"
                />
              </div>
              <div>
                <Label>Vehicle Type *</Label>
                <select
                  value={vehicleForm.type}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 rounded border"
                >
                  <option value="Car">Car</option>
                  <option value="Bike">Bike</option>
                  <option value="EV">Electric Vehicle</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label>Model (Optional)</Label>
                <Input
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g., Honda City"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddVehicle}
                  disabled={addingVehicle}
                  className="flex-1"
                >
                  {addingVehicle ? "Adding..." : "Add Vehicle"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setVehicleDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
