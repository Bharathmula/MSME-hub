/* Time-based greeting shown at the top of the Overview dashboard. */
(function () {
  function indiaHour(date = new Date()) {
    try {
      const hourPart = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Kolkata",
      }).formatToParts(date).find((part) => part.type === "hour");
      return Number(hourPart?.value || 0) % 24;
    } catch (_error) {
      return date.getHours();
    }
  }

  function greetingForHour(hour) {
    if (hour >= 5 && hour < 12) return "Good morning";
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
    const expectedGreeting = `${greetingForHour(indiaHour())}, ${administratorName}.`;

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
