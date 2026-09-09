/* Entrepreneur dashboard configuration. */
MSMEWorkforceDashboards.register("Entrepreneur", {
  label: "Entrepreneur",
  eyebrow: "ENTREPRENEUR AUTOMATIC ATTENDANCE",
  records: () => people.filter((person) => person.role === "Entrepreneur"),
});
