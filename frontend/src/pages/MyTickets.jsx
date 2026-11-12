
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/tickets");
      const data = response.data;

      setTickets(Array.isArray(data) ? data : data.tickets || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load tickets.");
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
      setError(err.response?.data?.message || "Unable to submit ticket.");
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusClass = (status) => {
    return `status status-${String(status || "draft").toLowerCase()}`;
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      String(ticket.ticket_number || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(ticket.customer_name || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    Total: tickets.length,
    Draft: tickets.filter((t) => t.status === "Draft").length,
    Submitted: tickets.filter((t) => t.status === "Submitted").length,
    Approved: tickets.filter((t) => t.status === "Approved").length,
    Rejected: tickets.filter((t) => t.status === "Rejected").length,
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Tickets</h1>
          <p>View, search and manage your field service tickets.</p>
        </div>

        <div className="ticket-page-actions">
          <button onClick={fetchTickets} disabled={loading}>
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          <Link to="/tickets/create" className="btn">
            + Create New Ticket
          </Link>
        </div>
      </div>

      <div className="ticket-stats-grid">
        {Object.entries(statusCounts).map(([label, count]) => (
          <div className="ticket-stat" key={label}>
            <span>{label} Tickets</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="ticket-filters">
        <input
          type="search"
          placeholder="Search ticket number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Submitted">Submitted</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Invoiced">Invoiced</option>
          <option value="Void">Void</option>
        </select>
      </div>

      {loading && <div className="loading">Loading tickets...</div>}

      {!loading && filteredTickets.length === 0 && (
        <div className="empty-state">
          <h3>No Tickets Found</h3>
          <p>
            {tickets.length === 0
              ? "You have not created any tickets yet."
              : "Try changing your search or status filter."}
          </p>

          {tickets.length === 0 && (
            <Link to="/tickets/create" className="btn">
              Create Your First Ticket
            </Link>
          )}
        </div>
      )}

      {!loading && filteredTickets.length > 0 && (
        <div className="ticket-list">
          {filteredTickets.map((ticket) => (
            <div className="ticket-card" key={ticket.id}>
              <div className="ticket-card-header">
                <div>
                  <h3>{ticket.ticket_number}</h3>
                  <span className="ticket-customer">
                    {ticket.customer_name}
                  </span>
                </div>

                <span className={getStatusClass(ticket.status)}>
                  {ticket.status}
                </span>
              </div>

              <div className="ticket-info-grid">
                <div>
                  <span>Start Date</span>
                  <strong>{ticket.work_start_date || "Not specified"}</strong>
                </div>

                <div>
                  <span>End Date</span>
                  <strong>{ticket.work_end_date || "Not specified"}</strong>
                </div>
              </div>

              {ticket.rejection_reason && (
                <div className="ticket-rejection">
                  <strong>Rejection Reason:</strong>
                  <p>{ticket.rejection_reason}</p>
                </div>
              )}

              <div className="ticket-card-actions">
                <Link to={`/tickets/${ticket.id}`} className="btn">
                  View Details
                </Link>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTickets;
