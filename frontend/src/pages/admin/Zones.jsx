import React, { useEffect, useState } from "react";
import axios from "@/services/axiosConfig";
import { Button } from "@/components/ui/button";
import CanvasDesigner from "./CanvasDesigner";
import ZoneModal from "./ZoneModal";
import SpotManager from "./SpotManager";
import { toast } from "react-toastify";

export default function MultiZoneDesigner() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [isManagingSpots, setIsManagingSpots] = useState(false);
  const [loading, setLoading] = useState(true);
  const API_BASE = '/api';

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/zones`);
      setZones(res.data || []); // FastAPI returns array directly
    } catch (error) {
      console.error("Failed to fetch zones:", error);
      toast.error("Failed to fetch zones.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    console.log('Creating new zone');
    setEditingZone({}); // Empty object indicates creating a new zone
    setSelectedZone(null);
    setIsManagingSpots(false);
  };

  const handleEdit = (zone) => {
    console.log('Editing zone:', zone);
    setEditingZone(zone);
    setSelectedZone(null);
    setIsManagingSpots(false);
  };

  const handleDelete = async (zoneId) => {
    if (!confirm('Are you sure you want to delete this zone? This will also delete all spots in this zone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/zones/${zoneId}`);
      if (selectedZone?.id === zoneId) {
        setSelectedZone(null);
        setIsManagingSpots(false);
      }
      toast.success("Zone deleted successfully!");
      fetchZones();
    } catch (error) {
      console.error("Failed to delete zone:", error);
      toast.error("Failed to delete zone: " + (error.response?.data?.error || error.message));
    }
  };

  const handleZoneFormClose = () => {
    console.log('Zone form closing');
    setEditingZone(null);
    fetchZones();
  };

  const handleManageSpots = (zone) => {
    console.log('Managing spots for zone:', zone);
    setSelectedZone(zone);
    setEditingZone(null);
    setIsManagingSpots(true);
  };

  const handleSpotManagerClose = () => {
    console.log('Spot manager closing');
    setIsManagingSpots(false);
    setSelectedZone(null);
    fetchZones();
  };

  const handleViewZone = (zone) => {
    console.log('Viewing zone:', zone);
    setSelectedZone(zone);
    setEditingZone(null);
    setIsManagingSpots(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading zones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Sidebar */}
      <div className="w-full md:w-1/4 max-h-[40vh] md:max-h-screen border-r p-4 space-y-4 overflow-y-auto bg-white">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Zones ({zones.length})</h2>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            + Create Zone
          </Button>
        </div>
        
        {zones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No zones created yet.</p>
            <p className="text-sm">Click "Create Zone" to get started.</p>
          </div>
        ) : (
          zones.map((zone) => (
            <div key={zone.id} className="p-3 border rounded-lg space-y-3 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div 
                className="cursor-pointer"
                onClick={() => handleViewZone(zone)}
              >
                <div className="font-medium text-gray-900">{zone.name}</div>
                <div className="text-sm text-gray-600">{zone.description || 'No description'}</div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEdit(zone)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleDelete(zone.id)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleManageSpots(zone)}
                  className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  Manage Spots
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Panel */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {editingZone !== null ? (
          <ZoneModal 
            key={editingZone?.id || "new"} 
            zone={editingZone} 
            onClose={handleZoneFormClose} 
          />
        ) : selectedZone && isManagingSpots ? (
          <SpotManager 
            zone={selectedZone} 
            onClose={handleSpotManagerClose}
          />
        ) : selectedZone ? (
          <CanvasDesigner zone={selectedZone} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-center px-4">
            <div className="max-w-md">
              <div className="text-6xl mb-4">🏗️</div>
              <h3 className="text-xl font-semibold mb-2">Zone Management</h3>
              <p className="mb-4">
                Create zones and manage parking spots for your parking system.
              </p>
              <div className="space-y-2 text-left">
                <p className="text-sm">• Click a zone to view its layout</p>
                <p className="text-sm">• Use "Edit" to modify zone boundaries</p>
                <p className="text-sm">• Use "Manage Spots" to create parking spots within a zone</p>
                <p className="text-sm">• Create new zones with the "+ Create Zone" button</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

