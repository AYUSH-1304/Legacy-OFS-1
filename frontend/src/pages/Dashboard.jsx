
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

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

  const cards = [
    {
      title: "My Tickets",
      description: "View and manage your field service tickets.",
      link: "/tickets",
      button: "View Tickets",
      icon: "📋",
    },
    {
      title: "Create Ticket",
      description: "Create a new field service or inspection ticket.",
      link: "/tickets/create",
      button: "Create New Ticket",
      icon: "➕",
    },
    {
      title: isAdmin ? "Device Management" : "My Devices",
      description: "View and manage registered application devices.",
      link: "/devices",
      button: isAdmin ? "Manage Devices" : "View My Devices",
      icon: "📱",
    },
    {
      title: "Offline Tickets",
      description: "View pending, synced and failed offline tickets.",
      link: "/offline-tickets",
      button: "View Offline Tickets",
      icon: "📡",
    },
    ...(isAdmin
      ? [
          {
            title: "Template Management",
            description: "Manage field ticket and inspection templates.",
            link: "/admin/templates",
            button: "Manage Templates",
            icon: "📝",
          },
          {
            title: "Admin Dashboard",
            description: "Review, approve and manage submitted tickets.",
            link: "/admin",
            button: "Open Admin Dashboard",
            icon: "🛡️",
          },
        ]
      : []),
  ];

  return (
    <div className="dashboard-container">
      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">LEGACY OFS WORKSPACE</p>
            <h1>Welcome, {user?.name || "Field Worker"}!</h1>
            <p>
              Manage your field operations, service tickets and inspections
              from one place.
            </p>
          </div>

          <div className="dashboard-user-info">
            <span className="user-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{isAdmin ? "Administrator" : "Field Worker"}</span>
            </div>
          </div>
        </section>

        <section className="dashboard-status">
          <div className="status-indicator">
            <span className={isOnline ? "online-dot" : "offline-dot"} />
            <div>
              <strong>{isOnline ? "Internet Connected" : "Working Offline"}</strong>
              <p>
                {isOnline
                  ? "Your application can communicate with the server."
                  : "Your changes can be saved locally for later synchronization."}
              </p>
            </div>
          </div>

          <Link to="/offline-tickets" className="sync-link">
            View Sync Status →
          </Link>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Choose an option to continue your work.</p>
            </div>
          </div>

          <div className="dashboard-cards">
            {cards.map((card) => (
              <div className="dashboard-card" key={card.title}>
                <div className="dashboard-card-icon">{card.icon}</div>

                <h3>{card.title}</h3>

                <p>{card.description}</p>

                <Link to={card.link} className="dashboard-card-link">
                  {card.button} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        <footer className="dashboard-footer">
          Legacy OFS – Field Ticketing and Inspections Application
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
