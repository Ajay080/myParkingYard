import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Stage, Layer, Line, Circle } from "react-konva";
import axios from "@/services/axiosConfig";
import { toast } from "react-toastify";

export default function ZoneModal({ zone, onClose }) {
  const API_BASE = '/api';
  const [zoneForm, setZoneForm] = useState({ name: "", description: "" });
  const [points, setPoints] = useState([]);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef();
  const canvasContainerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const isCreateMode = !zone || Object.keys(zone).length === 0;

  // Resize canvas on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        setCanvasSize({
          width: canvasContainerRef.current.offsetWidth,
          height: canvasContainerRef.current.offsetHeight,
        });
      }
    };
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Load zone data
  useEffect(() => {
    if (zone && zone.id) {
      // Edit mode
      setZoneForm({ 
        name: zone.name || "", 
        description: zone.description || "" 
      });
      if (zone.vertices && zone.vertices.length > 0) {
        setPoints(zone.vertices.map(([x, y]) => ({ x, y })));
      } else {
        setPoints([]);
      }
    } else {
      // Create mode
      setZoneForm({ name: "", description: "" });
      setPoints([]);
    }
  }, [zone]);

  const handleCanvasClick = (e) => {
    if (e.target === e.target.getStage()) {
      const pointer = stageRef.current.getStage().getPointerPosition();
      if (pointer) {
        setPoints((prev) => [...prev, pointer]);
      }
    }
  };

  const handleDragMove = (e, index) => {
    const updated = [...points];
    updated[index] = { x: e.target.x(), y: e.target.y() };
    setPoints(updated);
  };

  const clearPoints = () => {
    setPoints([]);
  };

  const removeLastPoint = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleSave = async () => {
    if (!zoneForm.name.trim()) {
      toast.error("Zone name is required.");
      return;
    }

    if (points.length < 3) {
      toast.error("Zone must have at least 3 points to form a valid area.");
      return;
    }

    const payload = {
      name: zoneForm.name.trim(),
      description: zoneForm.description.trim(),
      vertices: points.map((p) => [p.x, p.y]),
    };

    try {
      setSaving(true);
      if (zone && zone.id) {
        // Edit mode
        await axios.put(`${API_BASE}/zones/${zone.id}`, payload);
        toast.success("Zone updated successfully!");
      } else {
        // Create mode
        await axios.post(`${API_BASE}/zones`, payload);
        toast.success("Zone created successfully!");
      }
      onClose();
    } catch (err) {
      console.error("Failed to save zone:", err);
      toast.error("Failed to save zone: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-100">
        <h2 className="text-lg font-semibold">
          {isCreateMode ? "Create New Zone" : `Edit Zone: ${zone.name}`}
        </h2>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Form Panel */}
        <div className="w-full md:w-1/3 p-4 space-y-4 overflow-y-auto border-b md:border-b-0 md:border-r bg-white">
          <div>
            <label className="block text-sm font-medium mb-1">Zone Name *</label>
            <input
              type="text"
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter zone name"
              value={zoneForm.name}
              onChange={(e) =>
                setZoneForm({ ...zoneForm, name: e.target.value })
              }
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter zone description (optional)"
              rows={4}
              value={zoneForm.description}
              onChange={(e) =>
                setZoneForm({ ...zoneForm, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Drawing Instructions:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Click on the canvas to add points</li>
              <li>• Drag points to adjust position</li>
              <li>• Need at least 3 points to create a zone</li>
              <li>• Points will automatically connect to form a polygon</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              Points: {points.length} {points.length >= 3 ? "✓" : "(need " + (3 - points.length) + " more)"}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={removeLastPoint}
                disabled={points.length === 0}
                className="flex-1"
              >
                Remove Last
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearPoints}
                disabled={points.length === 0}
                className="flex-1"
              >
                Clear All
              </Button>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={saving || !zoneForm.name.trim() || points.length < 3}
          >
            {saving ? "Saving..." : (isCreateMode ? "Create Zone" : "Update Zone")}
          </Button>
        </div>

        {/* Canvas Panel */}
        <div
          ref={canvasContainerRef}
          className="flex-1 relative overflow-hidden bg-gray-50"
        >
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow text-xs z-10">
            Click to add points • Drag to move points
          </div>
          
          <Stage
            width={canvasSize.width}
            height={canvasSize.height}
            ref={stageRef}
            onClick={handleCanvasClick}
            className="block cursor-crosshair"
          >
            <Layer>
              {/* Polygon */}
              {points.length > 1 && (
                <Line
                  points={points.flatMap((p) => [p.x, p.y])}
                  stroke="#22c55e"
                  strokeWidth={2}
                  closed={points.length > 2}
                  fill="rgba(34, 197, 94, 0.2)"
                />
              )}

              {/* Vertices */}
              {points.map((point, i) => (
                <Circle
                  key={i}
                  x={point.x}
                  y={point.y}
                  radius={8}
                  fill="#22c55e"
                  stroke="white"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e) => handleDragMove(e, i)}
                  onMouseEnter={(e) => {
                    e.target.getStage().container().style.cursor = 'move';
                  }}
                  onMouseLeave={(e) => {
                    e.target.getStage().container().style.cursor = 'crosshair';
                  }}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
