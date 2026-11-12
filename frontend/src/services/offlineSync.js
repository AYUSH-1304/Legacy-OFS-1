
const ACTIONS_KEY = "legacy_ofs_offline_actions";
const TICKETS_KEY = "legacy_ofs_offline_tickets";

// Generate unique local ID
const generateLocalId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

// Safely read localStorage
const readStorage = (key) => {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);
    return [];
  }
};

// Read pending actions
export const getOfflineActions = () => {
  return readStorage(ACTIONS_KEY);
};

// Read locally saved tickets
export const getOfflineTickets = () => {
  return readStorage(TICKETS_KEY);
};

// Save a ticket locally
export const saveOfflineTicket = (ticketData) => {
  const localId = generateLocalId();

  const ticket = {
    ...ticketData,
    local_id: localId,
    local_status: "Pending Sync",
    created_at: new Date().toISOString(),
    sync_message: "Waiting for internet connection.",
  };

  const actions = getOfflineActions();
  const tickets = getOfflineTickets();

  actions.push({
    local_id: localId,
    type: "create_ticket",
    data: ticketData,
  });

  tickets.push(ticket);

  localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));

  return ticket;
};

// Sync pending actions with backend
export const syncOfflineActions = async (api) => {
  if (!navigator.onLine) {
    return {
      success: false,
      message: "Internet connection is unavailable.",
    };
  }

  const actions = getOfflineActions();

  if (actions.length === 0) {
    return {
      success: true,
      message: "No pending actions to sync.",
      syncedCount: 0,
      failedCount: 0,
      pendingCount: 0,
    };
  }

  // Mark tickets as syncing
  const ticketsBeforeSync = getOfflineTickets();

  const syncingTickets = ticketsBeforeSync.map((ticket) => {
    const isPending = actions.some(
      (action) => action.local_id === ticket.local_id
    );

    return isPending
      ? {
          ...ticket,
          local_status: "Syncing",
          sync_message: "Sending data to server...",
        }
      : ticket;
  });

  localStorage.setItem(
    TICKETS_KEY,
    JSON.stringify(syncingTickets)
  );

  try {
    const response = await api.post("/sync", {
      actions,
    });

    const results = response.data?.results;

    // Never remove actions if the server response is unexpected
    if (!Array.isArray(results)) {
      localStorage.setItem(
        TICKETS_KEY,
        JSON.stringify(
          getOfflineTickets().map((ticket) => ({
            ...ticket,
            local_status: "Failed",
            sync_message: "Unexpected response from server.",
          }))
        )
      );

      return {
        success: false,
        message: "Invalid sync response. Pending actions were preserved.",
      };
    }

    const successfulIds = results
      .filter((result) =>
        ["synced", "already_synced"].includes(result.status)
      )
      .map((result) => result.local_id)
      .filter(Boolean);

    const failedResults = results.filter(
      (result) => result.status === "failed"
    );

    const remainingActions = actions.filter(
      (action) => !successfulIds.includes(action.local_id)
    );

    const updatedTickets = getOfflineTickets().map((ticket) => {
      const result = results.find(
        (item) => item.local_id === ticket.local_id
      );

      if (
        result &&
        ["synced", "already_synced"].includes(result.status)
      ) {
        return {
          ...ticket,
          local_status: "Synced",
          server_ticket_id: result.ticket?.id || null,
          sync_message: "Successfully synced with server.",
          synced_at: new Date().toISOString(),
        };
      }

      if (result?.status === "failed") {
        return {
          ...ticket,
          local_status: "Failed",
          sync_message:
            result.message || "Sync failed. Please try again.",
        };
      }

      // Keep unresolved actions pending for a future retry
      const stillPending = remainingActions.some(
        (action) => action.local_id === ticket.local_id
      );

      if (stillPending) {
        return {
          ...ticket,
          local_status: "Pending Sync",
        };
      }

      return ticket;
    });

    localStorage.setItem(
      ACTIONS_KEY,
      JSON.stringify(remainingActions)
    );

    localStorage.setItem(
      TICKETS_KEY,
      JSON.stringify(updatedTickets)
    );

    const syncedCount = successfulIds.length;
    const failedCount = failedResults.length;

    return {
      success: failedCount === 0 && remainingActions.length === 0,
      results,
      syncedCount,
      failedCount,
      pendingCount: remainingActions.length,
      message:
        failedCount > 0 || remainingActions.length > 0
          ? `${syncedCount} action(s) synced. ${remainingActions.length} action(s) still pending.`
          : `${syncedCount} action(s) synced successfully.`,
    };
  } catch (error) {
    // Keep all actions so the user can retry later
    const currentTickets = getOfflineTickets().map((ticket) => {
      const hasPendingAction = actions.some(
        (action) => action.local_id === ticket.local_id
      );

      return hasPendingAction
        ? {
            ...ticket,
            local_status: "Pending Sync",
            sync_message:
              error.response?.data?.message ||
              error.message ||
              "Network error. Please retry.",
          }
        : ticket;
    });

    localStorage.setItem(
      TICKETS_KEY,
      JSON.stringify(currentTickets)
    );

    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to sync offline data.",
      pendingCount: actions.length,
    };
  }
};
