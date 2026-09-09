/* Workers dashboard configuration. Edit Worker-specific labels here. */
MSMEWorkforceDashboards.register("Worker", {
  label: "Worker",
  eyebrow: "WORKER AUTOMATIC ATTENDANCE",
  records: () => people.filter((person) => person.role === "Worker"),
});
