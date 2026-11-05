
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/tickets");
      const data = response.data;

      setTickets(Array.isArray(data) ? data : data.tickets || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load tickets."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (ticketId) => {
    try {
      setSubmittingId(ticketId);
      setError("");
      setMessage("");

      await api.patch(`/tickets/${ticketId}/submit`);

      setMessage("Ticket submitted successfully!");
      await fetchTickets();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to submit ticket."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="page-container">
      <h1>My Tickets</h1>

      <div className="page-actions">
        <Link to="/dashboard">Dashboard</Link>
        {" | "}
        <Link to="/tickets/create">Create New Ticket</Link>
      </div>

      <button onClick={fetchTickets}>Refresh Tickets</button>

      {loading && <p>Loading tickets...</p>}
      {error && <p className="error-message">{error}</p>}
      {message && <p>{message}</p>}

      {!loading && !error && tickets.length === 0 && (
        <p>No tickets found.</p>
      )}

      <div className="ticket-list">
        {tickets.map((ticket) => (
          <div className="ticket-card" key={ticket.id}>
            <h3>{ticket.ticket_number}</h3>
            <p>
               <Link to={`/tickets/${ticket.id}`}>View Details</Link>
            </p>

            <p>
              <strong>Customer:</strong> {ticket.customer_name}
            </p>

            <p>
              <strong>Status:</strong> {ticket.status}
            </p>

            <p>
              <strong>Start Date:</strong>{" "}
              {ticket.work_start_date || "Not specified"}
            </p>

            <p>
              <strong>End Date:</strong>{" "}
              {ticket.work_end_date || "Not specified"}
            </p>

            {ticket.rejection_reason && (
              <p>
                <strong>Rejection Reason:</strong>{" "}
                {ticket.rejection_reason}
              </p>
            )}

            {(ticket.status === "Draft" ||
              ticket.status === "Rejected") && (
              <button
                onClick={() => handleSubmit(ticket.id)}
                disabled={submittingId === ticket.id}
              >
                {submittingId === ticket.id
                  ? "Submitting..."
                  : "Submit Ticket"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyTickets;
