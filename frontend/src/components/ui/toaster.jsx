// src/components/ui/AppToaster.jsx
import React from "react";
import { Toaster } from "react-hot-toast";

const AppToaster = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        style: {
          zIndex: 99999,
        },
      }}
    />
  );
};

export default AppToaster;
