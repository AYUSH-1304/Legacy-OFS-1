# Legacy OFS – Field Ticketing and Inspections Application

## 1. Project Overview

Legacy OFS is a mobile-friendly Field Ticketing and Inspection Management Application designed for oilfield service operations.

The application allows field workers to create, manage, and submit service tickets. Administrators can review submitted tickets, approve or reject them, manage devices, and configure ticket templates.

The application also supports offline ticket creation and synchronization when internet connectivity is restored.

## 2. Technologies Used

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| API | REST API |
| Authentication | JWT |
| Development Tools | VS Code, npm, pgAdmin |
| Offline Storage | Browser Local Storage |

## 3. User Roles

### Field Worker

- Register and log in.
- Create and view service tickets.
- Edit Draft and Rejected tickets.
- Add ticket comments.
- Add service and material line items.
- View registered devices.
- Create and save tickets while offline.
- Synchronize pending offline actions when internet returns.

### Administrator

- View all tickets.
- Search and filter tickets.
- Review submitted tickets.
- Approve or reject tickets.
- Manage ticket statuses.
- Manage registered devices.
- Revoke active devices.
- Create and manage ticket templates.

## 4. Ticket Statuses

The application supports the following ticket statuses:

- Draft
- Submitted
- Approved
- Rejected
- Invoiced
- Void

## 5. Main Features

### Authentication and Authorization
- User registration and login.
- JWT-based authentication.
- Role-based access for workers and administrators.

### Ticket Management
- Create and manage field service tickets.
- Edit Draft and Rejected tickets.
- Submit tickets for administrator review.
- View ticket details and history.

### Ticket Templates
The application supports configurable ticket templates, including:

- Field Service Ticket
- Inspection Report
- Maintenance Record
- Service Request
- Work Completion Report

### Comments and Line Items
- Add comments to tickets.
- Add service and material items.
- Maintain quantities and unit prices.

### Device Management
- Register devices.
- View registered devices.
- Support a maximum of five active devices per account.
- Allow administrators to revoke devices.

### Offline Support
- Save tickets locally when offline.
- Maintain pending offline actions.
- Synchronize data with the backend.
- Avoid duplicate ticket creation through offline identifiers.
- Display pending, synced, and failed records.

## 6. Project Folder Structure

```text
Legacy-OFC_1/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── index.html
│
├── database/
│   └── schema.sql
│
├── docs/
│   ├── architecture.md
│   └── testing.md
│
├── .gitignore
└── README.md
```

## 7. Prerequisites

Install the following before running the project:

- Node.js and npm
- PostgreSQL
- pgAdmin (optional, for database management)
- Visual Studio Code

## 8. Database Setup

1. Start PostgreSQL.
2. Open pgAdmin.
3. Create a database named:

```sql
CREATE DATABASE legacy_ofs_db;
```

4. Configure the backend database connection.
5. Execute the database schema script if it is available:

```text
database/schema.sql
```

Make sure all required tables and ticket templates are created before starting the application.

## 9. Environment Configuration

Create a `.env` file inside the backend folder.

Configure the required database connection settings and authentication secret according to the backend configuration in `db.js` and the authentication middleware.

Example:

```env
JWT_SECRET=your_private_secret
PORT=5000
```

Add any other environment variables required by your backend configuration.

**Security:** Never upload `.env` files, database passwords, JWT secrets, or API keys to GitHub.

## 10. How to Run the Project

### Start Backend

Open PowerShell:

```powershell
cd D:\Legacy-OFC_1\backend
npm install
npm start
```

Backend URL:

http://localhost:5000

### Start Frontend

Open another PowerShell terminal:

```powershell
cd D:\Legacy-OFC_1\frontend
npm install
npm run dev
```

Frontend URL:

http://localhost:5173

Open the frontend URL in your browser.

## 11. Testing

The following features should be tested before final submission:

- User registration and login.
- Worker and administrator permissions.
- Ticket creation, editing, and submission.
- Ticket approval and rejection.
- Ticket comments and history.
- Service and material line items.
- Ticket template management.
- Device registration and revocation.
- Offline ticket creation.
- Automatic synchronization after internet restoration.
- Duplicate synchronization prevention.

Frontend production build:

```powershell
cd D:\Legacy-OFC_1\frontend
npm run build
```

## 12. Documentation

Additional project documentation is available in the `docs/` folder:

- `architecture.md` – Application architecture and data flow.
- `testing.md` – Testing procedures and results.

## 13. Project Purpose

The purpose of Legacy OFS is to simplify oilfield field-service operations through digital ticket creation, inspection management, administrator review, device management, and offline synchronization.

The application aims to reduce manual paperwork and improve field-service record management.