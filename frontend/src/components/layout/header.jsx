import React from "react";
import { useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { routes } from "@/utils/routes";

import { IoMdNotificationsOutline } from "react-icons/io";
import { FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";


const Header = () => {
  const location = useLocation();

  const currentRoute = routes.find((route) => route.path === location.pathname);

  return (
    <header className="flex justify-between h-10 border-b items-center px-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      {/* Left section - breadcrumb */}
      {/* Breadcrumb - full for md and up */}
      <div className="hidden md:flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {currentRoute?.breadcrumb?.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <BreadcrumbItem>
                  {idx < currentRoute.breadcrumb.length - 1 ? (
                    <BreadcrumbLink href="#">{crumb}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {idx < currentRoute.breadcrumb.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Breadcrumb - last only for small screens */}
      <div className="flex md:hidden items-center gap-1">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {currentRoute?.breadcrumb?.length > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {currentRoute.breadcrumb[currentRoute.breadcrumb.length - 1]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 rounded-lg">
        <h3 className="text-purple-900 font-extrabold tracking-wide select-none">
          My Parking Yard
        </h3>
      </div>


      {/* Right section - profile, notification, logout */}
      {/* <div className="hidden md:flex items-center gap-2">
        <button className="hover:cursor-pointer hover:bg-gray-100 rounded-full p-2">
          <IoMdNotificationsOutline className="text-xl" />
        </button>
        <img
          src={ProfilePhoto}
          alt="Profile"
          className="hover:cursor-pointer w-8 h-8 rounded-full border-2 border-gray-300 "
        />
        <button
          className="hover:bg-gray-100 hover:cursor-pointer rounded-full p-2"
          onClick={() => {
            navigate("/login"); // or any desired route
          }}
        >
          <FiLogOut className="text-xl" />
        </button>
      </div> */}
      {/* Right section - last only for small screens */}
      {/* <div className="flex md:hidden items-center gap-1">
        <button className="hover:cursor-pointer hover:bg-gray-100 rounded-full p-2">
          <IoMdNotificationsOutline className="text-xl" />
        </button>
        <img
          src={ProfilePhoto}
          alt="Profile"
          className="hover:cursor-pointer w-8 h-8 rounded-full border-2 border-gray-300 "
        />
        <button
          className="hover:bg-gray-100 hover:cursor-pointer rounded-full p-2"
          onClick={() => {
            navigate("/login"); // or any desired route
          }}
        >
          <FiLogOut className="text-xl" />
        </button>
      </div> */}
    </header>
  );
};

export default Header;
