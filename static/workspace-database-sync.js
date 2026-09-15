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
  ];
  let hydrating = false;
  let saveTimer = null;

  function tenantEmail() {
    return String(sessionStorage.getItem("msme-admin-auth") || "")
      .trim()
      .toLowerCase();
  }

  function tenantStorageKey(email, collection) {
    return `msme-tenant-${encodeURIComponent(email)}-${collection}`;
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
    await api(`/api/workspace?email=${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify(snapshot(email)),
    });
  }

  function scheduleSave() {
    if (hydrating || !tenantEmail()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      save().catch((error) => console.error("MSME workspace save failed", error));
    }, 250);
  }

  async function load(emailValue) {
    const email = String(emailValue || tenantEmail()).trim().toLowerCase();
    if (!email) return;
    const workspace = await api(`/api/workspace?email=${encodeURIComponent(email)}`);
    if (!workspace.exists) {
      await api(`/api/workspace?email=${encodeURIComponent(email)}`, {
        method: "PUT",
        body: JSON.stringify(snapshot(email)),
      });
      return { exists: false, storage: {} };
    }
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

  window.addEventListener("beforeunload", () => {
    if (!tenantEmail() || hydrating) return;
    const token = sessionStorage.getItem("msme-admin-api-token") || "";
    const base = String(window.MSME_EMPLOYEE_API_URL || "").replace(/\/$/, "");
    if (base && token) {
      fetch(`${base}/api/workspace`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(snapshot(tenantEmail())),
        keepalive: true,
      }).catch(() => {});
    }
  });

  window.MSMEWorkspaceDatabase = { load, save, snapshot };
})();
