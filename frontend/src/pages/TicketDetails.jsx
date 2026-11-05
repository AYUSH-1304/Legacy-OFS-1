
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

function TicketDetails() {
  const { id } = useParams();

  // Logged-in user
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  const [ticket, setTicket] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [comments, setComments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [comment, setComment] = useState("");

  // Edit Ticket Form
  const [isEditingTicket, setIsEditingTicket] = useState(false);

  const [ticketEditForm, setTicketEditForm] = useState({
    customer_name: "",
    work_start_date: "",
    work_end_date: "",
    custom_fields: "{}",
  });

  // Add Line Item Form
  const [form, setForm] = useState({
    item_type: "service",
    description: "",
    quantity: 1,
    unit_price: 0,
  });

  // Edit Line Item Form
  const [editingItemId, setEditingItemId] = useState(null);

  const [editForm, setEditForm] = useState({
    item_type: "service",
    description: "",
    quantity: 1,
    unit_price: 0,
  });

  // Fetch Ticket Details
  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const ticketResponse = await api.get(`/tickets/${id}`);
      const ticketData = ticketResponse.data.ticket || ticketResponse.data;

      setTicket(ticketData);

      const itemsResponse = await api.get(`/tickets/${id}/line-items`);
      setLineItems(itemsResponse.data.line_items || []);

      const commentsResponse = await api.get(`/tickets/${id}/comments`);
      const commentsData = commentsResponse.data;

      setComments(
        Array.isArray(commentsData)
          ? commentsData
          : commentsData.comments || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load ticket details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Start Editing Ticket
  const startTicketEdit = () => {
    setTicketEditForm({
      customer_name: ticket.customer_name || "",
      work_start_date: ticket.work_start_date
        ? String(ticket.work_start_date).slice(0, 10)
        : "",
      work_end_date: ticket.work_end_date
        ? String(ticket.work_end_date).slice(0, 10)
        : "",
      custom_fields:
        typeof ticket.custom_fields === "string"
          ? ticket.custom_fields
          : JSON.stringify(ticket.custom_fields || {}, null, 2),
    });

    setIsEditingTicket(true);
    setError("");
    setMessage("");
  };

  // Ticket Edit Input Change
  const handleTicketEditChange = (e) => {
    setTicketEditForm({
      ...ticketEditForm,
      [e.target.name]: e.target.value,
    });
  };

  // Update Ticket
  const updateTicket = async (e) => {
    e.preventDefault();

    if (!ticketEditForm.customer_name.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (
      ticketEditForm.work_start_date &&
      ticketEditForm.work_end_date &&
      ticketEditForm.work_end_date < ticketEditForm.work_start_date
    ) {
      setError("End date cannot be before start date.");
      return;
    }

    let customFields;

    try {
      customFields = JSON.parse(ticketEditForm.custom_fields || "{}");

      if (
        customFields === null ||
        Array.isArray(customFields) ||
        typeof customFields !== "object"
      ) {
        setError("Custom fields must be a JSON object.");
        return;
      }
    } catch {
      setError("Custom fields must contain valid JSON.");
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.put(`/tickets/${id}`, {
        customer_name: ticketEditForm.customer_name.trim(),
        work_start_date: ticketEditForm.work_start_date || null,
        work_end_date: ticketEditForm.work_end_date || null,
        custom_fields: customFields,
      });

      setMessage("Ticket updated successfully!");
      setIsEditingTicket(false);

      await fetchDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update ticket."
      );
    }
  };

  // Cancel Ticket Edit
  const cancelTicketEdit = () => {
    setIsEditingTicket(false);
    setError("");
  };

  // Add Form Change
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Edit Form Change
  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  // Add Line Item
  const addLineItem = async (e) => {
    e.preventDefault();

    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (
      Number(form.quantity) <= 0 ||
      !Number.isFinite(Number(form.quantity))
    ) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (
      Number(form.unit_price) < 0 ||
      !Number.isFinite(Number(form.unit_price))
    ) {
      setError("Unit price cannot be negative.");
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.post(`/tickets/${id}/line-items`, {
        item_type: form.item_type,
        description: form.description.trim(),
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
      });

      setMessage("Line item added successfully!");

      setForm({
        item_type: "service",
        description: "",
        quantity: 1,
        unit_price: 0,
      });

      await fetchDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add line item."
      );
    }
  };

  // Start Editing Line Item
  const startEdit = (item) => {
    setEditingItemId(item.id);

    setEditForm({
      item_type: item.item_type,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
    });

    setError("");
    setMessage("");
  };

  // Cancel Editing Line Item
  const cancelEdit = () => {
    setEditingItemId(null);

    setEditForm({
      item_type: "service",
      description: "",
      quantity: 1,
      unit_price: 0,
    });
  };

  // Update Line Item
  const updateLineItem = async (e, itemId) => {
    e.preventDefault();

    if (!editForm.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (
      !Number.isFinite(Number(editForm.quantity)) ||
      Number(editForm.quantity) <= 0
    ) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (
      !Number.isFinite(Number(editForm.unit_price)) ||
      Number(editForm.unit_price) < 0
    ) {
      setError("Unit price cannot be negative.");
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.put(
        `/tickets/${id}/line-items/${itemId}`,
        {
          item_type: editForm.item_type,
          description: editForm.description.trim(),
          quantity: Number(editForm.quantity),
          unit_price: Number(editForm.unit_price),
        }
      );

      setMessage("Line item updated successfully!");
      setEditingItemId(null);

      await fetchDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update line item."
      );
    }
  };

  // Delete Line Item
  const deleteLineItem = async (itemId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this line item?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.delete(`/tickets/${id}/line-items/${itemId}`);

      setMessage("Line item deleted successfully!");

      if (editingItemId === itemId) {
        setEditingItemId(null);
      }

      await fetchDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to delete line item."
      );
    }
  };

  // Update Final Status (Admin Only)
  const updateFinalStatus = async (status) => {
    const confirmed = window.confirm(
      `Are you sure you want to change ticket status to ${status}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.patch(`/tickets/${id}/final-status`, {
        status,
      });

      setMessage(`Ticket marked as ${status} successfully!`);

      await fetchDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update ticket status."
      );
    }
  };

  // Add Comment
  const addComment = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      setError("Please enter a comment.");
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.post(`/tickets/${id}/comments`, {
        comment: comment.trim(),
      });

      setComment("");
      setMessage("Comment added successfully!");

      await fetchDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add comment."
      );
    }
  };

  if (loading) return <p>Loading ticket details...</p>;

  if (error && !ticket) {
    return <p className="error-message">{error}</p>;
  }

  if (!ticket) return <p>Ticket not found.</p>;

  const totalAmount = lineItems.reduce(
    (total, item) => total + Number(item.line_total || 0),
    0
  );

  const canEdit =
    ticket.status === "Draft" ||
    ticket.status === "Rejected";

  return (
    <div className="page-container">
      <h1>Ticket Details</h1>

      <Link to="/tickets">Back to My Tickets</Link>

      {error && <p className="error-message">{error}</p>}
      {message && <p>{message}</p>}

      {/* Ticket Information */}
      <div className="ticket-card">
        <h2>{ticket.ticket_number}</h2>

        {isEditingTicket ? (
          <form onSubmit={updateTicket} className="ticket-form">
            <h3>Edit Ticket</h3>

            <label>Customer Name</label>
            <input
              name="customer_name"
              value={ticketEditForm.customer_name}
              onChange={handleTicketEditChange}
              required
            />

            <label>Work Start Date</label>
            <input
              type="date"
              name="work_start_date"
              value={ticketEditForm.work_start_date}
              onChange={handleTicketEditChange}
            />

            <label>Work End Date</label>
            <input
              type="date"
              name="work_end_date"
              value={ticketEditForm.work_end_date}
              onChange={handleTicketEditChange}
            />

            <label>Custom Fields (JSON)</label>
            <textarea
              name="custom_fields"
              value={ticketEditForm.custom_fields}
              onChange={handleTicketEditChange}
              rows="5"
            />

            <button type="submit">Save Ticket Changes</button>

            <button type="button" onClick={cancelTicketEdit}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p>
              <strong>Customer:</strong> {ticket.customer_name}
            </p>

            <p>
              <strong>Status:</strong> {ticket.status}
            </p>

            <p>
              <strong>Start Date:</strong>{" "}
              {ticket.work_start_date || "N/A"}
            </p>

            <p>
              <strong>End Date:</strong>{" "}
              {ticket.work_end_date || "N/A"}
            </p>

            <p>
              <strong>Template:</strong>{" "}
              {ticket.template_name || "N/A"}
            </p>

            {ticket.rejection_reason && (
              <p>
                <strong>Rejection Reason:</strong>{" "}
                {ticket.rejection_reason}
              </p>
            )}

            {canEdit && (
              <button type="button" onClick={startTicketEdit}>
                Edit Ticket
              </button>
            )}

            {/* Admin Final Status Buttons */}
            {isAdmin && ticket.status === "Approved" && (
              <div>
                <h3>Final Ticket Actions</h3>

                <button
                  type="button"
                  onClick={() => updateFinalStatus("Invoiced")}
                >
                  Mark as Invoiced
                </button>

                <button
                  type="button"
                  onClick={() => updateFinalStatus("Void")}
                >
                  Mark as Void
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Line Items */}
      <h2>Service & Material Line Items</h2>

      {canEdit && (
        <form onSubmit={addLineItem} className="ticket-form">
          <h3>Add New Line Item</h3>

          <label>Item Type</label>
          <select
            name="item_type"
            value={form.item_type}
            onChange={handleChange}
          >
            <option value="service">Service</option>
            <option value="material">Material</option>
          </select>

          <label>Description</label>
          <input
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Enter description"
            required
          />

          <label>Quantity</label>
          <input
            type="number"
            name="quantity"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={handleChange}
            required
          />

          <label>Unit Price</label>
          <input
            type="number"
            name="unit_price"
            min="0"
            step="0.01"
            value={form.unit_price}
            onChange={handleChange}
            required
          />

          <button type="submit">Add Line Item</button>
        </form>
      )}

      {/* Existing Line Items */}
      <div className="ticket-list">
        {lineItems.length === 0 ? (
          <p>No line items available.</p>
        ) : (
          lineItems.map((item) => (
            <div className="ticket-card" key={item.id}>
              {editingItemId === item.id ? (
                <form
                  onSubmit={(e) => updateLineItem(e, item.id)}
                  className="ticket-form"
                >
                  <h3>Edit Line Item</h3>

                  <label>Item Type</label>
                  <select
                    name="item_type"
                    value={editForm.item_type}
                    onChange={handleEditChange}
                  >
                    <option value="service">Service</option>
                    <option value="material">Material</option>
                  </select>

                  <label>Description</label>
                  <input
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    required
                  />

                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min="0.01"
                    step="0.01"
                    value={editForm.quantity}
                    onChange={handleEditChange}
                    required
                  />

                  <label>Unit Price</label>
                  <input
                    type="number"
                    name="unit_price"
                    min="0"
                    step="0.01"
                    value={editForm.unit_price}
                    onChange={handleEditChange}
                    required
                  />

                  <button type="submit">Update Line Item</button>

                  <button type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <p>
                    <strong>Type:</strong> {item.item_type}
                  </p>

                  <p>
                    <strong>Description:</strong> {item.description}
                  </p>

                  <p>
                    <strong>Quantity:</strong> {item.quantity}
                  </p>

                  <p>
                    <strong>Unit Price:</strong> ₹{item.unit_price}
                  </p>

                  <p>
                    <strong>Line Total:</strong> ₹{item.line_total}
                  </p>

                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteLineItem(item.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      <h2>Total Amount: ₹{totalAmount.toFixed(2)}</h2>

      <hr />

      {/* Comments */}
      <h2>Ticket Comments</h2>

      <form onSubmit={addComment} className="ticket-form">
        <label>Add Comment</label>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your comment here..."
          required
        />

        <button type="submit">Add Comment</button>
      </form>

      <h3>Previous Comments</h3>

      {comments.length === 0 ? (
        <p>No comments available.</p>
      ) : (
        <div className="ticket-list">
          {comments.map((item) => (
            <div className="ticket-card" key={item.id}>
              <p>{item.comment}</p>

              <small>
                {item.created_at
                  ? new Date(item.created_at).toLocaleString()
                  : ""}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TicketDetails;
