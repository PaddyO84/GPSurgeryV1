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
  STATUS: 1,
  NAME: 2,
  DOB: 3,
  PHONE: 4,
  EMAIL: 5,
  ADDRESS: 6,
  CERT_TYPE: 7,
  PPS: 8,
  CONDITION: 9,
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

  const sheet = getOrCreateSheet(APPT_SHEET_NAME, headers);

  const validation = validatePatientData(data.email, data.phone);
  if (!validation.isValid) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': validation.errors })).setMimeType(ContentService.MimeType.JSON);
  }

  const timestamp = new Date();
  const rowData = [];
  rowData[APPT_LAYOUT.TIMESTAMP] = timestamp;
  rowData[APPT_LAYOUT.EMAIL] = data.email;
  rowData[APPT_LAYOUT.TYPE] = data.type;
  rowData[APPT_LAYOUT.NAME] = data.name;
  rowData[APPT_LAYOUT.ADDRESS] = data.address || "";
  rowData[APPT_LAYOUT.PHONE] = "'" + data.phone;
  rowData[APPT_LAYOUT.DOB] = data.dob;
  rowData[APPT_LAYOUT.NOTES] = data.notes;
  rowData[APPT_LAYOUT.COMM_PREF] = "Email";
  rowData[APPT_LAYOUT.STATUS] = "New Request";
  rowData[APPT_LAYOUT.NOTIFICATION_SENT] = `Processed on ${Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")}`;
  rowData[APPT_LAYOUT.PREFERRED_TIME] = data.preferredTime;

  sheet.appendRow(rowData);
  sendAppointmentConfirmation(data.name, data.email, data.type, data.preferredTime);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'appointment' })).setMimeType(ContentService.MimeType.JSON);
}

function handleSickNoteSubmission(data) {
  const SICK_SHEET_NAME = "Sick Notes";
  const headers = [];
  headers[SICK_NOTE_LAYOUT.TIMESTAMP] = "Timestamp";
  headers[SICK_NOTE_LAYOUT.STATUS] = "Status";
  headers[SICK_NOTE_LAYOUT.NAME] = "Name";
  headers[SICK_NOTE_LAYOUT.DOB] = "DOB";
  headers[SICK_NOTE_LAYOUT.PHONE] = "Phone";
  headers[SICK_NOTE_LAYOUT.EMAIL] = "Email";
  headers[SICK_NOTE_LAYOUT.ADDRESS] = "Address";
  headers[SICK_NOTE_LAYOUT.CERT_TYPE] = "Cert Type";
  headers[SICK_NOTE_LAYOUT.PPS] = "PPS";
  headers[SICK_NOTE_LAYOUT.CONDITION] = "Condition";
  headers[SICK_NOTE_LAYOUT.DATES] = "Dates";
  headers[SICK_NOTE_LAYOUT.RETURN_TO_WORK] = "Return to Work";
  headers[SICK_NOTE_LAYOUT.SIGNATURE] = "Signature";
  headers[SICK_NOTE_LAYOUT.NOTIFICATION_SENT] = "Notification Sent";

  const sheet = getOrCreateSheet(SICK_SHEET_NAME, headers);

  const validation = validatePatientData(data.email, data.phone);
  if (!validation.isValid) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': validation.errors })).setMimeType(ContentService.MimeType.JSON);
  }

  const timestamp = new Date();
  const rowData = [];
  rowData[SICK_NOTE_LAYOUT.TIMESTAMP] = timestamp;
  rowData[SICK_NOTE_LAYOUT.STATUS] = "New Request";
  rowData[SICK_NOTE_LAYOUT.NAME] = data.name;
  rowData[SICK_NOTE_LAYOUT.DOB] = data.dob;
  rowData[SICK_NOTE_LAYOUT.PHONE] = "'" + data.phone;
  rowData[SICK_NOTE_LAYOUT.EMAIL] = data.email;
  rowData[SICK_NOTE_LAYOUT.ADDRESS] = data.address || "";
  rowData[SICK_NOTE_LAYOUT.CERT_TYPE] = data.type;
  rowData[SICK_NOTE_LAYOUT.PPS] = data.pps;
  rowData[SICK_NOTE_LAYOUT.CONDITION] = data.condition;
  rowData[SICK_NOTE_LAYOUT.DATES] = data.dates;
  rowData[SICK_NOTE_LAYOUT.RETURN_TO_WORK] = data.returnToWork;
  rowData[SICK_NOTE_LAYOUT.SIGNATURE] = data.signature || "Not Provided";
  rowData[SICK_NOTE_LAYOUT.NOTIFICATION_SENT] = `Processed on ${Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")}`;

  sheet.appendRow(rowData);
  sendSickNoteConfirmation(data.name, data.email);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'sick-note' })).setMimeType(ContentService.MimeType.JSON);
}

function handlePrescriptionSubmission(data) {
    const sheet = getOrCreateSheet(SHEET_NAME, PRESCRIPTION_HEADERS);

    if (!data || !data.patientDetails || typeof data.patientDetails !== 'object') {
       return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': ["Missing or invalid patientDetails payload."] })).setMimeType(ContentService.MimeType.JSON);
    }

    const validation = validatePatientData(data.patientDetails.email, data.patientDetails.phone);
    if (!validation.isValid) {
       return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': validation.errors })).setMimeType(ContentService.MimeType.JSON);
    }

    const timestamp = new Date();
    let medicationString = "";
    if (data.medicationList && Array.isArray(data.medicationList)) {
       medicationString = data.medicationList.map(m => `${m.name} - ${m.dosage} (${m.freq})`).join("\n");
    }

    const newRow = [];
    newRow[0] = timestamp;
    newRow[EMAIL_COL - 1] = data.patientDetails.email;
    newRow[PHARMACY_COL - 1] = data.patientDetails.pharmacy;
    newRow[NAME_COL - 1] = data.patientDetails.name;
    newRow[4] = data.patientDetails.address || "";
    newRow[PHONE_COL - 1] = "'" + data.patientDetails.phone;
    newRow[6] = data.patientDetails.dob;
    newRow[MEDS_COL - 1] = medicationString;
    newRow[COMM_PREF_COL - 1] = data.patientDetails.commPref;
    newRow[STATUS_COL - 1] = "";
    newRow[NOTIFICATION_COL - 1] = `Processed on ${Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")}`;

    sheet.appendRow(newRow);
    const row = sheet.getLastRow();

    sendConfirmationNotification(data.patientDetails.name, data.patientDetails.email, data.patientDetails.commPref);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': row })).setMimeType(ContentService.MimeType.JSON);
}
