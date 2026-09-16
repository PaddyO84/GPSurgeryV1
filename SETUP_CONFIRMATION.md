# Prescription Request Application - Setup Confirmation

This document outlines the required configuration to ensure the Prescription Request Application functions correctly.

## 1. Web App & Spreadsheet Setup

The application has been upgraded to use a Google Apps Script Web App for more robust data handling, replacing the previous Google Form integration.

### Google Apps Script Web App
*   **Deployment ID:** `YOUR_DEPLOYMENT_ID` (Placeholder - replace with the ID generated when deploying as a Web App)
*   **Web App URL:** `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec` (Placeholder - replace with the full Web App URL provided upon deployment)
*   **Access Setting:** The Web App must be deployed with access set to **"Anyone"** (or "Anyone with Google account" if strictly internal, but "Anyone" is needed for a public-facing patient form).
*   **Execute As:** User accessing the web app (if "Anyone with Google account") OR **"Me" (owner)** (recommended for public forms so patients don't need to log in).

### Google Spreadsheet
The script `Code.gs` writes data to the following sheet:

*   **Sheet Name:** `Form responses 1`
*   **Column Mapping:** The script automatically appends data in the following order:
    *   **Column A (1):** Timestamp
    *   **Column B (2):** Patient Email
    *   **Column C (3):** Chosen Pharmacy
    *   **Column D (4):** Patient Full Name
    *   **Column E (5):** Patient Address
    *   **Column F (6):** Contact Number
    *   **Column G (7):** Date of Birth
    *   **Column H (8):** Medication List (Formatted)
    *   **Column I (9):** Communication Preference
    *   **Column J (10):** Status (Initial state: Empty)
    *   **Column K (11):** Notification Sent (Logs processing timestamp)

## 2. Google Apps Script Setup (`Code.gs`)

### Automated Triggers Setup
Automated triggers can be set up automatically via the custom spreadsheet menu **Surgery Tools > Setup Automated Triggers** (which runs `setupAutomatedTriggers`). This configures three triggers:

1. **`archiveOldRequests`** (Time-driven, Weekly timer, Mondays during the 1:00 AM hour): Automatically archives old processed requests.
2. **`onFormSubmit`** (Spreadsheet form submit trigger): Processes incoming form responses submitted through connected Google Forms.
3. **`handleEdit`** (Spreadsheet installable onEdit trigger): Monitors row status updates (e.g. marking rows as "Sent to Pharmacy" or "Query") and triggers email/WhatsApp notifications. The installable `handleEdit` trigger is required for status-change email notifications to work with full authorization.

### Environment Variables & Deployment Identifiers
The following placeholders in `Code.gs` and frontend configuration must be replaced with real deployment-specific values before deployment:
*   `SENDER_NAME`: Placeholder (e.g. `"Example Health Centre"` - replace with official surgery name)
*   `YOUR_PHONE_NUMBER`: Placeholder (e.g. `"(01) 234 5679"` - replace with official surgery contact number)
*   `ADMIN_EMAIL`: Placeholder (e.g. `"admin@example.com"` - replace with surgery administrator/reception email)
*   `Deployment ID`: Placeholder (`YOUR_DEPLOYMENT_ID` - replace with actual Apps Script deployment ID)
*   `Web App URL`: Placeholder (`https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec` - replace with actual deployed Web App URL in frontend configuration)

## 3. Frontend Configuration
The file `prescription_form.html` has been updated to submit data to the Web App URL.
*   **Variable:** `SCRIPT_WEB_APP_URL` contains the deployment URL.
*   **Submission Method:** Standard HTTP POST with a JSON payload.
