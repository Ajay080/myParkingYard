import React from "react";

export default function ZoneList({ zones, onCreate, onEdit, onManageSpots }) {
  return (
    <div>
      <button
        onClick={onCreate}
        style={{
          width: "100%",
          marginBottom: "12px",
          padding: "10px 0",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        + Create New Zone
      </button>
      {zones.length === 0 && <p style={{ color: "#666" }}>No zones created yet.</p>}
      {zones.map((zone) => (
        <div
          key={zone._id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "10px",
            marginBottom: "8px",
            backgroundColor: "#fff",
          }}
        >
          <h3 style={{ margin: "0 0 6px 0" }}>{zone.name}</h3>
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "13px",
              color: "#555",
              minHeight: "34px",
            }}
          >
            {zone.description || <em>No description</em>}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onEdit(zone._id)}
              style={{
                flex: 1,
                padding: "6px 8px",
                backgroundColor: "#17a2b8",
                border: "none",
                color: "#fff",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Edit Zone
            </button>
            <button
              onClick={() => onManageSpots(zone)}
              style={{
                flex: 1,
                padding: "6px 8px",
                backgroundColor: "#ffc107",
                border: "none",
                color: "#333",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Manage Spots
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
