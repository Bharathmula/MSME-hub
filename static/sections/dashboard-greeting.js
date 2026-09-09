/* Time-based greeting shown at the top of the Overview dashboard. */
(function () {
  function greetingForHour(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }

  function updateGreeting() {
    const eyebrow = document.querySelector(
      "#view-root .page-heading .eyebrow",
    );
    if (eyebrow?.textContent.trim().toUpperCase() !== "ADMIN CONTROL CENTRE") {
      return;
    }

    const heading = document.querySelector("#view-root .page-heading h1");
    if (!heading) return;

    const administratorName = admin?.name || "MSME Manager";
    const expectedGreeting = `${greetingForHour(new Date().getHours())}, ${administratorName}.`;

    // Avoid retriggering this child-list observer when the greeting is already correct.
    if (heading.textContent !== expectedGreeting) {
      heading.textContent = expectedGreeting;
    }
  }

  const root = document.getElementById("view-root");
  if (root) {
    new MutationObserver(updateGreeting).observe(root, {
      childList: true,
      subtree: true,
    });
  }

  updateGreeting();
})();
