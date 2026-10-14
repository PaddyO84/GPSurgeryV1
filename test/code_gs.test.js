const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function createGasMocks() {
  const logs = [];
  const Logger = {
    log: (msg) => logs.push(String(msg)),
    getLogs: () => logs
  };

  const sentEmails = [];
  let mailShouldThrow = false;
  const MailApp = {
    sendEmail: (options) => {
      if (mailShouldThrow) {
        throw new Error('MailApp service error');
      }
      sentEmails.push(options);
    },
    getSentEmails: () => sentEmails,
    setShouldThrow: (val) => { mailShouldThrow = val; }
  };

  const scriptProperties = { 'ADMIN_EMAIL': 'custom_admin@example.com' };
  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) => scriptProperties[key] || null
    })
  };

  const Utilities = {
    formatDate: (date, timeZone, format) => '15/10/2026 12:00:00'
  };

  let triggers = [];
  const ScriptApp = {
    getProjectTriggers: () => triggers,
    newTrigger: (functionName) => {
      const trigger = { handler: functionName };
      return {
        forSpreadsheet: function() { return this; },
        onFormSubmit: function() { return this; },
        timeBased: function() { return this; },
        onWeekDay: function() { return this; },
        atHour: function() { return this; },
        create: function() { triggers.push({ getHandlerFunction: () => functionName }); return trigger; }
      };
    },
    WeekDay: { MONDAY: 1 },
    resetTriggers: () => { triggers = []; }
  };

  const uiAlerts = [];
  const uiModalDialogs = [];
  const ui = {
    alert: (title, message) => uiAlerts.push({ title, message }),
    createMenu: (name) => {
      const menu = {
        addItem: () => menu,
        addSeparator: () => menu,
        addSubMenu: () => menu,
        addToUi: () => {}
      };
      return menu;
    },
    showModalDialog: (htmlOutput, title) => uiModalDialogs.push({ htmlOutput, title }),
    ButtonSet: { OK: 'OK' }
  };

  const mockSheetData = {};
  const defaultHeader = ["Timestamp", "Email", "Pharmacy", "Name", "Address", "Phone", "DOB", "Meds", "CommPref", "Status", "Notification"];

  const createMockSheet = (name) => {
    if (!mockSheetData[name]) {
      mockSheetData[name] = [defaultHeader];
    }
    const rows = mockSheetData[name];

    return {
      getName: () => name,
      getLastRow: () => rows.length,
      getLastColumn: () => (rows[0] ? rows[0].length : 11),
      appendRow: (row) => { rows.push(row); },
      deleteRow: (index) => { rows.splice(index - 1, 1); },
      getRange: (row, col, numRows = 1, numCols = 1) => {
        return {
          getValue: () => (rows[row - 1] ? rows[row - 1][col - 1] : null),
          getValues: () => {
            const result = [];
            for (let r = 0; r < numRows; r++) {
              const rowArr = rows[row - 1 + r] || [];
              const cols = [];
              for (let c = 0; c < numCols; c++) {
                cols.push(rowArr[col - 1 + c]);
              }
              result.push(cols);
            }
            return result;
          },
          setValue: (val) => {
            if (!rows[row - 1]) rows[row - 1] = [];
            rows[row - 1][col - 1] = val;
          },
          setValues: (vals) => {
            for (let r = 0; r < vals.length; r++) {
              if (!rows[row - 1 + r]) rows[row - 1 + r] = [];
              for (let c = 0; c < vals[r].length; c++) {
                rows[row - 1 + r][col - 1 + c] = vals[r][c];
              }
            }
          },
          copyTo: (targetRange) => {}
        };
      },
      setFrozenRows: () => {}
    };
  };

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: (name) => {
        if (mockSheetData[name]) return createMockSheet(name);
        return null;
      },
      insertSheet: (name) => {
        mockSheetData[name] = [defaultHeader];
        return createMockSheet(name);
      }
    }),
    getUi: () => ui,
    setMockSheetRows: (name, rows) => { mockSheetData[name] = rows; }
  };

  return {
    Logger,
    MailApp,
    PropertiesService,
    Utilities,
    ScriptApp,
    SpreadsheetApp,
    uiAlerts,
    uiModalDialogs,
    logs,
    sentEmails
  };
}

