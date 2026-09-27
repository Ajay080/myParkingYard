import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Camera, Video, Play, Square, Maximize, Minimize } from "lucide-react";
import { toast } from "react-toastify";
import axios from "@/services/axiosConfig";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ManageCCTVs = () => {
  const [devices, setDevices] = useState([]);
  const [zones, setZones] = useState([]);
  const [newDevice, setNewDevice] = useState({
    name: "",
    streamUrl: "",
    zoneId: "",
  });
  const [editingDevice, setEditingDevice] = useState(null);
  const [openZoneSelect, setOpenZoneSelect] = useState(false);
  const [isStreaming, setIsStreaming] = useState({});
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [availableVideos, setAvailableVideos] = useState([]);
  const API_BASE = '/api';

  useEffect(() => {
    fetchDevices();
    fetchZones();
    fetchAvailableVideos();
  }, []);

  useEffect(() => {
    if (editingDevice) {
      setNewDevice({
        name: editingDevice.name,
        streamUrl: editingDevice.stream_url || "",
        zoneId: editingDevice.zone_id || "",
      });
    }
  }, [editingDevice]);

  const fetchDevices = async () => {
    try {
      const res = await axios.get(`${API_BASE}/devices`);
      setDevices(res.data || []);
    } catch (err) {
      console.error("Error fetching devices:", err);
      toast.error("Error fetching devices");
    }
  };

  const fetchZones = async () => {
    try {
      const res = await axios.get(`${API_BASE}/zones`);
      setZones(res.data || []);
    } catch (err) {
      console.error("Error fetching zones:", err);
      toast.error("Error fetching zones");
    }
  };

  const handleAddOrUpdate = async () => {
    const { name, streamUrl, zoneId } = newDevice;
    if (!name || !streamUrl) {
      toast.error("Name and Stream URL are required");
      return;
    }

    try {
      const payload = {
        name,
        stream_url: streamUrl,
        zone_id: zoneId || null,
        device_type: "CCTV",
        status: "Active"
      };

      if (editingDevice) {
        await axios.put(`${API_BASE}/devices/${editingDevice.id}`, payload);
        toast.success("Device updated");
      } else {
        await axios.post(`${API_BASE}/devices`, payload);
        toast.success("Device added");
      }
      
      fetchDevices();
      resetForm();
    } catch (err) {
      console.error("Error submitting form:", err);
      toast.error(err?.response?.data?.detail || "Action failed");
    }
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this device?")) return;

    try {
      await axios.delete(`${API_BASE}/devices/${id}`);
      toast.success("Device deleted");
      fetchDevices();
      if (editingDevice?.id === id) resetForm();
    } catch (err) {
      console.error("Error deleting device:", err);
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  const fetchAvailableVideos = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/video/list-available`);
      setAvailableVideos(res.data?.videos || []);
    } catch (err) {
      console.error("Error fetching available videos:", err);
    }
  };

  const handleStartStream = async (deviceId) => {
    try {
      await axios.post(`${API_BASE_URL}/api/video/start/${deviceId}`);
      setIsStreaming(prev => ({ ...prev, [deviceId]: true }));
      toast.success("Stream started");
    } catch (err) {
      console.error("Error starting stream:", err);
      toast.error("Failed to start stream");
    }
  };

  const handleStopStream = async (deviceId) => {
    try {
      await axios.post(`${API_BASE_URL}/api/video/stop/${deviceId}`);
      setIsStreaming(prev => ({ ...prev, [deviceId]: false }));
      toast.success("Stream stopped");
    } catch (err) {
      console.error("Error stopping stream:", err);
      toast.error("Failed to stop stream");
    }
  };

  const toggleFullscreen = (deviceId) => {
    setFullscreenCamera(fullscreenCamera === deviceId ? null : deviceId);
  };

  const resetForm = () => {
    setEditingDevice(null);
    setNewDevice({ name: "", streamUrl: "", zoneId: "" });
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 space-y-6">
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="live">📹 Live Feeds</TabsTrigger>
          <TabsTrigger value="manage">⚙️ Manage Cameras</TabsTrigger>
        </TabsList>

        {/* Live Feeds Tab */}
        <TabsContent value="live" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="text-blue-600" />
                Live CCTV Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="mx-auto text-6xl text-gray-300 mb-4" size={64} />
                  <p className="text-gray-500">No cameras configured. Add cameras in the Manage tab.</p>
                </div>
              ) : (
                <div className={`grid gap-4 ${fullscreenCamera ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  {devices.map((device) => (
                    <Card key={device.id} className={fullscreenCamera === device.id ? 'col-span-full' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">{device.name}</CardTitle>
                            <p className="text-xs text-gray-500">
                              {zones.find(z => z.id === device.zone_id)?.name || "No Zone"}
                            </p>
                          </div>
                          <Badge variant={isStreaming[device.id] ? "default" : "secondary"}>
                            {isStreaming[device.id] ? "🔴 Live" : "Offline"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className={`relative bg-black rounded-lg overflow-hidden ${fullscreenCamera === device.id ? 'aspect-video h-[70vh]' : 'aspect-video'}`}>
                          {isStreaming[device.id] ? (
                            <img
                              src={`${API_BASE_URL}/api/video/stream/${device.id}`}
                              alt={device.name}
                              className="w-full h-full object-contain"
                              onError={() => setIsStreaming(prev => ({ ...prev, [device.id]: false }))}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center text-gray-400">
                                <Video className="mx-auto text-4xl mb-2" size={48} />
                                <p>Stream Offline</p>
                              </div>
                            </div>
                          )}
                          
                          <button
                            onClick={() => toggleFullscreen(device.id)}
                            className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition"
                          >
                            {fullscreenCamera === device.id ? <Minimize size={16} /> : <Maximize size={16} />}
                          </button>
                        </div>
                        
                        <div className="flex gap-2">
                          {!isStreaming[device.id] ? (
                            <Button
                              onClick={() => handleStartStream(device.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <Play className="mr-2" size={14} /> Start Stream
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleStopStream(device.id)}
                              variant="destructive"
                              className="flex-1"
                              size="sm"
                            >
                              <Square className="mr-2" size={14} /> Stop Stream
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Cameras Tab */}
        <TabsContent value="manage" className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingDevice ? "Edit CCTV" : "Add New CCTV"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Camera Name"
            value={newDevice.name}
            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
          />
          <div>
            <Input
              placeholder='Enter "dummy" for simulated feed or video filename'
              value={newDevice.streamUrl}
              onChange={(e) => setNewDevice({ ...newDevice, streamUrl: e.target.value })}
            />
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-semibold text-blue-800 mb-1">💡 Quick Start:</p>
              <p className="text-blue-700">
                • Type <code className="bg-blue-100 px-1 rounded">dummy</code> for a simulated CCTV feed (perfect for testing!)
              </p>
              <p className="text-blue-700">
                • Or enter a video filename from <code className="bg-blue-100 px-1 rounded">cps_backend/app/videos/</code>
              </p>
              <p className="text-blue-700 text-xs mt-1 opacity-75">
                No real cameras needed - the system will generate a live parking lot simulation!
              </p>
            </div>
          </div>

          <Popover open={openZoneSelect} onOpenChange={setOpenZoneSelect}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {zones.find((z) => z.id === newDevice.zoneId)?.name || "Select Zone (Optional)"}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 space-y-1">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-muted rounded"
                  onClick={() => {
                    setNewDevice((prev) => ({ ...prev, zoneId: zone.id }));
                    setOpenZoneSelect(false);
                  }}
                >
                  <div className="h-4 w-4 border rounded flex items-center justify-center bg-muted">
                    {newDevice.zoneId === zone.id && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  <span>{zone.name}</span>
                </div>
              ))}
            </PopoverContent>
          </Popover>

          <div className="flex flex-col md:flex-row gap-2">
            <Button onClick={handleAddOrUpdate} className="w-full md:w-auto">
              {editingDevice ? "Update" : "Add"} Camera
            </Button>
            {editingDevice && (
              <Button variant="secondary" onClick={resetForm} className="w-full md:w-auto">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Cameras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No cameras found.</p>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className="p-3 border rounded flex flex-col md:flex-row md:justify-between md:items-center gap-3"
              >
                <div className="space-y-1">
                  <p className="font-semibold">{device.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Zone: {zones.find(z => z.id === device.zone_id)?.name || "None"}
                  </p>
                  <p className="text-sm text-muted-foreground break-all">{device.stream_url}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button variant="outline" onClick={() => handleEdit(device)}>
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => handleDelete(device.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageCCTVs;
