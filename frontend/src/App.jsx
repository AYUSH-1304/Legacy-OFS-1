
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useEffect, useRef } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyTickets from "./pages/MyTickets";
import CreateTicket from "./pages/CreateTicket";
import AdminDashboard from "./pages/AdminDashboard";
import TicketDetails from "./pages/TicketDetails";
import Devices from "./pages/Devices";
import OfflineTickets from "./pages/OfflineTickets";
import TemplateManagement from "./pages/TemplateManagement";

import Navbar from "./components/Navbar";

import api from "./services/api";
import { syncOfflineActions } from "./services/offlineSync";

function ProtectedRoute({ children, adminOnly = false }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AutoSync() {
  const syncingRef = useRef(false);

  useEffect(() => {
    const runSync = async () => {
      if (!navigator.onLine || !localStorage.getItem("token")) {
        return;
      }

      if (syncingRef.current) return;

      syncingRef.current = true;

      try {
        const result = await syncOfflineActions(api);

        window.dispatchEvent(
          new CustomEvent("legacy-ofs-sync-complete", {
            detail: result,
          })
        );
      } catch (error) {
        console.error("Automatic sync error:", error);
      } finally {
        syncingRef.current = false;
      }
    };

    runSync();

    window.addEventListener("online", runSync);

    return () => {
      window.removeEventListener("online", runSync);
    };
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AutoSync />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Dashboard />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <MyTickets />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/create"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <CreateTicket />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <TicketDetails />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Devices />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <>
                <Navbar />
                <AdminDashboard />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/templates"
          element={
            <ProtectedRoute adminOnly>
              <>
                <Navbar />
                <TemplateManagement />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/offline-tickets"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <OfflineTickets />
              </>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
