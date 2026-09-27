import React from "react";
import ZoneCanvas from "./ZoneCanvas";

export default function ZoneForm({
  mode,
  zoneName,
  setZoneName,
  zoneDescription,
  setZoneDescription,
  unit,
  setUnit,
  scale,
  setScale,
  zoneVertices,
  setZoneVertices,
  drawing,
  setDrawing,
  onSave,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        height: "100%", // Fill modal height
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label
          htmlFor="zone-name"
          style={{ fontWeight: "600", marginBottom: "6px", color: "#333" }}
        >
          Name:
        </label>
        <input
          id="zone-name"
          type="text"
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          placeholder="Enter zone name"
          style={{
            padding: "8px 12px",
            fontSize: "14px",
            borderRadius: "6px",
            border: "1.5px solid #ccc",
            outline: "none",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#007bff")}
          onBlur={(e) => (e.target.style.borderColor = "#ccc")}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label
          htmlFor="zone-description"
          style={{ fontWeight: "600", marginBottom: "6px", color: "#333" }}
        >
          Description:
        </label>
        <input
          id="zone-description"
          type="text"
          value={zoneDescription}
          onChange={(e) => setZoneDescription(e.target.value)}
          placeholder="Enter zone description"
          style={{
            padding: "8px 12px",
            fontSize: "14px",
            borderRadius: "6px",
            border: "1.5px solid #ccc",
            outline: "none",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#007bff")}
          onBlur={(e) => (e.target.style.borderColor = "#ccc")}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
          <label
            htmlFor="unit-select"
            style={{ fontWeight: "600", marginBottom: "6px", color: "#333" }}
          >
            Unit:
          </label>
          <select
            id="unit-select"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              borderRadius: "6px",
              border: "1.5px solid #ccc",
              outline: "none",
              cursor: "pointer",
              transition: "border-color 0.3s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#007bff")}
            onBlur={(e) => (e.target.style.borderColor = "#ccc")}
          >
            <option value="pixels">Pixels</option>
            <option value="feet">Feet</option>
            <option value="meters">Meters</option>
          </select>
        </div>

        <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column" }}>
          <label
            htmlFor="scale-input"
            style={{ fontWeight: "600", marginBottom: "6px", color: "#333" }}
          >
            Scale:
          </label>
          <input
            id="scale-input"
            type="number"
            min={0.1}
            step={0.1}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value) || 1)}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              borderRadius: "6px",
              border: "1.5px solid #ccc",
              outline: "none",
              transition: "border-color 0.3s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#007bff")}
            onBlur={(e) => (e.target.style.borderColor = "#ccc")}
          />
        </div>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "8px",
          marginTop: "12px",
          backgroundColor: "#fafafa",
          flexGrow: 1,
          minHeight: 0, // Allow flex-grow inside container
        }}
      >
        <ZoneCanvas
          vertices={zoneVertices}
          setVertices={setZoneVertices}
          drawing={drawing}
          setDrawing={setDrawing}
          scale={scale}
          unit={unit}
        />
      </div>
    </div>
  );
}
