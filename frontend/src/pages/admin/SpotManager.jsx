import React, { useEffect, useRef, useState } from "react";
import axios from "@/services/axiosConfig";
import { Button } from "@/components/ui/button";
import { Stage, Layer, Line, Circle, Text } from "react-konva";
import { toast } from "react-toastify";

export default function SpotManager({ zone, onClose }) {
  const API_BASE = '/api';
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [spotName, setSpotName] = useState("");
  const [vertices, setVertices] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const stageRef = useRef();
  const containerRef = useRef();

  // Update canvas size on resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width || 800,
          height: rect.height || 600
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Auto-center on zone when component loads
  useEffect(() => {
    if (zone && zone.vertices && zone.vertices.length > 0 && canvasSize.width > 0) {
      setTimeout(centerOnZone, 100); // Small delay to ensure canvas is ready
    }
  }, [zone, canvasSize]);

  // Fetch spots for the zone
  useEffect(() => {
    async function fetchSpots() {
      try {
        setLoading(true);
        console.log('Fetching spots for zone:', zone.id);
        const res = await axios.get(`${API_BASE}/spots?zone_id=${zone.id}`);
        console.log('Spots response:', res.data);
        setSpots(res.data || []);
      } catch (err) {
        console.error("Error loading spots:", err);
        toast.error("Failed to load spots: " + (err.response?.data?.detail || err.message));
        setSpots([]);
      } finally {
        setLoading(false);
      }
    }
    
    if (zone && zone.id) {
      fetchSpots();
    }
  }, [zone]);

  // Check if a point is inside the zone polygon
  const isPointInZone = (point) => {
    if (!zone.vertices || zone.vertices.length < 3) return true; // No zone boundary, allow anywhere
    
    const { x, y } = point;
    const vertices = zone.vertices;
    let inside = false;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const [xi, yi] = vertices[i];
      const [xj, yj] = vertices[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Handle zoom functionality
  const handleWheel = (e) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePos = stage.getPointerPosition();
    
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Limit zoom range
    const clampedScale = Math.max(0.3, Math.min(3, newScale));
    
    setScale(clampedScale);
    
    // Calculate new position to zoom towards mouse
    const mousePointTo = {
      x: (mousePos.x - stage.x()) / oldScale,
      y: (mousePos.y - stage.y()) / oldScale,
    };
    
    const newPos = {
      x: mousePos.x - mousePointTo.x * clampedScale,
      y: mousePos.y - mousePointTo.y * clampedScale,
    };
    
    setPosition(newPos);
  };

  // Reset zoom and position
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Center view on zone
  const centerOnZone = () => {
    if (!zone.vertices || zone.vertices.length === 0) return;
    
    // Calculate zone bounds
    const xs = zone.vertices.map(v => v[0]);
    const ys = zone.vertices.map(v => v[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const zoneWidth = maxX - minX;
    const zoneHeight = maxY - minY;
    const zoneCenterX = (minX + maxX) / 2;
    const zoneCenterY = (minY + maxY) / 2;
    
    // Calculate scale to fit zone in canvas with some padding
    const padding = 50;
    const scaleX = (canvasSize.width - padding * 2) / zoneWidth;
    const scaleY = (canvasSize.height - padding * 2) / zoneHeight;
    const newScale = Math.min(scaleX, scaleY, 2); // Don't zoom in too much
    
    // Calculate position to center the zone
    const newPos = {
      x: canvasSize.width / 2 - zoneCenterX * newScale,
      y: canvasSize.height / 2 - zoneCenterY * newScale,
    };
    
    setScale(newScale);
    setPosition(newPos);
  };

  const startNewSpot = () => {
    setSelectedSpot(null);
    setSpotName("");
    setVertices([]);
  };

  const selectSpot = (spot) => {
    setSelectedSpot(spot);
    setSpotName(spot.name);
    
    // Normalize vertices format - handle both array and object formats
    let vertices = spot.vertices;
    if (vertices && vertices.type === 'polygon' && vertices.coordinates) {
      vertices = vertices.coordinates;
    }
    
    setVertices(vertices.map(([x, y]) => ({ x, y })));
  };

  const deleteSpot = async (id) => {
    if (!confirm('Are you sure you want to delete this spot?')) {
      return;
    }

    try {
      console.log('Deleting spot:', id);
      await axios.delete(`${API_BASE}/spots/${id}`);
      setSpots(spots.filter((s) => s._id !== id));
      startNewSpot();
      toast.success("Spot deleted successfully!");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Error deleting spot: " + (err.response?.data?.error || err.message));
    }
  };

  const handleCanvasClick = (e) => {
    // Prevent adding points if we're dragging a vertex
    if (isDraggingVertex) {
      return;
    }
    
    const stage = e?.target?.getStage() || stageRef.current?.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    // Allow clicks on Stage, Layer, or the background
    const target = e.target;
    const targetClass = target.getClassName();
    
    // Don't add points if clicking on existing shapes (spots, vertices, etc.)
    if (targetClass === 'Circle' || targetClass === 'Text') {
      return;
    }
    
    // Don't add points if clicking on existing spot lines
    if (targetClass === 'Line' && target.attrs.stroke !== '#ef4444') {
      // Allow clicks on zone boundary (red line) but not on spot lines
      return;
    }
    
    console.log('Canvas clicked:', {
      targetClass,
      pos,
      scale,
      position
    });
    
    // Transform the click position based on current scale and position
    const transformedPos = {
      x: (pos.x - position.x) / scale,
      y: (pos.y - position.y) / scale,
    };
    
    // Check if the point is inside the zone
    if (!isPointInZone(transformedPos)) {
      toast.error("⚠️ Spots must be created within the zone boundary!");
      return;
    }
    
    console.log('Adding vertex at:', transformedPos);
    setVertices((prev) => [...prev, transformedPos]);
  };

  const dragVertex = (i, e) => {
    const newPos = { x: e.target.x(), y: e.target.y() };
    
    // Check if the dragged position is inside the zone
    if (!isPointInZone(newPos)) {
      toast.error("⚠️ Spot vertices must stay within the zone boundary!");
      return;
    }
    
    const newVerts = [...vertices];
    newVerts[i] = newPos;
    setVertices(newVerts);
  };

  const removeLastVertex = () => {
    setVertices(prev => prev.slice(0, -1));
  };

  const clearVertices = () => {
    setVertices([]);
  };

  const saveSpot = async () => {
    if (!spotName.trim()) {
      toast.error("Spot name is required");
      return;
    }

    if (vertices.length < 3) {
      toast.error("Spot must have at least 3 points to form a valid area");
      return;
    }

    const payload = {
      name: spotName.trim(),
      zone_id: zone.id,
      vertices: vertices.map((v) => [v.x, v.y]),
    };

    console.log('Saving spot with payload:', payload);

    try {
      setSaving(true);
      let response;
      if (selectedSpot) {
        console.log('Updating spot:', selectedSpot.id);
        response = await axios.put(`${API_BASE}/spots/${selectedSpot.id}`, payload);
        toast.success("Spot updated successfully!");
      } else {
        console.log('Creating new spot');
        response = await axios.post(`${API_BASE}/spots`, payload);
        toast.success("Spot created successfully!");
      }
      console.log('Save response:', response.data);
      
      // Refresh spots list
      const res = await axios.get(`${API_BASE}/spots?Search=&zone_id=${zone.id}`);
      console.log('Refreshed spots:', res.data);
      setSpots(res.data || []);
      startNewSpot();
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Error saving spot: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading spots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold">Manage Spots</h2>
          <p className="text-sm text-gray-600">Zone: {zone.name} • {spots.length} spots</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to Zones
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar */}
        <div className="md:w-1/4 w-full p-4 border-b md:border-b-0 md:border-r overflow-y-auto bg-gray-50 max-h-[300px] md:max-h-full">
          <div className="space-y-3">
            <Button 
              onClick={startNewSpot} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              + Create New Spot
            </Button>
            
            {spots.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No spots created yet.</p>
                <p className="text-xs">Click "Create New Spot" to get started.</p>
              </div>
            ) : (
              spots.map((spot) => (
                <div key={spot._id} className="border p-3 rounded shadow-sm bg-white">
                  <div className="font-medium text-gray-900">{spot.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Status: {spot.status || 'Available'}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => selectSpot(spot)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => deleteSpot(spot._id)}
                      className="flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 relative flex flex-col bg-white overflow-hidden">
          {/* Spot Form */}
          <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter spot name"
                value={spotName}
                onChange={(e) => setSpotName(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={saveSpot}
                disabled={saving || !spotName.trim() || vertices.length < 3}
                className="flex-1 sm:flex-none"
              >
                {saving ? "Saving..." : (selectedSpot ? "Update Spot" : "Create Spot")}
              </Button>
              <Button
                onClick={startNewSpot}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Drawing Instructions */}
          <div className="px-4 py-2 bg-blue-50 border-b text-sm">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="text-blue-700">
                {vertices.length === 0 && "💡 Click anywhere within the zone boundary to start drawing a parking spot"}
                {vertices.length > 0 && vertices.length < 3 && `${vertices.length} points added (need ${3 - vertices.length} more to create a spot)`}
                {vertices.length >= 3 && `${vertices.length} points - Ready to save! Click 'Create Spot' button`}
              </div>
              
              {vertices.length > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={removeLastVertex}>
                    Remove Last
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearVertices}>
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="px-4 py-2 bg-green-50 border-b text-xs">
            <div className="flex items-center justify-between">
              <div className="text-green-700 flex items-center gap-4">
                <span>🔍 Zoom: {Math.round(scale * 100)}%</span>
                <span>📍 Use mouse wheel to zoom, drag to pan</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setScale(s => Math.min(3, s * 1.2))}>
                  Zoom In
                </Button>
                <Button size="sm" variant="outline" onClick={() => setScale(s => Math.max(0.3, s / 1.2))}>
                  Zoom Out
                </Button>
                <Button size="sm" variant="outline" onClick={resetView}>
                  Reset View
                </Button>
                <Button size="sm" variant="outline" onClick={centerOnZone}>
                  Center Zone
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden bg-gray-100"
          >
            <Stage
              ref={stageRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="block border"
              scaleX={scale}
              scaleY={scale}
              x={position.x}
              y={position.y}
              onWheel={handleWheel}
              onClick={handleCanvasClick}
              draggable={!isDraggingVertex}
              onDragEnd={(e) => {
                setPosition({
                  x: e.target.x(),
                  y: e.target.y(),
                });
              }}
              onMouseEnter={() => {
                document.body.style.cursor = 'crosshair';
              }}
              onMouseLeave={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <Layer onClick={handleCanvasClick}>
                {/* Zone boundary - highlighted */}
                {zone.vertices?.length > 1 && (
                  <Line
                    points={zone.vertices.flat()}
                    stroke="#ef4444"
                    strokeWidth={3}
                    closed
                    fill="rgba(239, 68, 68, 0.1)"
                    dash={[8, 4]}
                  />
                )}

                {/* Zone boundary label */}
                {zone.vertices?.length > 1 && (
                  <Text
                    text={`Zone: ${zone.name}`}
                    x={zone.vertices[0][0]}
                    y={zone.vertices[0][1] - 30}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#ef4444"
                  />
                )}

                {/* Existing spots */}
                {spots.map((spot) => {
                  // Normalize vertices format
                  let vertices = spot.vertices;
                  if (vertices && vertices.type === 'polygon' && vertices.coordinates) {
                    vertices = vertices.coordinates;
                  }
                  
                  if (!Array.isArray(vertices) || vertices.length === 0) {
                    return null;
                  }
                  
                  const spotId = spot.id || spot._id;
                  const selectedSpotId = selectedSpot?.id || selectedSpot?._id;
                  const isSelected = selectedSpotId === spotId;
                  
                  return (
                    <React.Fragment key={spotId}>
                      <Line
                        points={vertices.flat()}
                        stroke={isSelected ? "#dc2626" : "#22c55e"}
                        strokeWidth={isSelected ? 3 : 2}
                        closed
                        fill={isSelected ? "rgba(220, 38, 38, 0.3)" : "rgba(34, 197, 94, 0.3)"}
                        opacity={isSelected ? 1 : 0.7}
                      />
                      <Text
                        text={spot.name}
                        x={vertices[0][0]}
                        y={vertices[0][1] - 25}
                        fontSize={12}
                        fontStyle="bold"
                        fill={isSelected ? "#dc2626" : "#22c55e"}
                      />
                    </React.Fragment>
                  );
                })}

                {/* Current spot being drawn (blue) */}
                {vertices.length > 1 && (
                  <Line
                    points={vertices.flatMap((v) => [v.x, v.y])}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    closed={vertices.length > 2}
                    fill="rgba(59, 130, 246, 0.3)"
                  />
                )}
                
                {/* Vertex points for current spot */}
                {vertices.map((p, i) => (
                  <Circle
                    key={i}
                    x={p.x}
                    y={p.y}
                    radius={8}
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth={2}
                    draggable
                    onDragMove={(e) => dragVertex(i, e)}
                    onDragStart={() => {
                      setIsDraggingVertex(true);
                    }}
                    onDragEnd={() => {
                      setIsDraggingVertex(false);
                    }}
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
    </div>
  );
}
