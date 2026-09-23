/* Persist every company-scoped dashboard collection through the Python API. */
(function () {
  const COLLECTIONS = [
    "people",
    "ex",
    "temporary",
    "festivals",
    "festival-years",
    "attendance",
    "deleted-attendance",
    "contractors",
    "recycle-bin",
    "training-records",
    "dashboard-visibility",
    "attendance-integration-settings",
    "attendance-import-history",
  ];
  let hydrating = false;
  let saveTimer = null;
  let serverUpdatedAt = null;
  let saveQueue = Promise.resolve();
  let saveErrorShown = false;

  function tenantEmail() {
    return String(sessionStorage.getItem("msme-admin-auth") || "")
      .trim()
      .toLowerCase();
  }

  function tenantStorageKey(email, collection) {
    return `msme-tenant-${encodeURIComponent(email)}-${collection}`;
  }

  function pendingKey(email) {
    return `msme-workspace-pending-${encodeURIComponent(email)}`;
  }

  function revisionKey(email) {
    return `msme-workspace-revision-${encodeURIComponent(email)}`;
  }

  function parse(value) {
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  function publicAccount(email) {
    const accounts = parse(localStorage.getItem("msme-accounts")) || [];
    const account = accounts.find(
      (item) => String(item.email || "").toLowerCase() === email,
    ) || { email };
    const allowed = [
      "name",
      "company",
      "phone",
      "email",
      "country",
      "staff_count",
      "business_category",
      "address",
      "role",
      "provider",
      "email_updates",
    ];
    return Object.fromEntries(
      allowed.filter((key) => account[key] !== undefined).map((key) => [key, account[key]]),
    );
  }

  function snapshot(email) {
    const storage = {};
    COLLECTIONS.forEach((collection) => {
      const value = parse(localStorage.getItem(tenantStorageKey(email, collection)));
      if (value !== null) storage[collection] = value;
    });
    return {
      account: publicAccount(email),
      storage,
      schema_version: 1,
    };
  }

  async function api(path, options = {}) {
    const token = sessionStorage.getItem("msme-admin-api-token") || "";
    if (!token) throw new Error("A manager API session is required for database sync.");
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    let result = {};
    try {
      result = await response.json();
    } catch (_) {}
    if (!response.ok) throw new Error(result.error || "Workspace database request failed.");
    return result;
  }

  async function save() {
    const email = tenantEmail();
    if (!email || hydrating) return;
    const result = await api(`/api/workspace?email=${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify({
        ...snapshot(email),
        expected_updated_at: serverUpdatedAt,
      }),
    });
    serverUpdatedAt = result.updated_at || serverUpdatedAt;
    originalSetItem.call(localStorage, revisionKey(email), serverUpdatedAt || "");
    originalRemoveItem.call(localStorage, pendingKey(email));
    saveErrorShown = false;
    return result;
  }

  function scheduleSave() {
    if (hydrating || !tenantEmail()) return;
    originalSetItem.call(localStorage, pendingKey(tenantEmail()), "1");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveQueue = saveQueue
        .then(() => save())
        .catch((error) => {
          console.error("MSME workspace save failed", error);
          window.dispatchEvent(new CustomEvent("msme-workspace-save-error", {
            detail: { message: error.message },
          }));
          if (!saveErrorShown) {
            saveErrorShown = true;
            window.alert(`${error.message}\n\nReload this page before making more changes. Your newer database records were protected.`);
          }
        });
    }, 250);
  }

  async function load(emailValue) {
    const email = String(emailValue || tenantEmail()).trim().toLowerCase();
    if (!email) return;
    const workspace = await api(`/api/workspace?email=${encodeURIComponent(email)}`);
    const pending = localStorage.getItem(pendingKey(email)) === "1";
    const localRevision = localStorage.getItem(revisionKey(email)) || null;
    if (pending) {
      const canRetry = !workspace.exists || !localRevision || localRevision === workspace.updated_at;
      if (!canRetry) {
        throw new Error("This company workspace changed after an earlier save failed. Your browser copy was kept; contact the administrator before replacing either version.");
      }
      serverUpdatedAt = workspace.updated_at || null;
      const recovered = await api(`/api/workspace?email=${encodeURIComponent(email)}`, {
        method: "PUT",
        body: JSON.stringify({
          ...snapshot(email),
          expected_updated_at: serverUpdatedAt,
        }),
      });
      serverUpdatedAt = recovered.updated_at || serverUpdatedAt;
      originalSetItem.call(localStorage, revisionKey(email), serverUpdatedAt || "");
      originalRemoveItem.call(localStorage, pendingKey(email));
      return { ...snapshot(email), exists: true, updated_at: serverUpdatedAt };
    }
    if (!workspace.exists) {
      const created = await api(`/api/workspace?email=${encodeURIComponent(email)}`, {
        method: "PUT",
        body: JSON.stringify(snapshot(email)),
      });
      serverUpdatedAt = created.updated_at || null;
      originalSetItem.call(localStorage, revisionKey(email), serverUpdatedAt || "");
      return { exists: false, storage: {} };
    }
    serverUpdatedAt = workspace.updated_at || null;
    originalSetItem.call(localStorage, revisionKey(email), serverUpdatedAt || "");
    const storage = workspace.storage || {};
    hydrating = true;
    try {
      COLLECTIONS.forEach((collection) => {
        const key = tenantStorageKey(email, collection);
        if (Object.prototype.hasOwnProperty.call(storage, collection)) {
          localStorage.setItem(key, JSON.stringify(storage[collection]));
        } else {
          localStorage.removeItem(key);
        }
      });
    } finally {
      hydrating = false;
    }
    return workspace;
  }

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (key, value) {
    originalSetItem.call(this, key, value);
    const email = tenantEmail();
    if (this === localStorage && email && key.startsWith(`msme-tenant-${encodeURIComponent(email)}-`)) {
      scheduleSave();
    }
  };
  Storage.prototype.removeItem = function (key) {
    originalRemoveItem.call(this, key);
    const email = tenantEmail();
    if (this === localStorage && email && key.startsWith(`msme-tenant-${encodeURIComponent(email)}-`)) {
      scheduleSave();
    }
  };

  window.MSMEWorkspaceDatabase = { load, save, snapshot };
})();
