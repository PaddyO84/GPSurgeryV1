const APPT_LAYOUT = {
  TIMESTAMP: 0,
  EMAIL: 1,
  TYPE: 2,
  NAME: 3,
  ADDRESS: 4,
  PHONE: 5,
  DOB: 6,
  NOTES: 7,
  COMM_PREF: 8,
  STATUS: 9,
  NOTIFICATION_SENT: 10,
  PREFERRED_TIME: 11
};

const SICK_NOTE_LAYOUT = {
  TIMESTAMP: 0,
  NAME: 1,
  DOB: 2,
  PHONE: 3,
  EMAIL: 4,
  ADDRESS: 5,
  CERT_TYPE: 6,
  PPS: 7,
  CONDITION: 8,
  STATUS: 9,
  DATES: 10,
  RETURN_TO_WORK: 11,
  SIGNATURE: 12,
  NOTIFICATION_SENT: 13
};

const PRESCRIPTION_HEADERS = [
  "Timestamp",
  "Email",
  "Pharmacy",
  "Name",
  "Address",
  "Phone",
  "Date of Birth",
  "Medication List",
  "CommPref",
  "Status",
  "Notification Sent"
];

function handleAppointmentSubmission(data) {
  const APPT_SHEET_NAME = "Appointments";
  const headers = [];
  headers[APPT_LAYOUT.TIMESTAMP] = "Timestamp";
  headers[APPT_LAYOUT.EMAIL] = "Email";
  headers[APPT_LAYOUT.TYPE] = "Type";
  headers[APPT_LAYOUT.NAME] = "Name";
  headers[APPT_LAYOUT.ADDRESS] = "Address";
  headers[APPT_LAYOUT.PHONE] = "Phone";
  headers[APPT_LAYOUT.DOB] = "DOB";
  headers[APPT_LAYOUT.NOTES] = "Notes";
  headers[APPT_LAYOUT.COMM_PREF] = "CommPref";
  headers[APPT_LAYOUT.STATUS] = "Status";
  headers[APPT_LAYOUT.NOTIFICATION_SENT] = "Notification Sent";
  headers[APPT_LAYOUT.PREFERRED_TIME] = "Preferred Time";

  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) errors.push("Patient name is required.");
  if (!data.dob || typeof data.dob !== 'string' || !data.dob.trim()) errors.push("Date of birth is required.");
  if (!data.type || typeof data.type !== 'string' || !data.type.trim()) errors.push("Appointment type is required.");
  const validation = validatePatientData(data.email, data.phone);
  if (!validation.isValid) {
    errors.push(...validation.errors);
  }
  if (errors.length > 0) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': errors })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = getOrCreateSheet(APPT_SHEET_NAME, headers);
  const timestamp = new Date();
  const rowData = [];
  rowData[APPT_LAYOUT.TIMESTAMP] = timestamp;
  rowData[APPT_LAYOUT.EMAIL] = sanitizeCellValue(data.email);
  rowData[APPT_LAYOUT.TYPE] = sanitizeCellValue(data.type);
  rowData[APPT_LAYOUT.NAME] = sanitizeCellValue(data.name);
  rowData[APPT_LAYOUT.ADDRESS] = sanitizeCellValue(data.address || "");
  rowData[APPT_LAYOUT.PHONE] = "'" + data.phone;
  rowData[APPT_LAYOUT.DOB] = sanitizeCellValue(data.dob);
  rowData[APPT_LAYOUT.NOTES] = sanitizeCellValue(data.notes || "");
  rowData[APPT_LAYOUT.COMM_PREF] = "Email";
  rowData[APPT_LAYOUT.STATUS] = "New Request";
  rowData[APPT_LAYOUT.NOTIFICATION_SENT] = "";
  rowData[APPT_LAYOUT.PREFERRED_TIME] = sanitizeCellValue(data.preferredTime || "");

  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Server is busy, please try again shortly.' })).setMimeType(ContentService.MimeType.JSON);
  }

  let rowIndex;
  try {
    sheet.appendRow(rowData);
    rowIndex = sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }

  // Send confirmation notification after persistence and lock release
  const notificationSuccess = sendAppointmentConfirmation(data.name, data.email, data.type, data.preferredTime);
  if (notificationSuccess) {
    sheet.getRange(rowIndex, APPT_LAYOUT.NOTIFICATION_SENT + 1).setValue(`Processed on ${Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")}`);
  } else {
    reportError('handleAppointmentSubmission:notification', new Error('Failed to deliver appointment confirmation email'), rowIndex);
  }

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'appointment', 'notificationSent': notificationSuccess })).setMimeType(ContentService.MimeType.JSON);
}

