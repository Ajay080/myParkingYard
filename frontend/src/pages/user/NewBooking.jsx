import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import QRCode from "react-qr-code";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI, bookingsAPI, vehiclesAPI } from "@/services/api";

export default function MyAccount() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [myBookings, setMyBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    licensePlate: "",
    model: "",
    color: "",
    type: "car"
  });

  useEffect(() => {
    if (token && user) {
      fetchAccountData();
    }
  }, [token, user]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile, bookings, and vehicles
      const [userResponse, bookingsResponse, vehiclesResponse] = await Promise.all([
        usersAPI.getUser(token, user.id),
        bookingsAPI.getBookings(token, { user_id: user.id }),
        vehiclesAPI.getUserVehicles(token, user.id)
      ]);

      if (userResponse.success) {
        setProfile(userResponse.data);
      } else {
        toast.error("Failed to fetch profile data");
      }

      if (bookingsResponse.success) {
        setMyBookings(bookingsResponse.data);
      } else {
        toast.error("Failed to fetch bookings");
      }

      if (vehiclesResponse.success) {
        setVehicles(vehiclesResponse.data);
      } else {
        toast.error("Failed to fetch vehicles");
      }

    } catch (error) {
      console.error("Error fetching account data:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await usersAPI.updateUser(token, user.id, profile);
      
      if (response.success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.licensePlate || !newVehicle.model) {
      toast.error("Please fill in license plate and model");
      return;
    }

    try {
      const vehicleData = {
        ...newVehicle,
        user_id: user.id
      };

      const response = await vehiclesAPI.addVehicle(token, vehicleData);
      
      if (response.success) {
        toast.success("Vehicle added successfully!");
        setNewVehicle({ licensePlate: "", model: "", color: "", type: "car" });
        fetchAccountData(); // Refresh data
      } else {
        toast.error(response.data.message || "Failed to add vehicle");
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle");
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      const response = await vehiclesAPI.deleteVehicle(token, vehicleId);
      
      if (response.success) {
        toast.success("Vehicle deleted successfully!");
        fetchAccountData(); // Refresh data
      } else {
        toast.error(response.data.message || "Failed to delete vehicle");
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    }
  };

  const handleCancel = async (id, fromTime) => {
    if (new Date(fromTime) <= new Date()) {
      toast.error("Cannot cancel past bookings");
      return;
    }

    try {
      const response = await bookingsAPI.updateBookingStatus(token, id, 'cancelled');
      
      if (response.success) {
        toast.success("Booking cancelled successfully!");
        fetchAccountData(); // Refresh data
      } else {
        toast.error(response.data.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading account data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Account</h1>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Profile Info
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              readOnly={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              readOnly={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              readOnly={!isEditing}
            />
          </div>
          {isEditing && (
            <div className="sm:col-span-2">
              <Button onClick={handleUpdateProfile}>
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicles Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add New Vehicle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
              <Input
                placeholder="License Plate"
                value={newVehicle.licensePlate}
                onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
              />
              <Input
                placeholder="Model"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
              />
              <Input
                placeholder="Color"
                value={newVehicle.color}
                onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
              />
              <Button onClick={handleAddVehicle}>Add Vehicle</Button>
            </div>

            {/* Vehicle List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{vehicle.licensePlate}</h3>
                  <p className="text-sm text-gray-600">{vehicle.model}</p>
                  <p className="text-sm text-gray-600">{vehicle.color}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Spot</th>
                <th className="p-2 border">Zone</th>
                <th className="p-2 border">Vehicle</th>
                <th className="p-2 border">From</th>
                <th className="p-2 border">To</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">QR</th>
                <th className="p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {myBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="p-2 border text-center">{booking.spot?.name || booking.spot?.number || booking.spotId}</td>
                  <td className="p-2 border text-center">{booking.spot?.zone?.name || 'N/A'}</td>
                  <td className="p-2 border text-center">{booking.vehicle?.licensePlate || 'N/A'}</td>
                  <td className="p-2 border text-center">{new Date(booking.fromTime).toLocaleString('en-US', { 
                    year: 'numeric', month: '2-digit', day: '2-digit', 
                    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                  })}</td>
                  <td className="p-2 border text-center">{new Date(booking.toTime).toLocaleString('en-US', { 
                    year: 'numeric', month: '2-digit', day: '2-digit', 
                    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                  })}</td>
                  <td className="p-2 border text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="p-2 border text-center">
                    <QRCode value={JSON.stringify({
                      bookingId: booking.id,
                      spotId: booking.spotId,
                      userId: booking.userId,
                      fromTime: booking.fromTime,
                      toTime: booking.toTime
                    })} size={48} />
                  </td>
                  <td className="p-2 border text-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(booking.id, booking.fromTime)}
                      disabled={booking.status === 'cancelled' || booking.status === 'completed'}
                    >
                      {booking.status === 'cancelled' ? 'Cancelled' : 'Cancel'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
