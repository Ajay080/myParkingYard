import React from "react";

export default function Modal({ visible, onClose, title, children, footer }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: "20px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #eee",
            fontWeight: "700",
            fontSize: "1.25rem",
            color: "#222",
            userSelect: "none",
          }}
        >
          {title}
        </header>

        <main
          style={{
            padding: "20px",
            flexGrow: 1,
            overflowY: "auto",
            minHeight: "300px",
          }}
        >
          {children}
        </main>

        {footer && (
          <footer
            style={{
              borderTop: "1px solid #eee",
              padding: "12px 20px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