function handleSickNoteSubmission(data) {
  const SICK_SHEET_NAME = "Sick Notes";
  const headers = [];
  headers[SICK_NOTE_LAYOUT.TIMESTAMP] = "Timestamp";
  headers[SICK_NOTE_LAYOUT.NAME] = "Name";
  headers[SICK_NOTE_LAYOUT.DOB] = "DOB";
  headers[SICK_NOTE_LAYOUT.PHONE] = "Phone";
  headers[SICK_NOTE_LAYOUT.EMAIL] = "Email";
  headers[SICK_NOTE_LAYOUT.ADDRESS] = "Address";
  headers[SICK_NOTE_LAYOUT.CERT_TYPE] = "Cert Type";
  headers[SICK_NOTE_LAYOUT.PPS] = "PPS";
  headers[SICK_NOTE_LAYOUT.CONDITION] = "Condition";
  headers[SICK_NOTE_LAYOUT.STATUS] = "Status";
  headers[SICK_NOTE_LAYOUT.DATES] = "Dates";
  headers[SICK_NOTE_LAYOUT.RETURN_TO_WORK] = "Return to Work";
  headers[SICK_NOTE_LAYOUT.SIGNATURE] = "Signature";
  headers[SICK_NOTE_LAYOUT.NOTIFICATION_SENT] = "Notification Sent";

  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) errors.push("Patient name is required.");
  if (!data.dob || typeof data.dob !== 'string' || !data.dob.trim()) errors.push("Date of birth is required.");
  if (!data.type || typeof data.type !== 'string' || !data.type.trim()) errors.push("Cert type is required.");
  if (!data.pps || typeof data.pps !== 'string' || !data.pps.trim()) errors.push("PPS number is required.");
  const validation = validatePatientData(data.email, data.phone);
  if (!validation.isValid) {
    errors.push(...validation.errors);
  }
  if (errors.length > 0) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': errors })).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = getOrCreateSheet(SICK_SHEET_NAME, headers);

  // Validate existing headers and migrate if order differs
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastCol > 0) {
    const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const isMatching = currentHeaders.length === headers.length &&
      headers.every((h, idx) => h.toLowerCase() === (currentHeaders[idx] || '').toLowerCase());

    if (!isMatching) {
      // Check if all expected headers exist in currentHeaders
      const headerIndexMap = {};
      currentHeaders.forEach((h, idx) => {
        headerIndexMap[h.toLowerCase()] = idx;
      });

      const allHeadersPresent = headers.every(h => headerIndexMap.hasOwnProperty(h.toLowerCase()));
      if (allHeadersPresent && lastRow > 1) {
        // Migrate existing rows to match new header order
        const oldData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        const migratedData = oldData.map(row => {
          return headers.map(h => {
            const oldIdx = headerIndexMap[h.toLowerCase()];
            return oldIdx !== undefined ? row[oldIdx] : "";
          });
        });
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(2, 1, migratedData.length, headers.length).setValues(migratedData);
        if (lastCol > headers.length) {
          sheet.deleteColumns(headers.length + 1, lastCol - headers.length);
        }
      } else if (allHeadersPresent && lastRow === 1) {
        // Only rewrite headers
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        if (lastCol > headers.length) {
          sheet.deleteColumns(headers.length + 1, lastCol - headers.length);
        }
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          'result': 'error',
          'error': 'Sick Notes sheet header mismatch and could not be safely migrated.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  const timestamp = new Date();
  const rowData = [];
  rowData[SICK_NOTE_LAYOUT.TIMESTAMP] = timestamp;
  rowData[SICK_NOTE_LAYOUT.STATUS] = "New Request";
  rowData[SICK_NOTE_LAYOUT.NAME] = sanitizeCellValue(data.name);
  rowData[SICK_NOTE_LAYOUT.DOB] = sanitizeCellValue(data.dob);
  rowData[SICK_NOTE_LAYOUT.PHONE] = "'" + data.phone;
  rowData[SICK_NOTE_LAYOUT.EMAIL] = sanitizeCellValue(data.email);
  rowData[SICK_NOTE_LAYOUT.ADDRESS] = sanitizeCellValue(data.address || "");
  rowData[SICK_NOTE_LAYOUT.CERT_TYPE] = sanitizeCellValue(data.type);
  rowData[SICK_NOTE_LAYOUT.PPS] = sanitizeCellValue(data.pps);
  rowData[SICK_NOTE_LAYOUT.CONDITION] = sanitizeCellValue(data.condition || "");
  rowData[SICK_NOTE_LAYOUT.DATES] = sanitizeCellValue(data.dates || "");
  rowData[SICK_NOTE_LAYOUT.RETURN_TO_WORK] = sanitizeCellValue(data.returnToWork || "");
  let signatureValue = data.signature || "Not Provided";
  if (typeof signatureValue === 'string' && signatureValue.length > 50000) {
    signatureValue = "[Signature Exceeds Limit]";
  }
  rowData[SICK_NOTE_LAYOUT.SIGNATURE] = sanitizeCellValue(signatureValue);
  rowData[SICK_NOTE_LAYOUT.NOTIFICATION_SENT] = "";

  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Server is busy, please try again shortly.' })).setMimeType(ContentService.MimeType.JSON);
  }

  let rowIndex;
  try {
    sheet.appendRow(rowData);
    rowIndex = sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }

  const notificationSuccess = sendSickNoteConfirmation(data.name, data.email);
  if (notificationSuccess) {
    sheet.getRange(rowIndex, SICK_NOTE_LAYOUT.NOTIFICATION_SENT + 1).setValue(`Processed on ${Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")}`);
  } else {
    reportError('handleSickNoteSubmission:notification', new Error('Failed to deliver sick note confirmation email'), rowIndex);
  }

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'sick-note', 'notificationSent': notificationSuccess })).setMimeType(ContentService.MimeType.JSON);
}

