const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

describe('Code.gs Google Apps Script tests', () => {
  let context;
  let logs;
  let sentEmails;
  let mockSpreadsheet;
  let mockSourceSheet;
  let mockArchiveSheet;
  let createdTriggers;

  function createMockSheet(name, initialData = []) {
    let rows = initialData.map(r => [...r]);
    return {
      getName: () => name,
      getLastRow: () => rows.length,
      getLastColumn: () => rows.length > 0 ? rows[0].length : 11,
      getRange: (startRow, startCol, numRows = 1, numCols = 1) => {
        return {
          getValue: () => {
            const rIndex = startRow - 1;
            const cIndex = startCol - 1;
            return (rows[rIndex] && rows[rIndex][cIndex] !== undefined) ? rows[rIndex][cIndex] : '';
          },
          getValues: () => {
            const result = [];
            for (let r = 0; r < (numRows || 1); r++) {
              const rowArr = [];
              const rIndex = startRow - 1 + r;
              for (let c = 0; c < (numCols || 1); c++) {
                const cIndex = startCol - 1 + c;
                rowArr.push((rows[rIndex] && rows[rIndex][cIndex] !== undefined) ? rows[rIndex][cIndex] : '');
              }
              result.push(rowArr);
            }
            return result;
          },
          setValue: (val) => {
            const rIndex = startRow - 1;
            const cIndex = startCol - 1;
            if (!rows[rIndex]) rows[rIndex] = [];
            rows[rIndex][cIndex] = val;
          },
          setValues: (valMatrix) => {
            for (let r = 0; r < valMatrix.length; r++) {
              const rIndex = startRow - 1 + r;
              if (!rows[rIndex]) rows[rIndex] = [];
              for (let c = 0; c < valMatrix[r].length; c++) {
                const cIndex = startCol - 1 + c;
                rows[rIndex][cIndex] = valMatrix[r][c];
              }
            }
          },
          copyTo: (targetRange) => {}
        };
      },
      appendRow: (rowArr) => {
        rows.push([...rowArr]);
      },
      deleteRow: (rowIndex) => {
        rows.splice(rowIndex - 1, 1);
      },
      _getRawRows: () => rows
    };
  }

  beforeEach(() => {
    logs = [];
    sentEmails = [];
    createdTriggers = [];

    const sourceHeaders = ["Timestamp", "Email", "Pharmacy", "Name", "Address", "Phone", "DOB", "Meds", "CommPref", "Status", "Notification"];
    mockSourceSheet = createMockSheet("Form responses 1", [sourceHeaders]);
    mockArchiveSheet = null;

    mockSpreadsheet = {
      getSheetByName: (name) => {
        if (name === "Form responses 1") return mockSourceSheet;
        if (name === "Archive") return mockArchiveSheet;
        return null;
      },
      insertSheet: (name) => {
        const newSheet = createMockSheet(name, [["Timestamp", "Email", "Pharmacy", "Name", "Address", "Phone", "DOB", "Meds", "CommPref", "Status", "Notification"]]);
        if (name === "Archive") mockArchiveSheet = newSheet;
        return newSheet;
      },
      getActiveRange: () => mockSourceSheet.getRange(2, 1, 1, 11),
      getActiveSheet: () => mockSourceSheet
    };

    const scriptPropertiesStore = { ADMIN_EMAIL: 'admin@example.com' };

    const mockMailApp = {
      sendEmail: (options) => {
        sentEmails.push(options);
      }
    };

    const mockLogger = {
      log: (msg) => { logs.push(String(msg)); }
    };

    const mockUtilities = {
      formatDate: (date, timeZone, format) => {
        const d = new Date(date);
        const pad = n => String(n).padStart(2, '0');
        if (format.includes("HH:mm:ss")) {
          return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
        return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
      }
    };

    const mockScriptApp = {
      getProjectTriggers: () => createdTriggers,
      newTrigger: (fnName) => {
        const triggerBuilder = {
          fnName,
          timeBased: () => triggerBuilder,
          onWeekDay: () => triggerBuilder,
          atHour: () => triggerBuilder,
          forSpreadsheet: () => triggerBuilder,
          onFormSubmit: () => triggerBuilder,
          create: () => {
            const trigger = {
              getHandlerFunction: () => fnName
            };
            createdTriggers.push(trigger);
            return trigger;
          }
        };
        return triggerBuilder;
      },
      WeekDay: { MONDAY: 1 }
    };

    const mockUi = {
      alert: (title, msg) => { logs.push(`UI Alert [${title}]: ${msg}`); },
      ButtonSet: { OK: 'OK' }
    };

    const mockSpreadsheetApp = {
      getActiveSpreadsheet: () => mockSpreadsheet,
      getUi: () => mockUi
    };

    const mockPropertiesService = {
      getScriptProperties: () => ({
        getProperty: (key) => scriptPropertiesStore[key] || null
      })
    };

    context = vm.createContext({
      SpreadsheetApp: mockSpreadsheetApp,
      MailApp: mockMailApp,
      Logger: mockLogger,
      Utilities: mockUtilities,
      ScriptApp: mockScriptApp,
      PropertiesService: mockPropertiesService,
      console,
      Date,
      parseInt,
      isNaN,
      Array,
      JSON,
      Error,
      mockSourceSheet,
      getMockArchiveSheet: () => mockArchiveSheet,
      logs,
      sentEmails,
      createdTriggers
    });

    const code = fs.readFileSync('Code.gs', 'utf8');
    vm.runInContext(code, context);
  });

  test('Item 16: sendReadyEmail catches MailApp.sendEmail error and logs it', () => {
    // Add row to source sheet
    context.mockSourceSheet.appendRow(["2024-01-01", "patient@example.com", "Carn Pharmacy", "John Doe", "Address", "0871234567", "1990-01-01", "Meds", "Email", "Sent to Pharmacy", "Processed on 01/01/2024"]);

    // Override MailApp.sendEmail to throw an error
    context.MailApp.sendEmail = () => {
      throw new Error("SMTP service unavailable");
    };

    context.sendReadyEmail(2);

    assert.ok(context.logs.some(log => log.includes("Error sending READY email for row 2: Error: SMTP service unavailable")));
  });

  test('Item 17: reportError catches MailApp.sendEmail error during error reporting and logs fallback', () => {
    // Override MailApp.sendEmail to throw an error
    context.MailApp.sendEmail = () => {
      throw new Error("Mail quota exceeded");
    };

    context.reportError('testFunction', new Error('Original error'), 5);

    assert.ok(context.logs.some(log => log.includes("Could not send error report email. Original error in testFunction: Original error.")));
  });

  test('Item 18: sendConfirmationNotification catches MailApp.sendEmail error and logs it', () => {
    context.MailApp.sendEmail = () => {
      throw new Error("Network timeout");
    };

    context.sendConfirmationNotification("Jane Doe", "jane@example.com", "Email");

    assert.ok(context.logs.some(log => log.includes("Failed to send confirmation email to jane@example.com for Jane Doe. Error: Error: Network timeout")));
  });

  test('Item 19: archiveOldRequests handles edge cases and invalid date formats gracefully', () => {
    // Add rows with invalid/malformed date formats
    context.mockSourceSheet.appendRow(["2024-01-01", "p1@ex.com", "Pharmacy", "P1", "Addr", "123", "DOB", "Meds", "Email", "Sent to Pharmacy", "Processed on INVALID_DATE"]);
    context.mockSourceSheet.appendRow(["2024-01-01", "p2@ex.com", "Pharmacy", "P2", "Addr", "123", "DOB", "Meds", "Email", "Sent to Pharmacy", "Processed on 99/99/2000"]);
    context.mockSourceSheet.appendRow(["2024-01-01", "p3@ex.com", "Pharmacy", "P3", "Addr", "123", "DOB", "Meds", "Email", "Sent to Pharmacy", "Not Processed"]);

    assert.doesNotThrow(() => {
      context.archiveOldRequests();
    });

    // None of these invalid rows should be deleted
    assert.equal(context.mockSourceSheet._getRawRows().length, 4); // Header + 3 rows
  });

  test('Item 20: archiveOldRequests correctly archives older rows to Archive sheet and deletes them from source sheet', () => {
    // Add old row (> 180 days ago: e.g. 01/01/2020)
    context.mockSourceSheet.appendRow(["2020-01-01", "old@ex.com", "Pharmacy", "Old Patient", "Addr", "123", "DOB", "Meds", "Email", "Sent to Pharmacy", "Processed on 01/01/2020"]);
    // Add recent row (Processed on today's date)
    const todayStr = context.Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy");
    context.mockSourceSheet.appendRow(["2024-01-01", "new@ex.com", "Pharmacy", "New Patient", "Addr", "123", "DOB", "Meds", "Email", "Sent to Pharmacy", "Processed on " + todayStr]);

    context.archiveOldRequests();

    const archiveSheet = context.getMockArchiveSheet();
    assert.ok(archiveSheet, "Archive sheet should have been created");
    assert.equal(archiveSheet._getRawRows().length, 2); // Header + 1 archived row
    assert.equal(archiveSheet._getRawRows()[1][3], "Old Patient");

    // Source sheet should now have Header + New Patient
    assert.equal(context.mockSourceSheet._getRawRows().length, 2);
    assert.equal(context.mockSourceSheet._getRawRows()[1][3], "New Patient");
  });

  test('Item 21: setupSystem creates Archive sheet and time-driven trigger if not present', () => {
    context.setupSystem();

    const archiveSheet = context.getMockArchiveSheet();
    assert.ok(archiveSheet, "Archive sheet should be created");
    assert.equal(context.createdTriggers.length, 1);
    assert.equal(context.createdTriggers[0].getHandlerFunction(), 'archiveOldRequests');
    assert.ok(context.logs.some(l => l.includes("Setup Complete")));
  });

  test('Item 22: sendWhatsAppLinkToStaff generates WhatsApp link and emails staff, or alerts when phone is missing', () => {
    // Row 2: valid phone number
    context.mockSourceSheet.appendRow(["2024-01-01", "p1@ex.com", "Carn Pharmacy", "Alice", "Addr", "0871234567", "DOB", "Meds", "WhatsApp", "Sent to Pharmacy", "Processed on 01/01/2024"]);
    // Row 3: missing phone number
    context.mockSourceSheet.appendRow(["2024-01-01", "p2@ex.com", "Carn Pharmacy", "Bob", "Addr", "", "DOB", "Meds", "WhatsApp", "Sent to Pharmacy", "Processed on 01/01/2024"]);

    // Test row 2 (Alice - valid phone)
    context.sendWhatsAppLinkToStaff(2, "staff@surgery.ie");
    assert.equal(context.sentEmails.length, 1);
    assert.equal(context.sentEmails[0].to, "staff@surgery.ie");
    assert.ok(context.sentEmails[0].htmlBody.includes("https://wa.me/353871234567"));

    // Test row 3 (Bob - missing phone)
    context.sendWhatsAppLinkToStaff(3, "staff@surgery.ie");
    assert.equal(context.sentEmails.length, 2);
    assert.ok(context.sentEmails[1].subject.includes("Missing Phone Number"));
  });
});
