
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isLoggedIn = Boolean(localStorage.getItem("token"));
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!isLoggedIn) return null;

  return (
    <nav className="app-navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">
          <span className="brand-icon">OFS</span>
          <span>Legacy OFS</span>
        </Link>
      </div>

      <div className="navbar-links">
        {!isAdmin && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/tickets">My Tickets</Link>
            <Link to="/tickets/create">Create Ticket</Link>
            <Link to="/devices">Devices</Link>
            <Link to="/offline-tickets">Offline Tickets</Link>
          </>
        )}

        {isAdmin && (
          <>
            <Link to="/admin">Admin Dashboard</Link>
            <Link to="/admin/templates">Templates</Link>
            <Link to="/devices">Device Management</Link>
          </>
        )}
      </div>

      <div className="navbar-user">
        <span>{user?.name || user?.email || "User"}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
