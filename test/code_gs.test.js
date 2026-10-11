import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function createGasMockEnvironment() {
  const sentEmails = [];
  const logEntries = [];
  const properties = new Map();

  class MockRange {
    constructor(sheet, startRow, startCol, numRows = 1, numCols = 1) {
      this.sheet = sheet;
      this.startRow = startRow;
      this.startCol = startCol;
      this.numRows = numRows;
      this.numCols = numCols;
    }
    getValue() {
      return (this.sheet.rows[this.startRow - 1] && this.sheet.rows[this.startRow - 1][this.startCol - 1]) || "";
    }
    getValues() {
      const result = [];
      for (let r = 0; r < this.numRows; r++) {
        const row = [];
        for (let c = 0; c < this.numCols; c++) {
          const rIdx = this.startRow - 1 + r;
          const cIdx = this.startCol - 1 + c;
          row.push((this.sheet.rows[rIdx] && this.sheet.rows[rIdx][cIdx] !== undefined) ? this.sheet.rows[rIdx][cIdx] : "");
        }
        result.push(row);
      }
      return result;
    }
    copyTo(targetRange) {
      const values = this.getValues();
      for (let r = 0; r < values.length; r++) {
        const targetRowIdx = targetRange.startRow - 1 + r;
        if (!targetRange.sheet.rows[targetRowIdx]) {
          targetRange.sheet.rows[targetRowIdx] = [];
        }
        for (let c = 0; c < values[r].length; c++) {
          const targetColIdx = targetRange.startCol - 1 + c;
          targetRange.sheet.rows[targetRowIdx][targetColIdx] = values[r][c];
        }
      }
    }
    clearContent() {
      for (let r = 0; r < this.numRows; r++) {
        const rIdx = this.startRow - 1 + r;
        if (this.sheet.rows[rIdx]) {
          for (let c = 0; c < this.numCols; c++) {
            const cIdx = this.startCol - 1 + c;
            this.sheet.rows[rIdx][cIdx] = "";
          }
        }
      }
    }
    setValues(values) {
      for (let r = 0; r < values.length; r++) {
        const rIdx = this.startRow - 1 + r;
        if (!this.sheet.rows[rIdx]) {
          this.sheet.rows[rIdx] = [];
        }
        for (let c = 0; c < values[r].length; c++) {
          const cIdx = this.startCol - 1 + c;
          this.sheet.rows[rIdx][cIdx] = values[r][c];
        }
      }
      while (this.sheet.rows.length > 0 && this.sheet.rows[this.sheet.rows.length - 1].every(cell => cell === "")) {
        this.sheet.rows.pop();
      }
    }
  }

  class MockSheet {
    constructor(name, rows = []) {
      this.name = name;
      this.rows = rows; // array of row arrays
    }
    getLastRow() {
      return this.rows.length;
    }
    getLastColumn() {
      return this.rows.length > 0 ? Math.max(...this.rows.map(r => r ? r.length : 0)) : 1;
    }
    getRange(row, col, numRows = 1, numCols = 1) {
      return new MockRange(this, row, col, numRows, numCols);
    }
    appendRow(rowArr) {
      this.rows.push(rowArr);
    }
    deleteRow(rowNum) {
      this.rows.splice(rowNum - 1, 1);
    }
  }

  const sheets = new Map();
  sheets.set("Form responses 1", new MockSheet("Form responses 1", [
    ["Timestamp", "Patient Email", "Chosen Pharmacy", "Patient Full Name", "Home Address", "Contact Number", "Date of Birth", "Medication List", "Communication Preference", "Status", "Notification Sent"]
  ]));

  const spreadsheet = {
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => {
      const s = new MockSheet(name, []);
      sheets.set(name, s);
      return s;
    }
  };

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => spreadsheet
  };

  const MailApp = {
    sendEmail: (toOrObj, subject, body, options) => {
      if (typeof toOrObj === 'object') {
        sentEmails.push(toOrObj);
      } else {
        sentEmails.push({ to: toOrObj, subject, body, ...options });
      }
    }
  };

  const LockService = {
    getScriptLock: () => ({
      tryLock: () => true,
      releaseLock: () => {}
    })
  };

  const ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput: (content) => ({
      content,
      mimeType: null,
      setMimeType: function(mime) {
        this.mimeType = mime;
        return this;
      }
    })
  };

  const Utilities = {
    formatDate: (date, _tz, format) => {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      if (format.includes('HH:mm:ss')) {
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
      }
      return `${d}/${m}/${y}`;
    }
  };

  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) => properties.get(key) || null,
      setProperty: (key, val) => properties.set(key, val)
    })
  };

  const Logger = {
    log: (msg) => logEntries.push(msg)
  };

  return {
    SpreadsheetApp,
    MailApp,
    LockService,
    ContentService,
    Utilities,
    PropertiesService,
    Logger,
    sheets,
    sentEmails,
    logEntries,
    properties
  };
}

function loadCodeGs(env) {
  Object.assign(globalThis, {
    SpreadsheetApp: env.SpreadsheetApp,
    MailApp: env.MailApp,
    LockService: env.LockService,
    ContentService: env.ContentService,
    Utilities: env.Utilities,
    PropertiesService: env.PropertiesService,
    Logger: env.Logger
  });

  const code = fs.readFileSync(path.resolve('./Code.gs'), 'utf8');
  const globalEval = eval;
  globalEval(code);
}

