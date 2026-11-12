
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { saveOfflineTicket } from "../services/offlineSync";

function CreateTicket() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [form, setForm] = useState({
    template_key: "",
    customer_name: "",
    work_start_date: "",
    work_end_date: "",
  });

  const [customFields, setCustomFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await api.get("/templates");
        const data = response.data;

        const loadedTemplates = Array.isArray(data)
          ? data
          : data.templates || [];

        setTemplates(loadedTemplates);

        localStorage.setItem(
          "legacy_ofs_templates",
          JSON.stringify(loadedTemplates)
        );
      } catch {
        const cachedTemplates = JSON.parse(
          localStorage.getItem("legacy_ofs_templates") || "[]"
        );

        setTemplates(cachedTemplates);

        if (cachedTemplates.length === 0) {
          setError("Templates unavailable. Connect to internet first.");
        }
      }
    };

    loadTemplates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "template_key") {
      const template = templates.find(
        (item) => item.template_key === value
      );

      setSelectedTemplate(template || null);
      setCustomFields({});
    }
  };

  const handleCustomFieldChange = (name, value) => {
    setCustomFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const renderField = (field) => {
    const fieldName = field.name;
    const fieldType = field.type?.toLowerCase();
    const value = customFields[fieldName] ?? "";

    return (
      <div className="create-field" key={fieldName}>
        <label>
          {field.label || fieldName.replaceAll("_", " ")}
          {field.required ? " *" : ""}
        </label>

        {fieldType === "textarea" ? (
          <textarea
            value={value}
            required={field.required}
            onChange={(e) =>
              handleCustomFieldChange(fieldName, e.target.value)
            }
            placeholder={`Enter ${fieldName.replaceAll("_", " ")}`}
          />
        ) : (
          <input
            type={
              ["text", "number", "date", "email"].includes(fieldType)
                ? fieldType
                : "text"
            }
            value={value}
            required={field.required}
            onChange={(e) =>
              handleCustomFieldChange(fieldName, e.target.value)
            }
            placeholder={`Enter ${fieldName.replaceAll("_", " ")}`}
            step={fieldType === "number" ? "any" : undefined}
          />
        )}
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.template_key || !form.customer_name.trim()) {
      setError("Template and Customer Name are required.");
      return;
    }

    if (!selectedTemplate?.id) {
      setError("Selected template is invalid. Please select again.");
      return;
    }

    if (
      form.work_start_date &&
      form.work_end_date &&
      form.work_end_date < form.work_start_date
    ) {
      setError("Work End Date cannot be before Work Start Date.");
      return;
    }

    setLoading(true);

    const payload = {
      template_id: selectedTemplate.id,
      customer_name: form.customer_name.trim(),
      work_start_date: form.work_start_date || null,
      work_end_date: form.work_end_date || null,
      custom_fields: customFields,
    };

    try {
      if (!navigator.onLine) {
        saveOfflineTicket(payload);
        alert("Ticket saved offline! It will sync when internet returns.");
        navigate("/offline-tickets");
        return;
      }

      await api.post("/tickets", {
        template_key: form.template_key,
        customer_name: payload.customer_name,
        work_start_date: payload.work_start_date,
        work_end_date: payload.work_end_date,
        custom_fields: payload.custom_fields,
        line_items: [],
      });

      alert("Ticket created successfully!");
      navigate("/tickets");
    } catch (err) {
      if (!err.response && selectedTemplate?.id) {
        try {
          saveOfflineTicket(payload);
          alert("Server unavailable. Ticket saved locally for later sync.");
          navigate("/offline-tickets");
        } catch {
          setError("Unable to save ticket locally.");
        }
      } else {
        setError(
          err.response?.data?.message || "Unable to create ticket."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Create New Ticket</h1>
          <p>Create a field service ticket or inspection report.</p>
        </div>

        <Link to="/tickets" className="btn">
          ← My Tickets
        </Link>
      </div>

      <div className="create-connection">
        <span className={isOnline ? "online-dot" : "offline-dot"} />
        <strong>{isOnline ? "Online Mode" : "Offline Mode"}</strong>
        <span>
          {isOnline
            ? "Ticket will be saved to the server."
            : "Ticket will be saved locally for later synchronization."}
        </span>
      </div>

      <form className="ticket-form create-ticket-form" onSubmit={handleSubmit}>
        {error && <p className="error-message">{error}</p>}

        <section className="create-form-section">
          <h2>Ticket Information</h2>
          <p>Select a template and enter customer details.</p>

          <div className="create-field">
            <label>Ticket Template *</label>
            <select
              name="template_key"
              value={form.template_key}
              onChange={handleChange}
              required
            >
              <option value="">Select Template</option>

              {templates.map((template) => (
                <option key={template.id} value={template.template_key}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="create-field">
            <label>Customer Name *</label>
            <input
              name="customer_name"
              value={form.customer_name}
              onChange={handleChange}
              placeholder="Enter customer name"
              required
            />
          </div>

          <div className="create-date-grid">
            <div className="create-field">
              <label>Work Start Date</label>
              <input
                type="date"
                name="work_start_date"
                value={form.work_start_date}
                onChange={handleChange}
              />
            </div>

            <div className="create-field">
              <label>Work End Date</label>
              <input
                type="date"
                name="work_end_date"
                value={form.work_end_date}
                onChange={handleChange}
                min={form.work_start_date || undefined}
              />
            </div>
          </div>
        </section>

        {selectedTemplate && (
          <section className="create-form-section">
            <h2>{selectedTemplate.name} Fields</h2>
            <p>Complete the additional information for this template.</p>

            <div className="create-custom-fields">
              {(selectedTemplate.fields || []).map(renderField)}
            </div>
          </section>
        )}

        <div className="create-form-actions">
          <button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isOnline
                ? "Create Ticket"
                : "Save Ticket Offline"}
          </button>

          <Link to="/tickets" className="cancel-link">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default CreateTicket;
