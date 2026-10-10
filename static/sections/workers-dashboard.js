/* Workers workforce-directory configuration. */
MSMEWorkforceDashboards.register("Worker", {
  label: "Worker",
  records: () => people.filter((person) => person.role === "Worker"),
});
