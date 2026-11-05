
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const approveTicket = async (id) => {
    if (!window.confirm("Approve this ticket?")) return;

    try {
      await api.patch(`/tickets/${id}/approve`);
      alert("Ticket approved successfully.");
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || "Approval failed.");
    }
  };

  const rejectTicket = async (id) => {
    const reason = window.prompt("Enter rejection reason:");

    if (!reason || !reason.trim()) return;

    try {
      await api.patch(`/tickets/${id}/reject`, {
        rejection_reason: reason.trim(),
      });

      alert("Ticket rejected successfully.");
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed.");
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      (ticket.ticket_number || "").toLowerCase().includes(searchText) ||
      (ticket.customer_name || "").toLowerCase().includes(searchText) ||
      String(ticket.created_by || "").toLowerCase().includes(searchText);

    const matchesStatus =
      statusFilter === "All" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  return (
    <div className="page-container">
      <h1>Admin Dashboard</h1>

      <p>
        <Link to="/dashboard">Dashboard</Link>
        {" | "}
        <Link to="/admin/templates">Template Management</Link>
        {" | "}
        <Link to="/devices">Device Management</Link>
      </p>

      <h2>All Tickets ({tickets.length})</h2>

      <button onClick={fetchTickets}>Refresh</button>

      <div style={{ margin: "20px 0" }}>
        <h3>Search Tickets</h3>

        <input
          type="text"
          placeholder="Search customer name or ticket number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "10px", width: "100%", maxWidth: "400px" }}
        />

        <div style={{ marginTop: "12px" }}>
          <label htmlFor="statusFilter">Filter by Status: </label>

          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px" }}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Invoiced">Invoiced</option>
            <option value="Void">Void</option>
          </select>

          <button
            onClick={clearFilters}
            style={{ marginLeft: "10px" }}
          >
            Clear Search
          </button>
        </div>

        <p>
          Showing {filteredTickets.length} of {tickets.length} tickets
        </p>
      </div>

      {loading && <p>Loading tickets...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && filteredTickets.length === 0 && (
        <p>No matching tickets found.</p>
      )}

      <div className="ticket-list">
        {filteredTickets.map((ticket) => (
          <div className="ticket-card" key={ticket.id}>
            <h3>{ticket.ticket_number}</h3>

            <p>
              <strong>Customer:</strong> {ticket.customer_name}
            </p>

            <p>
              <strong>Status:</strong> {ticket.status}
            </p>

            <p>
              <strong>Created By:</strong> {ticket.created_by}
            </p>

            {ticket.status === "Submitted" && (
              <div>
                <button onClick={() => approveTicket(ticket.id)}>
                  Approve
                </button>

                <button onClick={() => rejectTicket(ticket.id)}>
                  Reject
                </button>
              </div>
            )}

            {ticket.rejection_reason && (
              <p>
                <strong>Rejection Reason:</strong>{" "}
                {ticket.rejection_reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
