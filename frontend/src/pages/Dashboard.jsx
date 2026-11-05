
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <h2>Legacy OFS</h2>

        <button onClick={() => setMenuOpen(!menuOpen)}>
          Menu
        </button>

        {menuOpen && (
          <div className="dashboard-menu">
            <Link to="/tickets">My Tickets</Link>
            <Link to="/tickets/create">Create Ticket</Link>
            <Link to="/devices">
              {isAdmin ? "Device Management" : "My Devices"}
            </Link>
            <Link to="/offline-tickets">Offline Tickets</Link>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </nav>

      <main className="dashboard-content">
        <h1>Welcome to Legacy OFS</h1>

        <p>Hello, {user?.name || "Field Worker"}</p>
        <p>Role: {user?.role || "field_worker"}</p>

        <p>
          Internet Status:{" "}
          <strong>{isOnline ? "Online" : "Offline"}</strong>
        </p>

        <div className="dashboard-cards">
          <div className="dashboard-card">
            <h3>My Tickets</h3>
            <p>View and manage your field tickets.</p>
            <Link to="/tickets">View Tickets</Link>
          </div>

          <div className="dashboard-card">
            <h3>Create Ticket</h3>
            <p>Create a new field service ticket.</p>
            <Link to="/tickets/create">Create New Ticket</Link>
          </div>

          <div className="dashboard-card">
            <h3>{isAdmin ? "Device Management" : "My Devices"}</h3>
            <p>Manage registered devices.</p>
            <Link to="/devices">
              {isAdmin ? "Manage Devices" : "View My Devices"}
            </Link>
          </div>

          <div className="dashboard-card">
            <h3>Offline Tickets</h3>
            <p>View pending, synced and failed offline tickets.</p>
            <Link to="/offline-tickets">View Offline Tickets</Link>
          </div>

          <div className="dashboard-card">
            <h3>Offline Sync</h3>
            <p>
              {isOnline
                ? "Internet available. Pending tickets can be synchronized."
                : "You are offline. New tickets can be saved locally."}
            </p>
            <Link to="/offline-tickets">Manage Sync</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
