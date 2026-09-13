const { expect } = require("chai");
const DOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

describe("Security - XSS via innerHTML", function () {
  function getSanitizedHTML(htmlContent, isEnabled) {
    const window = new JSDOM("").window;
    const purify = DOMPurify(window);
    return isEnabled ? purify.sanitize(htmlContent) : htmlContent;
  }

  it("should sanitize malicious input when ENABLE_DOMPURIFY is true", () => {
    const maliciousHTML =
      "<p><strong>Name:</strong> <script>alert(1)</script>Bad Guy</p>";
    const safeHTML = getSanitizedHTML(maliciousHTML, true);
    expect(safeHTML).to.not.include("<script>");
    expect(safeHTML).to.include("<p><strong>Name:</strong> Bad Guy</p>");
  });

  it("should leave malicious input when ENABLE_DOMPURIFY is false", () => {
    const maliciousHTML =
      "<p><strong>Name:</strong> <script>alert(1)</script>Bad Guy</p>";
    const safeHTML = getSanitizedHTML(maliciousHTML, false);
    expect(safeHTML).to.include("<script>alert(1)</script>");
  });

  it("should render normal content correctly when ENABLE_DOMPURIFY is true", () => {
    const normalHTML =
      "<p><strong>Name:</strong> John Doe</p><p><strong>Dates:</strong> 2023-01-01 to 2023-01-10</p>";
    const safeHTML = getSanitizedHTML(normalHTML, true);
    expect(safeHTML).to.equal(normalHTML);
  });

  it("should render normal content correctly when ENABLE_DOMPURIFY is false", () => {
    const normalHTML =
      "<p><strong>Name:</strong> John Doe</p><p><strong>Dates:</strong> 2023-01-01 to 2023-01-10</p>";
    const safeHTML = getSanitizedHTML(normalHTML, false);
    expect(safeHTML).to.equal(normalHTML);
  });
});
