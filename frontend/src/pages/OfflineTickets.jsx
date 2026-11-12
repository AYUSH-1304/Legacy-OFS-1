
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOfflineActions,
  getOfflineTickets,
  syncOfflineActions,
} from "../services/offlineSync";
import api from "../services/api";

function OfflineTickets() {
  const [tickets, setTickets] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState("");
  const [lastSync, setLastSync] = useState("");

  const loadTickets = useCallback(() => {
    setTickets(getOfflineTickets());
    setPendingCount(getOfflineActions().length);
  }, []);

  const handleSync = useCallback(async () => {
    if (!navigator.onLine) {
      setMessage("Internet connection is unavailable.");
      return;
    }

    if (syncing) return;

    setSyncing(true);
    setMessage("Syncing pending actions...");

    try {
      const result = await syncOfflineActions(api);

      setMessage(result.message || "Sync process completed.");

      if (result.syncedCount > 0) {
        setLastSync(new Date().toLocaleString());
      }

      loadTickets();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to sync offline tickets."
      );

      loadTickets();
    } finally {
      setSyncing(false);
    }
  }, [loadTickets, syncing]);

  useEffect(() => {
    loadTickets();

    const handleOnline = () => {
      setIsOnline(true);
      setMessage("Internet restored. Starting automatic sync...");
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setMessage("You are offline. Your pending data is saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadTickets, handleSync]);

  const pendingTickets = tickets.filter(
    (ticket) => ticket.local_status === "Pending Sync"
  );

  const syncedTickets = tickets.filter(
    (ticket) => ticket.local_status === "Synced"
  );

  const failedTickets = tickets.filter(
    (ticket) => ticket.local_status === "Failed"
  );

  const formatDate = (date) => {
    if (!date) return "Not provided";

    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Offline Tickets</h1>
          <p>Manage locally saved tickets and synchronize them with the server.</p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || !isOnline || pendingCount === 0}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="offline-connection">
        <strong>Connection:</strong>{" "}
        <span className={isOnline ? "status-approved" : "status-rejected"}>
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      {message && (
        <div className="alert-message">
          {message}
        </div>
      )}

      <div className="ticket-stats-grid">
        <div className="ticket-stat-card">
          <h3>{tickets.length}</h3>
          <p>Total Saved</p>
        </div>

        <div className="ticket-stat-card">
          <h3>{pendingTickets.length}</h3>
          <p>Pending Sync</p>
        </div>

        <div className="ticket-stat-card">
          <h3>{syncedTickets.length}</h3>
          <p>Synced</p>
        </div>

        <div className="ticket-stat-card">
          <h3>{failedTickets.length}</h3>
          <p>Failed</p>
        </div>
      </div>

      <div className="offline-info">
        <p>
          Pending actions waiting for server: <strong>{pendingCount}</strong>
        </p>

        {lastSync && <p>Last successful sync: {lastSync}</p>}
      </div>

      <h2>Saved Tickets</h2>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <h3>No offline tickets found</h3>
          <p>Tickets saved while offline will appear here.</p>
          <Link to="/tickets/create">Create a Ticket</Link>
        </div>
      ) : (
        <div className="dashboard-cards">
          {tickets.map((ticket) => (
            <div className="dashboard-card" key={ticket.local_id}>
              <h3>{ticket.customer_name || "Unnamed Customer"}</h3>

              <p>
                Template: {ticket.template_name || ticket.template_id || "Not specified"}
              </p>

              <p>Start Date: {formatDate(ticket.work_start_date)}</p>
              <p>End Date: {formatDate(ticket.work_end_date)}</p>

              <p>
                Status: <strong>{ticket.local_status}</strong>
              </p>

              {ticket.server_ticket_id && (
                <p>Server Ticket ID: {ticket.server_ticket_id}</p>
              )}

              {ticket.sync_message && (
                <p>{ticket.sync_message}</p>
              )}

              {ticket.local_status === "Failed" && (
                <button
                  onClick={handleSync}
                  disabled={!isOnline || syncing || pendingCount === 0}
                >
                  Retry Pending Sync
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="offline-navigation">
        <Link to="/dashboard">Dashboard</Link>
        {" | "}
        <Link to="/tickets">My Tickets</Link>
        {" | "}
        <Link to="/tickets/create">Create Ticket</Link>
      </div>
    </div>
  );
}

export default OfflineTickets;
