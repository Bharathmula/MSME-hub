MSMEComponentFactories.standard({
  id: "temporary-workers",
  view: "temporary",
  label: "Temporary Workers",
  heading: "TEMPORARY WORKER AUTOMATIC ATTENDANCE",
  required: [
    {
      name: "Automatic workforce table",
      selector: ".automatic-workforce-table",
    },
  ],
});
