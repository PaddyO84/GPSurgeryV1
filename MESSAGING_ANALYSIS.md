# Messaging Service Analysis

## Overview
The "messaging service" referred to in the project history is identified as the **WhatsApp Notification System** integrated into the Google Apps Script backend (`Code.gs`).

## Current Implementation
*   **Mechanism**: The system does not use a real-time chat widget (WebSockets). Instead, it uses the official WhatsApp URL scheme (`https://wa.me/number?text=...`).
*   **Workflow**:
    1.  Patient selects "WhatsApp" as their preferred contact method.
    2.  When a staff member updates the status of a request (e.g., to "Sent to Pharmacy") in the Google Sheet:
    3.  The installed `handleEdit` trigger detects the change.
    4.  It generates a unique `wa.me` link with a pre-filled message (e.g., "Your prescription is ready...").
    5.  This link is emailed to the *Staff Member* (or displayed in a dialog if triggered via menu).
    6.  The staff member clicks the link on their device to open WhatsApp and send the message to the patient.

## Feasibility & Hosting
*   **Static Hosting Compatibility**: This approach is **100% compatible** with static hosting (GitHub Pages, Netlify). It relies entirely on standard HTTP links and the Google Apps Script environment, which runs independently of the frontend host.
*   **Design Rationale**: The repository's static frontend pages (`index.html`, `contact.html`) do not include client-side WebSocket or real-time chat dependencies, confirming that this asynchronous, link-based workflow is the intended architecture.

## Recommendations
*   **Maintain Current Architecture**: Do not attempt to implement a WebSocket-based chat server, as it would require a separate active server (Node.js/Python) which violates the "zero maintenance / static hosting" requirement.
*   **Extend to Appointments**: Appointment submission routing and the Appointments sheet are already supported. The remaining work is limited to the status-triggered WhatsApp notification path for appointment records.
