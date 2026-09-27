import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import PolygonEditor from "@/components/item/PolygonEditorCanvas";

export default function ZoneCanvas({
  vertices = [],
  setVertices = () => {},
  drawing = false,
  setDrawing = () => {},
  scale = 1,
  unit = "pixels",
  zones,
  style,
}) {
  const stageRef = useRef();
  const containerRef = React.useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function updateSize() {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  function handleStageClick(e) {
    if (!drawing) return;
    const pointer = e.target.getStage().getPointerPosition();
    setVertices([...vertices, pointer]);
  }

  function handleWheel(e) {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const oldScale = stageScale;
    const pointer = stageRef.current.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    newScale = Math.max(0.2, Math.min(5, newScale));
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setStageScale(newScale);
    setStagePos(newPos);
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#f9f9f9",
        borderRadius: "6px",
        ...style,
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onClick={handleStageClick}
        onWheel={handleWheel}
        style={{ cursor: drawing ? "crosshair" : "default" }}
      >
        <Layer>
          <PolygonEditor
            vertices={vertices}
            setVertices={setVertices}
            scale={scale}
            unit={unit}
          />
        </Layer>
      </Stage>
    </div>
  );
}
