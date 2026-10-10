/* Staff dashboard configuration. Edit Staff-specific labels here. */
MSMEWorkforceDashboards.register("Staff", {
  label: "Staff",
  eyebrow: "STAFF AUTOMATIC ATTENDANCE",
  records: () => people.filter((person) => person.role === "Staff"),
});
