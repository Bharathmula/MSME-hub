/* Optional Clerk authentication for administrator Workspace access. */
(function () {
  const publishableKey = String(
    window.MSME_CLERK_PUBLISHABLE_KEY || "",
  ).trim();
  const frontendApiUrl = String(
    window.MSME_CLERK_FRONTEND_API_URL || "",
  ).replace(/\/$/, "");

  if (!publishableKey || !frontendApiUrl) return;

  function loadScript(source, attributes = {}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.defer = true;
      script.crossOrigin = "anonymous";

      Object.entries(attributes).forEach(([name, value]) => {
        script.setAttribute(name, value);
      });

      script.onload = resolve;
      script.onerror = () => reject(new Error("Clerk could not be loaded."));
      document.head.appendChild(script);
    });
  }

  function clerkAccount(user) {
    const primaryEmail = user?.primaryEmailAddress?.emailAddress || "";
    const primaryPhone = user?.primaryPhoneNumber?.phoneNumber || "";

    return {
      name: user?.fullName || user?.firstName || "MSME Administrator",
      email: primaryEmail || `${user.id}@clerk.msme.local`,
      phone: primaryPhone,
      provider: "clerk",
      clerk_user_id: user.id,
    };
  }

  function addClerkButton() {
    const form = document.querySelector("#owned-signin");
    if (!form || form.querySelector("#open-clerk-login")) return;

    const divider = document.createElement("div");
    divider.className = "auth-divider";
    divider.textContent = "OR";

    const button = document.createElement("button");
    button.type = "button";
    button.id = "open-clerk-login";
    button.className = "clerk-login-button";
    button.textContent = "Continue with email, Google or phone";
    button.onclick = () => window.Clerk.openSignIn();

    form.append(divider, button);
  }

  async function initializeClerk() {
    try {
      await loadScript(
        `${frontendApiUrl}/npm/@clerk/ui@1/dist/ui.browser.js`,
      );
      await loadScript(
        `${frontendApiUrl}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
        { "data-clerk-publishable-key": publishableKey },
      );

      await window.Clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
      });

      window.Clerk.addListener(({ user }) => {
        if (user && typeof window.MSMEOwnedAuthEnter === "function") {
          window.MSMEOwnedAuthEnter(clerkAccount(user));
        } else {
          addClerkButton();
        }
      });

      if (window.Clerk.user) {
        window.MSMEOwnedAuthEnter(clerkAccount(window.Clerk.user));
      } else {
        addClerkButton();
      }

      new MutationObserver(addClerkButton).observe(
        document.querySelector("#login-screen"),
        { childList: true, subtree: true },
      );
    } catch (error) {
      console.error("Clerk initialization failed:", error);
    }
  }

  initializeClerk();
})();