test('Code.gs - reportError function emails admin', () => {
  const env = createGasMockEnvironment();
  loadCodeGs(env);

  const err = new Error('Test failure');
  err.stack = 'Error: Test failure\n    at testFunction (test.js:1:1)';

  globalThis.reportError('testFunction', err, 5);

  assert.strictEqual(env.sentEmails.length, 1);
  const email = env.sentEmails[0];
  assert.ok(email.subject.includes('Prescription Script Error: testFunction'));
  assert.ok(email.htmlBody.includes('testFunction'));
  assert.ok(email.htmlBody.includes('Test failure'));
  assert.ok(email.htmlBody.includes('row <strong>5</strong>'));
});

test('Code.gs - getMessageTemplate returns correct templates', () => {
  const env = createGasMockEnvironment();
  loadCodeGs(env);

  const readyTpl = globalThis.getMessageTemplate('Sent to Pharmacy', 'John Doe', 'Carn Pharmacy');
  assert.ok(readyTpl);
  assert.strictEqual(readyTpl.subject, 'Your Prescription has been sent to Carn Pharmacy');
  assert.ok(readyTpl.bodyHtml.includes('John Doe'));
  assert.ok(readyTpl.bodyHtml.includes('Carn Pharmacy'));
  assert.ok(readyTpl.whatsappText.includes('John Doe'));

  const queryTpl = globalThis.getMessageTemplate('Query - Please Contact Us', 'John Doe', 'Carn Pharmacy');
  assert.ok(queryTpl);
  assert.strictEqual(queryTpl.subject, 'Action Required: Query Regarding Your Prescription Request');

  const nullTpl = globalThis.getMessageTemplate('Unknown Status', 'John Doe', 'Carn Pharmacy');
  assert.strictEqual(nullTpl, null);
});

test('Code.gs - doPost handles valid prescription submission', () => {
  const env = createGasMockEnvironment();
  loadCodeGs(env);

  const postEvent = {
    postData: {
      contents: JSON.stringify({
        patientDetails: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '0871234567',
          dob: '1990-01-01',
          address: '123 Main St',
          pharmacy: 'Carn Pharmacy, Carndonagh',
          commPref: 'Email'
        },
        medicationList: [
          { name: 'Aspirin', dosage: '100mg', freq: 'Once a day' }
        ]
      })
    }
  };

  const response = globalThis.doPost(postEvent);
  const result = JSON.parse(response.content);

  assert.strictEqual(result.result, 'success');
  assert.strictEqual(result.row, 2);

  const sheet = env.sheets.get('Form responses 1');
  assert.strictEqual(sheet.rows.length, 2);
  assert.strictEqual(sheet.rows[1][1], 'jane@example.com'); // EMAIL_COL
  assert.strictEqual(sheet.rows[1][3], 'Jane Doe'); // NAME_COL
});

test('Code.gs - doPost validates missing required fields', () => {
  const env = createGasMockEnvironment();
  loadCodeGs(env);

  const postEvent = {
    postData: {
      contents: JSON.stringify({
        patientDetails: {
          name: '',
          email: 'jane@example.com'
        }
      })
    }
  };

  const response = globalThis.doPost(postEvent);
  const result = JSON.parse(response.content);

  assert.strictEqual(result.result, 'error');
  assert.strictEqual(result.message, 'Missing Name or Email');
});

test('Code.gs - archiveOldRequests moves old ready requests', () => {
  const env = createGasMockEnvironment();

  // Set up old row (200 days old) and recent row (10 days old)
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 200);
  const oldDateStr = env.Utilities.formatDate(oldDate, 'UTC', 'dd/MM/yyyy');

  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 10);
  const recentDateStr = env.Utilities.formatDate(recentDate, 'UTC', 'dd/MM/yyyy');

  const mainSheetRows = [
    ["Timestamp", "Patient Email", "Chosen Pharmacy", "Patient Full Name", "Home Address", "Contact Number", "Date of Birth", "Medication List", "Communication Preference", "Status", "Notification Sent"],
    [new Date(), "old@example.com", "Pharm A", "Old Patient", "Address 1", "0870000000", "1950-01-01", "Med A", "Email", "Sent to Pharmacy", "Processed on " + oldDateStr],
    [new Date(), "recent@example.com", "Pharm B", "Recent Patient", "Address 2", "0871111111", "1990-01-01", "Med B", "Email", "Sent to Pharmacy", "Processed on " + recentDateStr]
  ];

  env.sheets.get("Form responses 1").rows = mainSheetRows;

  loadCodeGs(env);

  globalThis.archiveOldRequests();

  const mainSheet = env.sheets.get("Form responses 1");
  const archiveSheet = env.sheets.get("Archive");

  assert.ok(archiveSheet, "Archive sheet should be created");
  assert.strictEqual(archiveSheet.rows.length, 2); // Header + 1 archived row
  assert.strictEqual(archiveSheet.rows[1][1], "old@example.com");

  assert.strictEqual(mainSheet.rows.length, 2); // Header + 1 recent row remaining
  assert.strictEqual(mainSheet.rows[1][1], "recent@example.com");
});
