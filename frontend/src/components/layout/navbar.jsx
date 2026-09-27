import bgImage from '@/assets/images/app-bg-1.jpg';
import { GiHamburgerMenu, GiHamburger } from "react-icons/gi";
import { FiBell } from "react-icons/fi";
import { IoMdHelpCircleOutline } from "react-icons/io";
import {Link} from "react-router-dom";
import "./navbar.css";

function NavbarExport({ isSidebarOpen, toggleSidebar }) {
  return (
    <nav className="custom-navbar" style={{
      backgroundImage: `linear-gradient(rgba(20, 20, 139, 0.9), rgb(0, 0, 0)), url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: '#1f2937',
    }}>
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={toggleSidebar}>
          {isSidebarOpen ? <GiHamburgerMenu /> : <GiHamburger />}
        </button>
        <Link to="/" className="navbar-title">My Parking Yard</Link>
      </div>

      <div className="navbar-right">
        <IoMdHelpCircleOutline className="navbar-icon" title="Help" />
        <FiBell className="navbar-icon" title="Notifications" />
        <img
          src="https://i.pravatar.cc/150?img=32"
          alt="User"
          className="profile-avatar"
          title="User Profile"
        />
      </div>
    </nav>
  );
}

export default NavbarExport;
