import React from "react";
import { Circle, Line, Group } from "react-konva";

export default function PolygonEditor({ vertices, setVertices, scale = 1, unit = "pixels" }) {
  // Add a new vertex between vertices[edgeIndex] and vertices[edgeIndex+1]
  const addVertex = (edgeIndex) => {
    const newVertex = {
      x: (vertices[edgeIndex].x + vertices[(edgeIndex + 1) % vertices.length].x) / 2,
      y: (vertices[edgeIndex].y + vertices[(edgeIndex + 1) % vertices.length].y) / 2,
    };
    const newVertices = [...vertices];
    newVertices.splice(edgeIndex + 1, 0, newVertex);
    setVertices(newVertices);
  };

  // Delete vertex at index (only if > 3 vertices)
  const deleteVertex = (index) => {
    if (vertices.length <= 3) return; // minimum polygon vertices
    const newVertices = vertices.filter((_, i) => i !== index);
    setVertices(newVertices);
  };

  // Update vertex position when dragged
  const onDragMove = (index, e) => {
    const pos = e.target.position();
    const newVertices = [...vertices];
    newVertices[index] = { x: pos.x, y: pos.y };
    setVertices(newVertices);
  };

  // Calculate midpoints of edges
  const midpoints = vertices.map((point, i) => {
    const nextIndex = (i + 1) % vertices.length;
    const nextPoint = vertices[nextIndex];
    return {
      x: (point.x + nextPoint.x) / 2,
      y: (point.y + nextPoint.y) / 2,
      edgeIndex: i,
    };
  });

  return (
    <Group>
      {/* Polygon lines */}
      <Line
        points={vertices.flatMap((v) => [v.x, v.y])}
        closed
        stroke="blue"
        strokeWidth={2 / scale}
      />

      {/* Vertices */}
      {vertices.map((vertex, i) => (
        <Circle
          key={"vertex" + i}
          x={vertex.x}
          y={vertex.y}
          radius={8 / scale}
          fill="red"
          stroke="black"
          strokeWidth={1 / scale}
          draggable
          onDragMove={(e) => onDragMove(i, e)}
          onContextMenu={(e) => {
            e.evt.preventDefault(); // prevent native context menu
            deleteVertex(i);
          }}
          onMouseEnter={(e) => {
            e.target.getStage().container().style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            e.target.getStage().container().style.cursor = "default";
          }}
        />
      ))}

      {/* Midpoints for adding vertices */}
      {midpoints.map((mid, i) => (
        <Circle
          key={"midpoint" + i}
          x={mid.x}
          y={mid.y}
          radius={6 / scale}
          fill="green"
          opacity={0.5}
          onClick={() => addVertex(mid.edgeIndex)}
          onMouseEnter={(e) => {
            e.target.getStage().container().style.cursor = "crosshair";
          }}
          onMouseLeave={(e) => {
            e.target.getStage().container().style.cursor = "default";
          }}
        />
      ))}
    </Group>
  );
}
