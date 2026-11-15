// Runs once before the test suite. Tests run in Kansas City time so date handling is
// checked the way the app is really used: evenings there are already "tomorrow" in UTC,
// which is exactly what the old date bug got wrong.
module.exports = async () => {
  process.env.TZ = "America/Chicago";
};
