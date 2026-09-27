// AppSidebar.jsx (trimmed and cleaned)

import {
  IoMdMail,
  IoIosSend,
} from "react-icons/io";
import {
  FaChalkboardTeacher,
  FaIdCard,
  FaUserCheck,
  FaCalendarAlt,
  FaTools,
  FaSchool,
  FaUserGraduate,
  FaBook,
  FaBookOpen,
  FaUsers,
  FaCalendar,
  FaCamera,
    FaMapMarkedAlt,
  FaTicketAlt,
  FaUserCircle,
  FaHistory,
  FaCalendarPlus,
} from "react-icons/fa";
import { FaChildren, FaBuildingUser } from "react-icons/fa6";
import { TbHierarchy2 } from "react-icons/tb";
import { MdBadge } from "react-icons/md";
import { Command } from "lucide-react";
import { HiOutlineUserCircle, HiUserGroup } from "react-icons/hi2";

import NavMain from "@/components/layout/nav-main";
import NavUser from "@/components/layout/nav-user";
import TeamSwitcher from "@/components/layout/team-switcher";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// ✨ Sidebar Data Config (Only relevant for Parking System)
const data = {
  user: {
    name: "Ajay Singh",
    email: "ajay@gmail.com",
    avatar: "/favicon.svg",
  },
  teams: [
    { name: "Smart Parking System", logo: Command, plan: "Hyderabad" },
  ],
  adminNavMain: [
    {
      title: "Admin",
      url: "#",
      icon: FaTools,
      items: [
        { title: "Dashboard", url: "/admin/dashboard", icon: FaTools },
        { title: "Manage Zones & Spots", url: "/admin/zones", icon: FaSchool },
        { title: "Manage CCTV", url: "/admin/cctv", icon: FaCamera },
        { title: "Booking Management", url: "/admin/bookings", icon: FaUsers },
        { title: "Reports & Analytics", url: "/admin/reports", icon: FaBookOpen },
        { title: "My Account", url: "/admin/account", icon: FaUserCircle },
      ],
    },
  ],
   userNavMain: [
    { title: "Dashboard", url: "/user/dashboard", icon: FaMapMarkedAlt },
    { title: "My Bookings", url: "/user/book", icon: FaCalendarPlus },
    { title: "My Account", url: "/user/account", icon: FaUserCircle },
  ],
};

const AppSidebar = (props) => {
  const { user, isAdmin, isUser } = useAuth();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {isAdmin() && (
          <NavMain items={data.adminNavMain} module_name={"Admin Panel"} />
        )}
        {isUser() && (
          <NavMain items={data.userNavMain} module_name={"User Panel"} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