test('Code.gs Unit Tests & Error Handling Coverage', async (t) => {
  const codeGsSource = fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8');
  const fullHeader = ["Timestamp", "Email", "Pharmacy", "Name", "Address", "Phone", "DOB", "Meds", "CommPref", "Status", "Notification"];

  await t.test('Item 16: sendReadyEmail error catch block test', () => {
    const mocks = createGasMocks();
    mocks.MailApp.setShouldThrow(true);

    mocks.SpreadsheetApp.setMockSheetRows("Form responses 1", [
      fullHeader,
      ["2026-10-15", "patient@example.com", "Main Pharmacy", "John Doe", "123 St", "0871234567", "1990-01-01", "Paracetamol", "Email", "Sent to Pharmacy", "Processed on 15/10/2026"]
    ]);

    const context = {
      SpreadsheetApp: mocks.SpreadsheetApp,
      MailApp: mocks.MailApp,
      Logger: mocks.Logger,
      PropertiesService: mocks.PropertiesService,
      Utilities: mocks.Utilities
    };

    const fn = new Function(...Object.keys(context), codeGsSource + '\nsendReadyEmail(2);');
    fn(...Object.values(context));

    assert.ok(mocks.logs.some(log => log.includes('Error sending READY email for row 2')));
  });

  await t.test('Item 17: reportError error catch block fallback test', () => {
    const mocks = createGasMocks();
    mocks.MailApp.setShouldThrow(true);

    const context = {
      SpreadsheetApp: mocks.SpreadsheetApp,
      MailApp: mocks.MailApp,
      Logger: mocks.Logger,
      PropertiesService: mocks.PropertiesService,
      Utilities: mocks.Utilities
    };

    const fn = new Function(...Object.keys(context), codeGsSource + '\nreportError("testFunc", new Error("test error"), 5);');
    fn(...Object.values(context));

    assert.ok(mocks.logs.some(log => log.includes('Could not send error report email')));
  });

  await t.test('Item 18: sendConfirmationNotification error catch block test', () => {
    const mocks = createGasMocks();
    mocks.MailApp.setShouldThrow(true);

    const context = {
      SpreadsheetApp: mocks.SpreadsheetApp,
      MailApp: mocks.MailApp,
      Logger: mocks.Logger,
      PropertiesService: mocks.PropertiesService,
      Utilities: mocks.Utilities
    };

    const fn = new Function(...Object.keys(context), codeGsSource + '\nsendConfirmationNotification("Jane Doe", "jane@example.com", "Email");');
    fn(...Object.values(context));

    assert.ok(mocks.logs.some(log => log.includes('Failed to send confirmation email to jane@example.com')));
  });

  await t.test('Item 19: archiveOldRequests date parsing edge cases (invalid date strings)', () => {
    const mocks = createGasMocks();

    mocks.SpreadsheetApp.setMockSheetRows("Form responses 1", [
      fullHeader,
      // Row 2: Status READY but date is invalid
      ["2020-01-01", "a@example.com", "Pharm", "Alice", "Addr", "087111", "1990", "Med", "Email", "Sent to Pharmacy", "Processed on invalid-date"],
      // Row 3: Status READY with non-matching notification string
      ["2020-01-01", "b@example.com", "Pharm", "Bob", "Addr", "087222", "1990", "Med", "Email", "Sent to Pharmacy", "Not processed yet"]
    ]);

    const context = {
      SpreadsheetApp: mocks.SpreadsheetApp,
      MailApp: mocks.MailApp,
      Logger: mocks.Logger,
      PropertiesService: mocks.PropertiesService,
      Utilities: mocks.Utilities
    };

    const fn = new Function(...Object.keys(context), codeGsSource + '\narchiveOldRequests();');
    fn(...Object.values(context));

    // Rows with invalid date or wrong format should not be deleted or cause exceptions
    const sourceRows = mocks.SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form responses 1");
    assert.strictEqual(sourceRows.getLastRow(), 3);
  });

  await t.test('Item 20: archiveOldRequests moves old requests correctly', () => {
    const mocks = createGasMocks();

    mocks.SpreadsheetApp.setMockSheetRows("Form responses 1", [
      fullHeader,
      // Row 2: Old processed request (>180 days ago)
      ["2020-01-01", "old@example.com", "Pharm", "Old Patient", "Addr", "087111", "1990", "Med", "Email", "Sent to Pharmacy", "Processed on 01/01/2020"]
    ]);

    const context = {
      SpreadsheetApp: mocks.SpreadsheetApp,
      MailApp: mocks.MailApp,
      Logger: mocks.Logger,
      PropertiesService: mocks.PropertiesService,
      Utilities: mocks.Utilities
    };

    const fn = new Function(...Object.keys(context), codeGsSource + '\narchiveOldRequests();');
    fn(...Object.values(context));

    const archiveSheet = mocks.SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Archive");
    assert.ok(archiveSheet !== null);
    assert.strictEqual(archiveSheet.getLastRow(), 2);
    assert.strictEqual(archiveSheet.getRange(2, 4).getValue(), "Old Patient");
  });

  await t.test('Item 21: setupSystem creates Archive sheet and time trigger', () => {
    const mocks = createGasMocks();

    mocks.SpreadsheetApp.setMockSheetRows("Form responses 1", [
      fullHeader
    ]);

    const context = {
      SpreadsheetApp: mocks.SpreadsheetApp,
      MailApp: mocks.MailApp,
      Logger: mocks.Logger,
      PropertiesService: mocks.PropertiesService,
      Utilities: mocks.Utilities,
      ScriptApp: mocks.ScriptApp
    };

    const fn = new Function(...Object.keys(context), codeGsSource + '\nsetupSystem();');
    fn(...Object.values(context));

    assert.ok(mocks.uiAlerts.some(a => a.title === 'Setup Complete'));
    assert.strictEqual(mocks.ScriptApp.getProjectTriggers().length, 1);
  });

  await t.test('Item 22: sendWhatsAppLinkToStaff handles valid and missing phone numbers', () => {
    const mocks = createGasMocks();

    mocks.SpreadsheetApp.setMockSheetRows("Form responses 1", [
      fullHeader,
      // Row 2: Phone missing
      ["2026-10-15", "p1@example.com", "Pharm A", "Patient One", "Addr", "", "1990", "Med", "WhatsApp", "Sent to Pharmacy", "Processed"],
      // Row 3: Phone present
      ["2026-10-15", "p2@example.com", "Pharm B", "Patient Two", "Addr", "0879998888", "1990", "Med", "WhatsApp", "Sent to Pharmacy", "Processed"]
    ]);

    const context = {
      SpreadsheetApp: mocks.SpreadsheetApp,
      MailApp: mocks.MailApp,
      Logger: mocks.Logger,
      PropertiesService: mocks.PropertiesService,
      Utilities: mocks.Utilities
    };

    const fn = new Function(...Object.keys(context), codeGsSource + '\nsendWhatsAppLinkToStaff(2, "staff@example.com");\nsendWhatsAppLinkToStaff(3, "staff@example.com");');
    fn(...Object.values(context));

    assert.strictEqual(mocks.sentEmails.length, 2);
    assert.strictEqual(mocks.sentEmails[0].subject, "Action Required: Missing Phone Number");
    assert.strictEqual(mocks.sentEmails[1].subject, "Action Required: Send WhatsApp to Patient Two");
    assert.ok(mocks.sentEmails[1].htmlBody.includes("wa.me/353879998888"));
  });
});