function handlePrescriptionSubmission(data) {
    const errors = [];
    if (!data || !data.patientDetails || typeof data.patientDetails !== 'object') {
       return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': ["Missing or invalid patientDetails payload."] })).setMimeType(ContentService.MimeType.JSON);
    }

    const details = data.patientDetails;
    if (!details.name || typeof details.name !== 'string' || !details.name.trim()) errors.push("Patient name is required.");
    if (!details.dob || typeof details.dob !== 'string' || !details.dob.trim()) errors.push("Date of birth is required.");
    if (!details.pharmacy || typeof details.pharmacy !== 'string' || !details.pharmacy.trim()) errors.push("Pharmacy selection is required.");

    if (!data.medicationList || !Array.isArray(data.medicationList) || data.medicationList.length === 0) {
       errors.push("At least one medication is required.");
    } else {
       data.medicationList.forEach((med, idx) => {
          if (!med || !med.name || typeof med.name !== 'string' || !med.name.trim()) {
             errors.push(`Medication #${idx + 1} is missing a valid name.`);
          }
       });
    }

    const VALID_COMM_PREFS = ["Email", "WhatsApp"];
    const inputCommPref = typeof details.commPref === 'string' ? details.commPref.trim() : (details.commPref ? String(details.commPref).trim() : "Email");
    let normalizedCommPref = null;
    for (const validPref of VALID_COMM_PREFS) {
       if (inputCommPref.toLowerCase() === validPref.toLowerCase()) {
          normalizedCommPref = validPref;
          break;
       }
    }
    if (!normalizedCommPref) {
       errors.push(`Invalid commPref value: "${inputCommPref}". Accepted values are "Email" or "WhatsApp".`);
    }

    const validation = validatePatientData(details.email, details.phone);
    if (!validation.isValid) {
       errors.push(...validation.errors);
    }

    if (errors.length > 0) {
       return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': errors })).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getOrCreateSheet(SHEET_NAME, PRESCRIPTION_HEADERS);
    const timestamp = new Date();
    const medicationString = data.medicationList.map(m => `${m.name} - ${m.dosage || ''} (${m.freq || ''})`).join("\n");

    const newRow = [];
    newRow[0] = timestamp;
    newRow[EMAIL_COL - 1] = sanitizeCellValue(details.email);
    newRow[PHARMACY_COL - 1] = sanitizeCellValue(details.pharmacy);
    newRow[NAME_COL - 1] = sanitizeCellValue(details.name);
    newRow[4] = sanitizeCellValue(details.address || "");
    newRow[PHONE_COL - 1] = "'" + details.phone;
    newRow[6] = sanitizeCellValue(details.dob);
    newRow[MEDS_COL - 1] = sanitizeCellValue(medicationString);
    newRow[COMM_PREF_COL - 1] = sanitizeCellValue(normalizedCommPref);
    newRow[STATUS_COL - 1] = "";
    newRow[NOTIFICATION_COL - 1] = "";

    const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Server is busy, please try again shortly.' })).setMimeType(ContentService.MimeType.JSON);
  }

  let row;
  try {
    sheet.appendRow(newRow);
    row = sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }

  const notificationSuccess = sendConfirmationNotification(details.name, details.email, normalizedCommPref);
  if (notificationSuccess) {
     sheet.getRange(row, NOTIFICATION_COL).setValue(`Processed on ${Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")}`);
  } else {
     reportError('handlePrescriptionSubmission:notification', new Error('Failed to deliver prescription confirmation email'), row);
  }

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': row, 'notificationSent': notificationSuccess })).setMimeType(ContentService.MimeType.JSON);
}
