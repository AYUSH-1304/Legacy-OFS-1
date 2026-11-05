
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOfflineTickets,
  syncOfflineActions,
} from "../services/offlineSync";
import api from "../services/api";

function OfflineTickets() {
  const [tickets, setTickets] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const loadTickets = () => {
    setTickets(getOfflineTickets());
  };

  useEffect(() => {
    loadTickets();

    const handleOnline = () => {
      setMessage("Internet restored. Syncing pending tickets...");
      handleSync();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine) {
      setMessage("Internet connection is unavailable.");
      return;
    }

    setSyncing(true);
    setMessage("");

    const result = await syncOfflineActions(api);

    setMessage(result.message);
    loadTickets();
    setSyncing(false);
  };

  return (
    <div className="page-container">
      <h1>Offline Tickets</h1>

      <p>
        <Link to="/dashboard">Dashboard</Link>
        {" | "}
        <Link to="/tickets">My Tickets</Link>
        {" | "}
        <Link to="/tickets/create">Create Ticket</Link>
      </p>

      <p>
        Connection: {navigator.onLine ? "Online" : "Offline"}
      </p>

      {message && <p>{message}</p>}

      <button onClick={handleSync} disabled={syncing || !navigator.onLine}>
        {syncing ? "Syncing..." : "Sync Pending Tickets"}
      </button>

      <h2>Saved Tickets ({tickets.length})</h2>

      {tickets.length === 0 ? (
        <p>No offline tickets found.</p>
      ) : (
        <div className="dashboard-cards">
          {tickets.map((ticket) => (
            <div className="dashboard-card" key={ticket.local_id}>
              <h3>{ticket.customer_name}</h3>

              <p>
                Template: {ticket.template_id}
              </p>

              <p>
                Start Date: {ticket.work_start_date || "Not provided"}
              </p>

              <p>
                End Date: {ticket.work_end_date || "Not provided"}
              </p>

              <p>
                Status: <strong>{ticket.local_status}</strong>
              </p>

              {ticket.server_ticket_id && (
                <p>Server Ticket ID: {ticket.server_ticket_id}</p>
              )}

              {ticket.sync_message && (
                <p>{ticket.sync_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OfflineTickets;
