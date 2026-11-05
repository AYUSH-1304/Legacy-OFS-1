
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
        err.response?.data?.message ||
        "Unable to load devices."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const registerDevice = async (e) => {
    e.preventDefault();

    try {
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
        err.response?.data?.message ||
        "Unable to register device."
      );
    }
  };

  const revokeDevice = async (deviceId) => {
    const confirmed = window.confirm(
      "Are you sure you want to revoke this device?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.patch(`/devices/${deviceId}/revoke`);

      setMessage("Device revoked successfully!");

      await fetchDevices();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to revoke device."
      );
    }
  };

  const activeCount = devices.filter(
    (device) => device.is_active
  ).length;

  if (loading) {
    return <p>Loading devices...</p>;
  }

  return (
    <div className="page-container">
      <h1>Device Management</h1>

      <Link to="/dashboard">Back to Dashboard</Link>

      {error && (
        <p className="error-message">{error}</p>
      )}

      {message && <p>{message}</p>}

      <div className="ticket-card">
        <h3>Device Summary</h3>

        <p>
          <strong>Active Devices:</strong>{" "}
          {activeCount} / 5
        </p>

        <p>
          Maximum 5 active devices are allowed per account.
        </p>
      </div>

      {!isAdmin && (
        <form
          onSubmit={registerDevice}
          className="ticket-form"
        >
          <h2>Register New Device</h2>

          <label>Device Name</label>

          <input
            name="device_name"
            value={form.device_name}
            onChange={handleChange}
            placeholder="Example: My Laptop"
            required
          />

          <label>Device Identifier</label>

          <input
            name="device_identifier"
            value={form.device_identifier}
            onChange={handleChange}
            placeholder="Example: LAPTOP-001"
            required
          />

          <button type="submit">
            Register Device
          </button>
        </form>
      )}

      <h2>
        {isAdmin ? "All Registered Devices" : "My Devices"}
      </h2>

      {devices.length === 0 ? (
        <p>No devices found.</p>
      ) : (
        <div className="ticket-list">
          {devices.map((device) => (
            <div
              className="ticket-card"
              key={device.id}
            >
              <h3>{device.device_name}</h3>

              <p>
                <strong>Device ID:</strong>{" "}
                {device.id}
              </p>

              {isAdmin && (
                <p>
                  <strong>User:</strong>{" "}
                  {device.user_name || device.name || "N/A"}
                </p>
              )}

              <p>
                <strong>Identifier:</strong>{" "}
                {device.device_identifier}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {device.is_active ? "Active" : "Revoked"}
              </p>

              <p>
                <strong>Last Active:</strong>{" "}
                {device.last_active_at
                  ? new Date(
                      device.last_active_at
                    ).toLocaleString()
                  : "N/A"}
              </p>

              {isAdmin && device.is_active && (
                <button
                  type="button"
                  onClick={() => revokeDevice(device.id)}
                >
                  Revoke Device
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Devices;
