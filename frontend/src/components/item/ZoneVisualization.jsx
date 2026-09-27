import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomInIcon, ZoomOutIcon, RotateCcwIcon } from 'lucide-react';

const ZoneCanvas = ({ zone, spots, onSpotClick, selectedSpot, spotAvailability = {} }) => {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [clickTimeout, setClickTimeout] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !zone) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvasSize;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(width / 2 + panOffset.x, height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
    
    // Set up coordinate system
    const padding = 20;
    const drawWidth = width - 2 * padding;
    const drawHeight = height - 2 * padding;
    
    // Normalize zone vertices format
    let zoneVertices = zone.vertices;
    if (zoneVertices && zoneVertices.type === 'polygon' && zoneVertices.coordinates) {
      zoneVertices = zoneVertices.coordinates;
    }
    
    // Normalize spot vertices formats
    const normalizedSpots = spots.map(spot => {
      let vertices = spot.vertices;
      if (vertices && vertices.type === 'polygon' && vertices.coordinates) {
        vertices = vertices.coordinates;
      }
      return { ...spot, vertices };
    });
    
    // Calculate bounds of the zone
    const allVertices = [
      ...(zoneVertices || []),
      ...normalizedSpots.flatMap(spot => spot.vertices || [])
    ];
    
    if (allVertices.length === 0) {
      ctx.restore();
      return;
    }
    
    const minX = Math.min(...allVertices.map(v => v[0]));
    const maxX = Math.max(...allVertices.map(v => v[0]));
    const minY = Math.min(...allVertices.map(v => v[1]));
    const maxY = Math.max(...allVertices.map(v => v[1]));
    
    const scaleX = drawWidth / (maxX - minX || 1);
    const scaleY = drawHeight / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
    
    // Transform function
    const transform = (x, y) => {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      return [
        width / 2 + (x - centerX) * scale,
        height / 2 + (y - centerY) * scale
      ];
    };
    
    // Draw zone outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    
    if (zoneVertices && zoneVertices.length > 0) {
      const [startX, startY] = transform(zoneVertices[0][0], zoneVertices[0][1]);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < zoneVertices.length; i++) {
        const [x, y] = transform(zoneVertices[i][0], zoneVertices[i][1]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.stroke();
    
    // Fill zone with light blue
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fill();
    
    // Draw zone label
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(zone.name, width / 2, 30);
    
    // Draw spots (use normalized spots)
    normalizedSpots.forEach((spot, index) => {
      const vertices = spot.vertices;
      
      // Ensure vertices is an array with data
      if (!Array.isArray(vertices) || vertices.length === 0) return;
      
      // Determine spot color based on availability and status
      let fillColor, strokeColor;
      const spotIdForCheck = spot.id || spot._id;
      const isSelected = selectedSpot && (selectedSpot.id === spotIdForCheck || selectedSpot._id === spotIdForCheck);
      const availability = spotAvailability[spotIdForCheck];
      
      // Priority: availability check first, then status
      if (availability) {
        if (!availability.isAvailable) {
          // Not available for selected time
          fillColor = isSelected ? '#ef4444' : '#fee2e2';
          strokeColor = '#ef4444';
        } else {
          // Available for selected time
          fillColor = isSelected ? '#22c55e' : '#dcfce7';
          strokeColor = '#22c55e';
        }
      } else {
        // Fall back to general status if no availability data
        switch (spot.status?.toLowerCase()) {
          case 'available':
            fillColor = isSelected ? '#22c55e' : '#dcfce7';
            strokeColor = '#22c55e';
            break;
          case 'occupied':
            fillColor = isSelected ? '#ef4444' : '#fee2e2';
            strokeColor = '#ef4444';
            break;
          case 'reserved':
            fillColor = isSelected ? '#f59e0b' : '#fef3c7';
            strokeColor = '#f59e0b';
            break;
          case 'blocked':
            fillColor = isSelected ? '#6b7280' : '#f3f4f6';
            strokeColor = '#6b7280';
            break;
          default:
            fillColor = isSelected ? '#3b82f6' : '#e0f2fe';
            strokeColor = '#3b82f6';
        }
      }
      
      // Draw spot
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [5, 5] : []);
      
      ctx.beginPath();
      const [startX, startY] = transform(vertices[0][0], vertices[0][1]);
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < vertices.length; i++) {
        const [x, y] = transform(vertices[i][0], vertices[i][1]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Calculate spot center and size for click areas
      const centerX = vertices.reduce((sum, v) => sum + v[0], 0) / vertices.length;
      const centerY = vertices.reduce((sum, v) => sum + v[1], 0) / vertices.length;
      const [labelX, labelY] = transform(centerX, centerY);
      
      // Calculate spot dimensions for click area
      const minSpotX = Math.min(...vertices.map(v => v[0]));
      const maxSpotX = Math.max(...vertices.map(v => v[0]));
      const minSpotY = Math.min(...vertices.map(v => v[1]));
      const maxSpotY = Math.max(...vertices.map(v => v[1]));
      
      const [minX, minY] = transform(minSpotX, minSpotY);
      const [maxX, maxY] = transform(maxSpotX, maxSpotY);
      
      // Draw invisible click area (larger than visual spot)
      const clickPadding = 10;
      const clickArea = {
        x: Math.min(minX, maxX) - clickPadding,
        y: Math.min(minY, maxY) - clickPadding,
        width: Math.abs(maxX - minX) + 2 * clickPadding,
        height: Math.abs(maxY - minY) + 2 * clickPadding
      };
      
      // Store click area for this spot (we'll use this for click detection)
      spot._clickArea = clickArea;
      
      // Draw spot label
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(spot.name, labelX, labelY + 4);
      
      // Add status indicator
      ctx.font = '10px Arial';
      const spotIdForAvailability = spot.id || spot._id;
      const spotAvailabilityInfo = spotAvailability[spotIdForAvailability];
      const statusText = spotAvailabilityInfo 
        ? (spotAvailabilityInfo.isAvailable ? 'Available' : 'Unavailable')
        : spot.status;
      ctx.fillText(statusText, labelX, labelY + 18);
      
      // Debug: Draw click area (remove this in production)
      if (isSelected) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(clickArea.x, clickArea.y, clickArea.width, clickArea.height);
      }
    });
    
    // Restore canvas state
    ctx.restore();
    
    // Draw zoom controls and legend on top (not affected by zoom/pan)
    drawControls(ctx, width, height);
    
  }, [zone, spots, selectedSpot, spotAvailability, canvasSize, zoom, panOffset]);

  // Add wheel event listener with preventDefault capability
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelWithPrevent = (event) => {
      event.preventDefault();
      handleWheel(event);
    };

    canvas.addEventListener('wheel', handleWheelWithPrevent, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheelWithPrevent);
    };
  }, [zoom, canvasSize.width, canvasSize.height]);

  const drawControls = (ctx, width, height) => {
    // Draw legend
    const legendX = 20;
    const legendY = height - 100;
    
    ctx.fillStyle = '#f9fafb';
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.fillRect(legendX, legendY, 160, 80);
    ctx.strokeRect(legendX, legendY, 160, 80);
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Legend:', legendX + 10, legendY + 15);
    
    const legendItems = [
      { color: '#22c55e', text: 'Available' },
      { color: '#ef4444', text: 'Unavailable' },
      { color: '#3b82f6', text: 'Selected' }
    ];
    
    legendItems.forEach((item, index) => {
      const y = legendY + 30 + index * 15;
      
      // Draw color box
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 10, y - 8, 12, 10);
      ctx.strokeStyle = item.color;
      ctx.strokeRect(legendX + 10, y - 8, 12, 10);
      
      // Draw text
      ctx.fillStyle = '#374151';
      ctx.font = '11px Arial';
      ctx.fillText(item.text, legendX + 30, y);
    });

    // Draw zoom level indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(width - 120, 20, 100, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Zoom: ${Math.round(zoom * 100)}%`, width - 70, 40);
  };

  const handleCanvasClick = (event) => {
    if (isDragging) return; // Don't trigger click if we were dragging
    
    // Immediate spot selection without timeout
    handleSpotSelection(event);
  };

  const handleCanvasDoubleClick = (event) => {
    // Prevent the double-click from triggering spot selection
    event.stopPropagation();
    
    // Handle double click - zoom in at cursor position
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Zoom in and center on click point
    const newZoom = Math.min(zoom * 1.5, 3);
    const zoomFactor = newZoom / zoom;
    
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    setPanOffset(prev => ({
      x: prev.x + (centerX - x) * (zoomFactor - 1),
      y: prev.y + (centerY - y) * (zoomFactor - 1)
    }));
    
    setZoom(newZoom);
  };

  const handleSpotSelection = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || !zone || !onSpotClick) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('Click detected at:', x, y);
    
    // First, try click area detection (more reliable)
    let foundSpot = null;
    
    // Transform click coordinates to account for zoom and pan
    const { width, height } = canvasSize;
    const transformedX = (x - width / 2 - panOffset.x) / zoom + width / 2;
    const transformedY = (y - height / 2 - panOffset.y) / zoom + height / 2;
    
    console.log('Transformed click coordinates:', transformedX, transformedY);
    
    // Check click areas first (rectangular hit detection)
    for (const spot of spots) {
      if (spot._clickArea) {
        const area = spot._clickArea;
        if (transformedX >= area.x && 
            transformedX <= area.x + area.width &&
            transformedY >= area.y && 
            transformedY <= area.y + area.height) {
          foundSpot = spot;
          console.log('Spot found via click area:', spot.name, spot.id);
          break;
        }
      }
    }
    
    // Fallback to polygon detection if click area didn't work
    if (!foundSpot) {
      console.log('Click area detection failed, trying polygon detection...');
      
      // Convert click coordinates back to zone coordinates (accounting for zoom and pan)
      const padding = 20;
      
      // Calculate bounds and scale (same as in drawing)
      const allVertices = [
        ...zone.vertices,
        ...spots.flatMap(spot => spot.vertices)
      ];
      
      if (allVertices.length === 0) return;
      
      const minX = Math.min(...allVertices.map(v => v[0]));
      const maxX = Math.max(...allVertices.map(v => v[0]));
      const minY = Math.min(...allVertices.map(v => v[1]));
      const maxY = Math.max(...allVertices.map(v => v[1]));
      
      const drawWidth = width - 2 * padding;
      const drawHeight = height - 2 * padding;
      const scaleX = drawWidth / (maxX - minX || 1);
      const scaleY = drawHeight / (maxY - minY || 1);
      const scale = Math.min(scaleX, scaleY) * 0.9;
      
      // Reverse transform
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const zoneX = centerX + (transformedX - width / 2) / scale;
      const zoneY = centerY + (transformedY - height / 2) / scale;
      
      console.log('Zone coordinates:', zoneX, zoneY);
      console.log('Available spots:', spots.length);
      
      // Check each spot with enhanced detection
      let minDistance = Infinity;
      
      spots.forEach((spot, index) => {
        console.log(`Checking spot ${index + 1} (${spot.name}):`, spot.vertices);
        
        // Check if point is inside polygon
        const isInside = isPointInPolygon([zoneX, zoneY], spot.vertices);
        console.log(`  - Point inside polygon: ${isInside}`);
        
        if (isInside) {
          foundSpot = spot;
          console.log(`  - SPOT FOUND: ${spot.name}`);
          return;
        }
        
        // Also check distance to center as fallback
        const centerX = spot.vertices.reduce((sum, v) => sum + v[0], 0) / spot.vertices.length;
        const centerY = spot.vertices.reduce((sum, v) => sum + v[1], 0) / spot.vertices.length;
        const distance = Math.sqrt(Math.pow(zoneX - centerX, 2) + Math.pow(zoneY - centerY, 2));
        console.log(`  - Distance to center: ${distance}`);
        
        // Fallback: if close to center (within reasonable distance)
        const spotSize = Math.max(
          Math.max(...spot.vertices.map(v => v[0])) - Math.min(...spot.vertices.map(v => v[0])),
          Math.max(...spot.vertices.map(v => v[1])) - Math.min(...spot.vertices.map(v => v[1]))
        );
        const tolerance = spotSize * 0.7; // 70% of spot size as tolerance
        
        if (distance < tolerance && distance < minDistance) {
          minDistance = distance;
          foundSpot = spot;
          console.log(`  - FALLBACK MATCH: ${spot.name} (distance: ${distance}, tolerance: ${tolerance})`);
        }
      });
    }
    
    if (foundSpot) {
      console.log('Final spot selected:', foundSpot.name, foundSpot.id);
      onSpotClick(foundSpot);
    } else {
      console.log('No spot found at click location');
      
      // Create visual feedback for debugging
      drawClickIndicator(transformedX, transformedY);
    }
  };

  // Add visual feedback for debugging clicks
  const drawClickIndicator = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Draw a red circle at click location
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    
    // Remove the indicator after 2 seconds
    setTimeout(() => {
      // Trigger a re-render to remove the indicator
      setZoom(prev => prev);
    }, 2000);
  };

  const handleMouseDown = (event) => {
    setIsDragging(false);
    setLastMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event) => {
    if (event.buttons === 1) { // Left mouse button pressed
      const deltaX = event.clientX - lastMousePos.x;
      const deltaY = event.clientY - lastMousePos.y;
      
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        setIsDragging(true);
        setPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
      }
      
      setLastMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseUp = () => {
    // Reset dragging state after a small delay to allow click detection
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  const handleWheel = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(zoom * delta, 3));
    const zoomFactor = newZoom / zoom;
    
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    setPanOffset(prev => ({
      x: prev.x + (centerX - x) * (zoomFactor - 1),
      y: prev.y + (centerY - y) * (zoomFactor - 1)
    }));
    
    setZoom(newZoom);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.5);
    setZoom(newZoom);
  };

  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Enhanced point in polygon check with better edge case handling
  const isPointInPolygon = (point, polygon) => {
    if (!polygon || polygon.length < 3) return false;
    
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      // Check if point is on an edge (with tolerance)
      const tolerance = 0.1;
      if (isPointOnLineSegment([x, y], [xi, yi], [xj, yj], tolerance)) {
        return true;
      }
      
      // Ray casting algorithm
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Check if point is on line segment with tolerance
  const isPointOnLineSegment = (point, lineStart, lineEnd, tolerance = 0.1) => {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    
    // Calculate distance from point to line segment
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is a point
      return Math.sqrt(A * A + B * B) <= tolerance;
    }
    
    let param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= tolerance;
  };

  return (
    <div className="space-y-4">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleZoomIn}
          disabled={zoom >= 3}
        >
          <ZoomInIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
        >
          <ZoomOutIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleResetView}
        >
          <RotateCcwIcon className="h-4 w-4" />
          Reset View
        </Button>
        <span className="text-sm text-gray-600 ml-2">
          Zoom: {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p><strong>How to use:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Click and drag to pan around the zone</li>
          <li>Use mouse wheel or zoom buttons to zoom in/out</li>
          <li>Double-click to zoom in at cursor position</li>
          <li>Single-click on green spots to book them</li>
        </ul>
      </div>

      <Card className="p-4">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="border rounded cursor-pointer w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </Card>
    </div>
  );
};

export default ZoneCanvas;
