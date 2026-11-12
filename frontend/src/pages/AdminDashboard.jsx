
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchTickets = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const approveTicket = async (id) => {
    if (!window.confirm("Are you sure you want to approve this ticket?")) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.patch(`/tickets/${id}/approve`);

      setMessage("Ticket approved successfully.");
      await fetchTickets(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Approval failed."
      );
    }
  };

  const rejectTicket = async (id) => {
    const reason = window.prompt("Enter rejection reason:");

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.patch(`/tickets/${id}/reject`, {
        rejection_reason: reason.trim(),
      });

      setMessage("Ticket rejected successfully.");
      await fetchTickets(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Rejection failed."
      );
    }
  };

  const statusCounts = {
    Total: tickets.length,
    Draft: tickets.filter((t) => t.status === "Draft").length,
    Submitted: tickets.filter((t) => t.status === "Submitted").length,
    Approved: tickets.filter((t) => t.status === "Approved").length,
    Rejected: tickets.filter((t) => t.status === "Rejected").length,
    Invoiced: tickets.filter((t) => t.status === "Invoiced").length,
    Void: tickets.filter((t) => t.status === "Void").length,
  };

  const filteredTickets = tickets.filter((ticket) => {
    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      String(ticket.ticket_number || "").toLowerCase().includes(searchText) ||
      String(ticket.customer_name || "").toLowerCase().includes(searchText) ||
      String(ticket.created_by || "").toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  const getStatusClass = (status) => {
    return `status status-${String(status || "draft").toLowerCase()}`;
  };

  return (
    <div className="page-container admin-page">
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage, review and track all field service tickets.</p>
        </div>

        <div className="admin-header-actions">
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>

          <Link to="/admin/templates" className="btn">
            Manage Templates
          </Link>

          <Link to="/devices" className="btn">
            Device Management
          </Link>
        </div>
      </div>

      <div className="admin-welcome">
        <div>
          <span>ADMINISTRATION</span>
          <h2>Ticket Overview</h2>
          <p>Monitor ticket activity and review submitted work.</p>
        </div>

        <div className="admin-total">
          <strong>{tickets.length}</strong>
          <span>Total Tickets</span>
        </div>
      </div>

      <section className="admin-stats-grid">
        {Object.entries(statusCounts).map(([label, count]) => (
          <div className="admin-stat-card" key={label}>
            <span>{label} Tickets</span>
            <strong>{count}</strong>
          </div>
        ))}
      </section>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <section className="admin-ticket-section">
        <div className="admin-section-heading">
          <div>
            <h2>All Field Tickets</h2>
            <p>Search and filter tickets by status or customer.</p>
          </div>

          <span className="admin-result-count">
            {filteredTickets.length} Results
          </span>
        </div>

        <div className="admin-filters">
          <input
            type="search"
            placeholder="Search ticket number, customer or creator..."
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

          <button type="button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {loading && (
          <div className="loading">Loading tickets...</div>
        )}

        {!loading && filteredTickets.length === 0 && (
          <div className="empty-state">
            <h3>No Tickets Found</h3>
            <p>
              {tickets.length === 0
                ? "No tickets have been created yet."
                : "Try changing your search or status filter."}
            </p>
          </div>
        )}

        {!loading && filteredTickets.length > 0 && (
          <div className="admin-ticket-list">
            {filteredTickets.map((ticket) => (
              <article className="admin-ticket-card" key={ticket.id}>
                <div className="admin-ticket-top">
                  <div>
                    <h3>{ticket.ticket_number || `Ticket #${ticket.id}`}</h3>
                    <span>{ticket.customer_name}</span>
                  </div>

                  <span className={getStatusClass(ticket.status)}>
                    {ticket.status}
                  </span>
                </div>

                <div className="admin-ticket-details">
                  <div>
                    <span>Created By</span>
                    <strong>{ticket.created_by || "Not available"}</strong>
                  </div>

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
                  <div className="admin-rejection-reason">
                    <strong>Rejection Reason:</strong>
                    <p>{ticket.rejection_reason}</p>
                  </div>
                )}

                <div className="admin-ticket-actions">
                  <Link to={`/tickets/${ticket.id}`} className="btn">
                    View Details
                  </Link>

                  {ticket.status === "Submitted" && (
                    <>
                      <button
                        className="admin-approve-btn"
                        onClick={() => approveTicket(ticket.id)}
                      >
                        Approve
                      </button>

                      <button
                        className="admin-reject-btn"
                        onClick={() => rejectTicket(ticket.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
