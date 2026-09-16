/* Entrepreneur dashboard configuration. */
MSMEWorkforceDashboards.register("Entrepreneur", {
  label: "Entrepreneur",
  eyebrow: "ENTREPRENEUR DETAILS",
  attendance: false,
  records: () => people.filter((person) => person.role === "Entrepreneur"),
});
