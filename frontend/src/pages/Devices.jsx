
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Devices() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [registering, setRegistering] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const [form, setForm] = useState({
    device_name: "",
    device_identifier: "",
  });

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        isAdmin ? "/devices" : "/devices/my-devices"
      );

      setDevices(response.data.devices || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load devices."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const activeCount = devices.filter(
    (device) => device.is_active
  ).length;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const registerDevice = async (e) => {
    e.preventDefault();

    if (activeCount >= 5) {
      setError("Maximum 5 active devices are allowed per account.");
      return;
    }

    try {
      setRegistering(true);
      setError("");
      setMessage("");

      await api.post("/devices/register", {
        device_name: form.device_name.trim(),
        device_identifier: form.device_identifier.trim(),
      });

      setMessage("Device registered successfully!");

      setForm({
        device_name: "",
        device_identifier: "",
      });

      await fetchDevices();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to register device."
      );
    } finally {
      setRegistering(false);
    }
  };

  const revokeDevice = async (deviceId) => {
    const confirmed = window.confirm(
      "Are you sure you want to revoke this device?"
    );

    if (!confirmed) return;

    try {
      setRevokingId(deviceId);
      setError("");
      setMessage("");

      await api.patch(`/devices/${deviceId}/revoke`);

      setMessage("Device revoked successfully!");

      await fetchDevices();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to revoke device."
      );
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="page-container devices-page">
      <div className="page-header">
        <div>
          <h1>Device Management</h1>
          <p>
            {isAdmin
              ? "Monitor and manage registered account devices."
              : "Register and manage devices connected to your account."}
          </p>
        </div>

        <Link to={isAdmin ? "/admin" : "/dashboard"} className="btn">
          ← Back to Dashboard
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="device-summary-grid">
        <div className="device-summary-card">
          <span>{isAdmin ? "Total Active Devices" : "My Active Devices"}</span>
          <strong>{activeCount}</strong>
        </div>

        <div className="device-summary-card">
          <span>Total Registered Devices</span>
          <strong>{devices.length}</strong>
        </div>

        <div className="device-summary-card">
          <span>Revoked Devices</span>
          <strong>{devices.filter((d) => !d.is_active).length}</strong>
        </div>
      </div>

      {!isAdmin && (
        <section className="device-register-section">
          <div>
            <h2>Register New Device</h2>
            <p>Maximum 5 active devices are allowed per account.</p>
          </div>

          <div className="device-limit">
            <strong>{activeCount} / 5</strong>
            <span>Active devices</span>
          </div>

          {activeCount >= 5 && (
            <p className="device-limit-warning">
              You have reached the maximum active device limit.
              Revoke an existing device before registering another.
            </p>
          )}

          <form onSubmit={registerDevice} className="device-form">
            <div className="device-form-field">
              <label>Device Name *</label>
              <input
                name="device_name"
                value={form.device_name}
                onChange={handleChange}
                placeholder="Example: My Laptop"
                required
              />
            </div>

            <div className="device-form-field">
              <label>Device Identifier *</label>
              <input
                name="device_identifier"
                value={form.device_identifier}
                onChange={handleChange}
                placeholder="Example: LAPTOP-001"
                required
              />
            </div>

            <button
              type="submit"
              disabled={registering || activeCount >= 5}
            >
              {registering ? "Registering..." : "Register Device"}
            </button>
          </form>
        </section>
      )}

      <section className="device-list-section">
        <div className="device-section-heading">
          <div>
            <h2>{isAdmin ? "All Registered Devices" : "My Devices"}</h2>
            <p>View device details and registration activity.</p>
          </div>

          <button type="button" onClick={fetchDevices}>
            ↻ Refresh
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="empty-state">
            <h3>No Devices Found</h3>
            <p>
              {isAdmin
                ? "No devices have been registered yet."
                : "Register your first device to get started."}
            </p>
          </div>
        ) : (
          <div className="device-list">
            {devices.map((device) => (
              <article className="device-card" key={device.id}>
                <div className="device-card-header">
                  <div className="device-icon">PC</div>

                  <div className="device-title">
                    <h3>{device.device_name}</h3>
                    <span>Device #{device.id}</span>
                  </div>

                  <span
                    className={
                      device.is_active
                        ? "device-status device-active"
                        : "device-status device-revoked"
                    }
                  >
                    {device.is_active ? "Active" : "Revoked"}
                  </span>
                </div>

                {isAdmin && (
                  <div className="device-info-row">
                    <span>Account User</span>
                    <strong>
                      {device.user_name || device.name || "N/A"}
                    </strong>
                  </div>
                )}

                <div className="device-info-row">
                  <span>Device Identifier</span>
                  <strong>{device.device_identifier}</strong>
                </div>

                <div className="device-info-row">
                  <span>Last Active</span>
                  <strong>{formatDate(device.last_active_at)}</strong>
                </div>

                {isAdmin && device.is_active && (
                  <button
                    type="button"
                    className="device-revoke-button"
                    disabled={revokingId === device.id}
                    onClick={() => revokeDevice(device.id)}
                  >
                    {revokingId === device.id
                      ? "Revoking..."
                      : "Revoke Device"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Devices;
