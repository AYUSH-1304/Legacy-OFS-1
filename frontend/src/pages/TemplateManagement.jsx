
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const emptyForm = {
  template_key: "",
  name: "",
  description: "",
  fields: [
    { name: "customer_name", type: "text", required: true },
    { name: "work_start_date", type: "date", required: true },
    { name: "work_end_date", type: "date", required: false },
    { name: "comments", type: "textarea", required: false },
  ],
  is_active: true,
};

function TemplateManagement() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/templates");
      setTemplates(response.data.templates || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load templates."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  let cancelled = false;

  const loadInitialTemplates = async () => {
    try {
      const response = await api.get("/templates");

      if (!cancelled) {
        setTemplates(response.data.templates || []);
        setError("");
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err.response?.data?.message || "Unable to load templates."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  loadInitialTemplates();

  return () => {
    cancelled = true;
  };
}, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFieldChange = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index ? { ...field, [key]: value } : field
      ),
    }));
  };

  const addField = () => {
    setForm((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        { name: "", type: "text", required: false },
      ],
    }));
  };

  const removeField = (index) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const validFields = form.fields.every(
      (field) => field.name.trim() && field.type.trim()
    );

    if (!form.template_key.trim() || !form.name.trim()) {
      setError("Template key and name are required.");
      return;
    }

    if (!validFields) {
      setError("Please enter a name and type for every field.");
      return;
    }

    const payload = {
      ...form,
      template_key: form.template_key.trim(),
      name: form.name.trim(),
      fields: form.fields.map((field) => ({
        ...field,
        name: field.name.trim(),
      })),
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/templates/${editingId}`, payload);
        setMessage("Template updated successfully.");
      } else {
        await api.post("/templates", payload);
        setMessage("Template created successfully.");
      }

      setForm(emptyForm);
      setEditingId(null);
      await fetchTemplates();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save template."
      );
    } finally {
      setSaving(false);
    }
  };

  const editTemplate = (template) => {
    setEditingId(template.id);

    setForm({
      template_key: template.template_key || "",
      name: template.name || "",
      description: template.description || "",
      fields: Array.isArray(template.fields) ? template.fields : [],
      is_active: template.is_active,
    });

    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleStatus = async (template) => {
    const newStatus = !template.is_active;

    const confirmed = window.confirm(
      `${newStatus ? "Activate" : "Deactivate"} ${template.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.patch(`/templates/${template.id}/status`, {
        is_active: newStatus,
      });

      setMessage("Template status updated successfully.");
      await fetchTemplates();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update template status."
      );
    }
  };

  return (
    <div className="page-container">
      <h1>Template Management</h1>

      <p>
        <Link to="/admin">Admin Dashboard</Link>
        {" | "}
        <Link to="/dashboard">Main Dashboard</Link>
      </p>

      <hr />

      <h2>{editingId ? "Edit Template" : "Create New Template"}</h2>

      {error && <p className="error-message">{error}</p>}
      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Template Key</label>
          <input
            name="template_key"
            value={form.template_key}
            onChange={handleChange}
            placeholder="field_service_ticket"
            required
            disabled={Boolean(editingId)}
          />
        </div>

        <div>
          <label>Template Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Field Service Ticket"
            required
          />
        </div>

        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Enter template description"
          />
        </div>

        <h3>Template Fields</h3>

        {form.fields.map((field, index) => (
          <div key={index} className="ticket-card">
            <label>Field Name</label>
            <input
              value={field.name}
              onChange={(e) =>
                handleFieldChange(index, "name", e.target.value)
              }
              placeholder="Field name"
              required
            />

            <label>Field Type</label>
            <select
              value={field.type}
              onChange={(e) =>
                handleFieldChange(index, "type", e.target.value)
              }
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="textarea">Textarea</option>
              <option value="checkbox">Checkbox</option>
            </select>

            <label>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  handleFieldChange(index, "required", e.target.checked)
                }
              />
              Required
            </label>

            <button
              type="button"
              onClick={() => removeField(index)}
            >
              Remove Field
            </button>
          </div>
        ))}

        <button type="button" onClick={addField}>
          + Add Field
        </button>

        <div>
          <label>
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            Active Template
          </label>
        </div>

        <button type="submit" disabled={saving}>
          {saving
            ? "Saving..."
            : editingId
              ? "Update Template"
              : "Create Template"}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm}>
            Cancel Edit
          </button>
        )}
      </form>

      <hr />

      <h2>All Templates ({templates.length})</h2>

      <button type="button" onClick={fetchTemplates}>
        Refresh Templates
      </button>

      {loading && <p>Loading templates...</p>}

      {!loading && templates.length === 0 && (
        <p>No templates found.</p>
      )}

      {templates.map((template) => (
        <div className="ticket-card" key={template.id}>
          <h3>{template.name}</h3>

          <p><strong>ID:</strong> {template.id}</p>
          <p><strong>Key:</strong> {template.template_key}</p>
          <p><strong>Description:</strong> {template.description || "N/A"}</p>
          <p>
            <strong>Status:</strong>{" "}
            {template.is_active ? "Active" : "Inactive"}
          </p>
          <p>
            <strong>Fields:</strong>{" "}
            {Array.isArray(template.fields)
              ? template.fields.length
              : 0}
          </p>

          <button onClick={() => editTemplate(template)}>
            Edit
          </button>

          <button onClick={() => toggleStatus(template)}>
            {template.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default TemplateManagement;
