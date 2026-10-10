/* Entrepreneur workforce-directory configuration. */
MSMEWorkforceDashboards.register("Entrepreneur", {
  label: "Entrepreneur",
  records: () => people.filter((person) => person.role === "Entrepreneur"),
});
