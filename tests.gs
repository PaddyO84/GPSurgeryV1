function testReportError() {
  const mockError = new Error("This is a test error");
  mockError.name = "TestError";
  mockError.stack = "Stack trace line 1\nStack trace line 2";

  // Mock MailApp
  const mockMailApp = {
    sendEmail: function(message) {
      console.log("MailApp.sendEmail called with:", message);
      if (!message.to || !message.subject || !message.htmlBody) {
        throw new Error("MailApp.sendEmail called with invalid arguments");
      }
    }
  };
  // Replace the real MailApp with the mock
  const realMailApp = MailApp;
  MailApp = mockMailApp;

  try {
    console.log("Running testReportError...");
    reportError("testFunction", mockError, 123);
    console.log("testReportError completed successfully.");
  } catch (e) {
    console.error("testReportError failed:", e);
  } finally {
    // Restore the real MailApp
    MailApp = realMailApp;
  }
}
