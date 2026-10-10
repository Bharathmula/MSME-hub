/* Staff workforce-directory configuration. */
MSMEWorkforceDashboards.register("Staff", {
  label: "Staff",
  records: () => people.filter((person) => person.role === "Staff"),
});
