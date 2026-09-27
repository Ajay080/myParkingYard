// routes.jsx — Car Parking System

import Dashboard from "@/pages/admin/DashboardNew";
import UserDashboard from "@/pages/user/UserDashboardNew";
import EnhancedDashboard from "@/pages/user/EnhancedDashboard";
import AccountPage from "@/pages/user/AccountPage";
import AdminAccountPage from "@/pages/admin/AccountPage";
import Zones from "@/pages/admin/Zones";
import Bookings from "@/pages/admin/Bookings_new";
import Reports from "@/pages/admin/Reports";
import ManageCCTVs from "@/pages/admin/ManageCCTV";

export const routes = [
  {
    path: "/admin/dashboard",
    element: <Dashboard />,
    title: "Admin Dashboard",
    breadcrumb: ["Admin", "Dashboard"],
    requireAdmin: true,
  },
  {
    path: "/admin/zones",
    element: <Zones />,
    title: "Manage Zones & Spots",
    breadcrumb: ["Admin", "Zones"],
    requireAdmin: true,
  },
  {
    path: "/admin/bookings",
    element: <Bookings />,
    title: "Booking History",
    breadcrumb: ["Admin", "Bookings"],
    requireAdmin: true,
  },
  {
    path: "/admin/reports",
    element: <Reports />,
    title: "Reports & Analytics",
    breadcrumb: ["Admin", "Reports"],
    requireAdmin: true,
  },
  {
    path: "/admin/cctv",
    element: <ManageCCTVs />,
    title: "Manage CCTV",
    breadcrumb: ["Admin", "Manage CCTV"],
    requireAdmin: true,
  },
  {
    path: "/admin/account",
    element: <AdminAccountPage />,
    title: "Admin Account",
    breadcrumb: ["Admin", "Account"],
    requireAdmin: true,
  },
  {
    path: "/user/dashboard",
    element: <UserDashboard />,
    title: "Dashboard",
    breadcrumb: ["User", "Dashboard"],
    requireAdmin: false,
  },
  {
    path: "/user/book",
    element: <EnhancedDashboard />,
    title: "My Bookings",
    breadcrumb: ["User", "My Bookings"],
    requireAdmin: false,
  },
  {
    path: "/user/account",
    element: <AccountPage />,
    title: "My Account",
    breadcrumb: ["User", "Account"],
    requireAdmin: false,
  },
];
