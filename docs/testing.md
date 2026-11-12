# Legacy OFS – Testing Documentation

## 1. Introduction

This document describes the testing approach for the Legacy OFS Field Ticketing and Inspection Management Application.

Testing covers authentication, ticket management, administrator operations, device management, templates, comments, line items, and offline synchronization.

## 2. Testing Environment

| Component | Technology |
|---|---|
| Frontend | React.js and Vite |
| Backend | Node.js and Express.js |
| Database | PostgreSQL |
| Browser | Google Chrome |
| API Testing | PowerShell HTTP requests |
| Development Environment | Windows and VS Code |

## 3. Feature Testing

| Test ID | Feature | Test Scenario | Expected Result |
|---|---|---|---|
| TC-01 | Login | Login with valid credentials | User logs in successfully |
| TC-02 | Authentication | Access protected API without token | Request is rejected |
| TC-03 | Ticket Creation | Create a new ticket | Ticket is saved |
| TC-04 | Ticket Submission | Submit a Draft ticket | Status changes to Submitted |
| TC-05 | Ticket Approval | Admin approves a ticket | Status changes to Approved |
| TC-06 | Ticket Rejection | Admin rejects a ticket | Status changes to Rejected |
| TC-07 | Comments | Add a ticket comment | Comment is saved |
| TC-08 | Line Items | Add or update a line item | Item details are saved and total is correct |
| TC-09 | Device Management | Register a device | Device is registered |
| TC-10 | Device Limit | Register more than five active devices | Registration is blocked |
| TC-11 | Templates | View available templates | Active templates are displayed |
| TC-12 | Offline Tickets | Create a ticket while offline | Ticket is stored locally |
| TC-13 | Offline Sync | Restore internet connection | Pending actions are synchronized |
| TC-14 | Ticket History | View ticket history | History records are displayed |
| TC-15 | Final Status | Admin marks an approved ticket Invoiced or Void | Status is updated |

## 4. Authorization Testing

- Unauthenticated users should not access protected APIs.
- Field Workers should not perform administrator-only operations.
- Administrators should be able to review and manage tickets.
- Users should only access resources permitted by their roles.

## 5. Offline Testing

1. Log in as a Field Worker.
2. Open the Create Ticket page.
3. Disconnect the internet connection.
4. Create a test ticket.
5. Verify that it appears on the Offline Tickets page.
6. Restore the internet connection.
7. Verify that automatic synchronization starts.
8. Check the ticket's server ID and synchronization status.
9. Verify that successfully synchronized actions are removed from the pending queue.
10. Test retry behavior for failed actions.

## 6. Build and Syntax Testing

### Frontend Production Build

```powershell
cd frontend
npm run build
```

Expected result: Vite completes the production build without errors.

### Backend Syntax Check

```powershell
cd backend
node --check server.js
```

Expected result: No syntax errors.

Additional controller and route files should also be checked when required.

## 7. Test Results

Record actual results only after executing each test in the running application.

| Test ID | Actual Result | Status |
|---|---|---|
| TC-01 | Not recorded | Pending |
| TC-02 | Not recorded | Pending |
| TC-03 | Not recorded | Pending |
| TC-04 | Not recorded | Pending |
| TC-05 | Not recorded | Pending |
| TC-06 | Not recorded | Pending |
| TC-07 | Not recorded | Pending |
| TC-08 | Not recorded | Pending |
| TC-09 | Not recorded | Pending |
| TC-10 | Not recorded | Pending |
| TC-11 | Not recorded | Pending |
| TC-12 | Offline ticket appeared in Offline Tickets page | Passed |
| TC-13 | Five saved tickets synced; zero pending actions and zero failed tickets | Passed |
| TC-14 | Not recorded | Pending |
| TC-15 | Previously tested Invoiced and Void transitions | Passed |

**Note:** Re-run the tests during the final audit and update the results if any issue is discovered.

## 8. Known Limitations and Final Verification

The following areas require final verification before submission:

- Device active-limit enforcement on the backend.
- Worker and administrator access permissions.
- Ticket comments and line item calculations.
- Template creation and editing.
- Offline comment, edit, and submission synchronization.
- Failed synchronization and retry behavior.

## 9. Conclusion

Testing verifies the major workflows of the Legacy OFS application, including ticket operations, access control, device management, and offline synchronization.

All pending test cases should be executed and documented before final project submission.