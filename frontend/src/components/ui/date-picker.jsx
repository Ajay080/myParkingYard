// /src/components/ui/date-picker.jsx

import React, { useState } from "react";

export function DatePicker({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border rounded px-2 py-1"
    />
  );
}
