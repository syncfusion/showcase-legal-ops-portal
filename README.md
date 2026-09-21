# showcase-legal-ops-portal
Manage legal matters, contract lifecycles, obligations, and document repositories in one portal.

## Overview

The Legal Matter & Contract Management Portal is a showcase application designed to demonstrate complex workflows for managing legal matters, contracts, and associated documents. It features a modern, responsive user interface for interacting with legal data, providing a seamless experience for legal operations professionals.

- **Frontend**: React application providing a rich user interface and interactive workflows.
- **Backend API**: ASP.NET Core Web API handling application data, business logic, and server-side operations.

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **.NET SDK** 10.0+
- **PostgreSQL** 16+

## Run the Sample

### 1. Start the Backend API

The backend requires a running PostgreSQL instance. Ensure your database is accessible and update the connection string in `WebAPI/src/Api/appsettings.json` if necessary.

```bash
cd WebAPI/src/Api
dotnet restore
dotnet run
```

The API will be available at `http://localhost:5186`.

### 2. Configure the Frontend

Navigate to the `React/` directory and ensure you have the necessary environment variables. You can create a `.env` file in the `React/` folder.

```bash
cd React/
```

Required environment variables:
- `VITE_API_BASE_URL=http://localhost:5186`
- `VITE_SYNCFUSION_LICENSE_KEY=<your-syncfusion-license-key>`

### 3. Start the Frontend

```bash
npm install
npm run dev
```

The frontend application will be available at `http://localhost:3000`.

## Configuration

### Backend Configuration
The backend configuration is managed via `appsettings.json` and `appsettings.Development.json` located in `WebAPI/src/Api/`.

- **Database Connection**: Update the `ConnectionStrings:DefaultConnection` in `appsettings.json` to point to your local PostgreSQL instance.
- **Data Seeding**: The application is configured to seed deterministic synthetic data on startup. This can be controlled via the `SeedOnStartup` setting in `appsettings.json`.

### Frontend Configuration
The frontend uses Vite for development. Configuration for the API proxy and environment variables can be found in `React/vite.config.ts`.

## Troubleshooting

### API connection errors
- Ensure the backend API is running and accessible at `http://localhost:5186`.
- Verify that `VITE_API_BASE_URL` in the frontend configuration matches the backend URL.
- Check that the backend CORS policy allows the frontend origin (`http://localhost:3000`).

### Database connection errors
- Ensure the PostgreSQL service is running.
- Verify the connection string in `WebAPI/src/Api/appsettings.json` is correct.
- Ensure the database user has sufficient permissions.

### Dependency errors
- Run `npm install` in the `React/` directory.
- Run `dotnet restore` in the `WebAPI/src/Api` directory.

## Licensing
Review the [Syncfusion licensing](https://www.syncfusion.com/sales/pricing)