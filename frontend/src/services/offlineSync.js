
const ACTIONS_KEY = "legacy_ofs_offline_actions";
const TICKETS_KEY = "legacy_ofs_offline_tickets";

// Generate unique local ID
const generateLocalId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

// Read pending actions
export const getOfflineActions = () => {
  try {
    return JSON.parse(localStorage.getItem(ACTIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

// Read locally saved tickets
export const getOfflineTickets = () => {
  try {
    return JSON.parse(localStorage.getItem(TICKETS_KEY) || "[]");
  } catch {
    return [];
  }
};

// Save a ticket locally
export const saveOfflineTicket = (ticketData) => {
  const localId = generateLocalId();

  const ticket = {
    local_id: localId,
    ...ticketData,
    local_status: "Pending Sync",
    created_at: new Date().toISOString(),
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
    };
  }

  try {
    const response = await api.post("/sync", {
      actions,
    });

    const results = response.data.results || [];

    const successfulIds = results
      .filter((result) =>
        ["synced", "already_synced"].includes(result.status)
      )
      .map((result) => result.local_id);

    const remainingActions = actions.filter(
      (action) => !successfulIds.includes(action.local_id)
    );

    const tickets = getOfflineTickets().map((ticket) => {
      if (successfulIds.includes(ticket.local_id)) {
        const result = results.find(
          (item) => item.local_id === ticket.local_id
        );

        return {
          ...ticket,
          local_status: "Synced",
          server_ticket_id: result?.ticket?.id || null,
          sync_message: result?.status || "synced",
        };
      }

      const failedResult = results.find(
        (item) => item.local_id === ticket.local_id
      );

      if (failedResult?.status === "failed") {
        return {
          ...ticket,
          local_status: "Failed",
          sync_message: failedResult.message,
        };
      }

      return ticket;
    });

    localStorage.setItem(
      ACTIONS_KEY,
      JSON.stringify(remainingActions)
    );

    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));

    return {
      success: true,
      results,
      message: "Offline sync completed.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Unable to sync offline data.",
    };
  }
};
