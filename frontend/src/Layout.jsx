import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/app-sidebar";
import Header from "@/components/layout/header";
import Login from "./pages/login/login";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Route config
import { routes } from "@/utils/routes";

const Layout = () => {
    const location = useLocation();
    const isMobile = useIsMobile();
    const { isAuthenticated, isAdmin, loading } = useAuth();

    // Show loading screen while checking authentication
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    // Show login page if user is not authenticated
    if (!isAuthenticated()) {
        return (
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    }

    // Show main app layout if authenticated
    return (
        <SidebarProvider>
            <div className="flex h-screen">
                <AppSidebar />
                <SidebarInset>
                    <Header />
                    <main className={`flex-1 overflow-auto ${isMobile?'p-2':'p-6'}`}>
                        <Routes>
                            {routes.map((route, index) => (
                                <Route
                                    key={index}
                                    path={route.path}
                                    element={
                                        route.requireAdmin ? (
                                            <ProtectedRoute requireAdmin={true}>
                                                {route.element}
                                            </ProtectedRoute>
                                        ) : (
                                            <ProtectedRoute>
                                                {route.element}
                                            </ProtectedRoute>
                                        )
                                    }
                                />
                            ))}
                            <Route 
                                path="*" 
                                element={
                                    <Navigate 
                                        to={isAdmin() ? "/admin/dashboard" : "/user/dashboard"} 
                                        replace 
                                    />
                                } 
                            />
                        </Routes>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
};

export default Layout;
