MSMEComponentFactories.standard({
  id: "workers",
  view: "workers",
  label: "Workers",
  heading: "WORKER AUTOMATIC ATTENDANCE",
  required: [
    {
      name: "Automatic workforce table",
      selector: ".automatic-workforce-table",
    },
    {
      name: "Attendance Calendar link",
      selector: '[data-view="attendance"]',
    },
  ],
});
