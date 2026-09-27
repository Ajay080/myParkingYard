import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Circle, Text } from "react-konva";
import axios from "@/services/axiosConfig";
import { toast } from "react-toastify";

export default function CanvasDesigner({ zone }) {
    const stageRef = useRef();
    const [spots, setSpots] = useState([]);
    const [editableVertices, setEditableVertices] = useState([]);
    const API_BASE = "/api";

    /********************************************
     * NORMALIZE ANY VERTEX FORMAT (ZONES + SPOTS)
     ********************************************/
    const normalizeVertices = (vertices) => {
        if (!vertices) return [];

        // Case 1: GeoJSON-like
        if (vertices.type && Array.isArray(vertices.coordinates)) {
            return vertices.coordinates.map(([x, y]) => ({ x, y }));
        }

        // Case 2: Object with p1, p2, p3...
        if (typeof vertices === "object" && !Array.isArray(vertices)) {
            return Object.values(vertices).map((v) => {
                if (Array.isArray(v)) return { x: v[0], y: v[1] };
                return { x: v.x, y: v.y };
            });
        }

        // Case 3: Array of [x, y]
        if (Array.isArray(vertices) && Array.isArray(vertices[0])) {
            return vertices.map(([x, y]) => ({ x, y }));
        }

        // Case 4: Array of { x, y }
        if (Array.isArray(vertices) && vertices[0]?.x !== undefined) {
            return vertices;
        }

        return [];
    };

    /***********************
     * LOAD ZONE + SPOTS
     ***********************/
    useEffect(() => {
        if (zone) {
            fetchSpots(zone.id || zone._id);
            setEditableVertices(normalizeVertices(zone.vertices));
        } else {
            setSpots([]);
            setEditableVertices([]);
        }
    }, [zone]);

    const fetchSpots = async (zoneId) => {
        try {
            const res = await axios.get(`${API_BASE}/spots`);
            const zoneSpots = res.data.filter((s) => s.zoneId === zoneId);
            setSpots(zoneSpots);
        } catch (err) {
            console.error("Failed to fetch spots:", err);
            toast.error("Failed to load spots.");
        }
    };

    /***********************
     * DRAG TO EDIT ZONE
     ***********************/
    const handleDragMove = (idx, e) => {
        const updated = [...editableVertices];
        updated[idx] = { x: e.target.x(), y: e.target.y() };
        setEditableVertices(updated);
    };

    const saveEditedZone = async () => {
        if (!zone) return;

        const payload = {
            ...zone,
            vertices: editableVertices.map(({ x, y }) => [x, y ]),
        };

        try {
            await axios.put(`${API_BASE}/zones/${zone._id}`, payload);
            toast.success("Zone updated successfully.");
        } catch (err) {
            console.error("Zone update failed:", err);
            toast.error("Failed to update zone.");
        }
    };

    /***********************
     * RESIZE CANVAS
     ***********************/
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setContainerSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    /***********************
     * RENDER CANVAS
     ***********************/
    return (
        <div ref={containerRef} className="w-full h-full relative">
            <Stage
                width={containerSize.width}
                height={containerSize.height}
                ref={stageRef}
                className="border rounded"
            >
                <Layer>
                    {/* ----------------- ZONE POLYGON ----------------- */}
                    {editableVertices.length > 1 && (
                        <>
                            <Line
                                points={editableVertices.flatMap((p) => [p.x, p.y])}
                                stroke="green"
                                closed
                                fill="rgba(0,255,0,0.2)"
                            />

                            {editableVertices.map((point, i) => (
                                <Circle
                                    key={i}
                                    x={point.x}
                                    y={point.y}
                                    radius={6}
                                    fill="green"
                                    draggable
                                    onDragMove={(e) => handleDragMove(i, e)}
                                />
                            ))}
                        </>
                    )}

                    {/* ----------------- SPOTS ----------------- */}
                    {spots.map((spot, idx) => {
                        const v = normalizeVertices(spot.vertices);

                        return (
                            <React.Fragment key={idx}>
                                <Line
                                    points={v.flatMap((p) => [p.x, p.y])}
                                    stroke="blue"
                                    closed
                                    fill="rgba(0,0,255,0.2)"
                                />
                                <Text
                                    x={v[0]?.x || 0}
                                    y={v[0]?.y || 0}
                                    text={spot.name || `Spot ${idx + 1}`}
                                    fontSize={14}
                                    fill="black"
                                />
                            </React.Fragment>
                        );
                    })}
                </Layer>
            </Stage>

            {/* SAVE BUTTON */}
            {zone && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                    <button
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
                        onClick={saveEditedZone}
                    >
                        Save Edited Zone
                    </button>
                </div>
            )}
        </div>
    );
}
