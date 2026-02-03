# Authentication System Setup Guide

## Overview
This system now includes a multi-tenant authentication system where each company's data is completely isolated. Users must log in with:
- Company Name
- Login ID
- Password

After login, users can only see and manage data for their specific company.

## Setup Instructions

### Step 1: Run Database Migration
Before using the authentication system, you need to update your database schema:

```bash
python migrate_auth.py
```

This script will:
- Create a `companies` table
- Add `company_id` columns to existing tables (users, machines, alarms, maintenance_tasks)
- Add authentication fields to users table (login_id, password_hash)
- Create a default company if none exists

### Step 2: Create Your First Account
1. Start the Flask application:
   ```bash
   python app.py
   ```

2. Navigate to: `http://localhost:8000/register`

3. Fill in the registration form:
   - **Company Name**: Your company name (e.g., "Acme Industries")
   - **Login ID**: Your unique login ID (e.g., "admin")
   - **Full Name**: Your full name
   - **Password**: Minimum 6 characters
   - **Role**: Select your role (operator, maintenance, manager, admin)

4. Click "Register"

5. You'll be redirected to the login page

### Step 3: Login
1. Navigate to: `http://localhost:8000/login`

2. Enter:
   - **Company Name**: The company name you registered with
   - **Login ID**: Your login ID
   - **Password**: Your password

3. Click "Login"

4. You'll be redirected to the dashboard

## Features

### Multi-Tenant Data Isolation
- Each company's data is completely separate
- Machines, alerts, maintenance tasks are filtered by company
- Users can only access data from their own company
- Company names are case-insensitive

### Security Features
- Passwords are hashed using Werkzeug's secure password hashing
- Session-based authentication
- Protected routes require login
- API endpoints return 401 if not authenticated

### User Management
- Each company can have multiple users
- Users are assigned roles: operator, maintenance, manager, admin
- Login IDs must be unique within a company

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with company name, login ID, and password
- `POST /api/auth/register` - Register a new account
- `GET /logout` - Logout and clear session

### Protected Routes
All API endpoints (except auth endpoints) now require authentication and filter by company:
- `/api/machines` - Only shows machines for your company
- `/api/alerts` - Only shows alerts for your company
- `/api/maintenance` - Only shows maintenance tasks for your company
- `/api/summary` - Only shows summary for your company
- All chart endpoints filter by company

## Database Schema Changes

### New Table: `companies`
```sql
CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Updated Table: `users`
Added columns:
- `login_id TEXT UNIQUE` - Unique login identifier
- `password_hash TEXT` - Hashed password
- `company_id INTEGER` - Reference to companies table

### Updated Tables with `company_id`
- `machines` - Each machine belongs to a company
- `alarms` - Each alarm belongs to a company
- `maintenance_tasks` - Each task belongs to a company

## Troubleshooting

### Migration Errors
If you get "column already exists" errors, the migration has already been run. This is safe to ignore.

### Login Issues
- Make sure company name matches exactly (case-insensitive)
- Verify login ID is correct
- Check password is correct

### Data Not Showing
- Ensure you're logged in
- Verify the data belongs to your company
- Check browser console for errors

## Security Notes

⚠️ **Important**: Change the `SECRET_KEY` in production:
```python
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secure-random-key-here')
```

Set it as an environment variable:
```bash
export SECRET_KEY="your-secure-random-key-here"
```

## Example Usage

### Registering Multiple Companies
1. Register Company A with user "admin1"
2. Logout
3. Register Company B with user "admin2"
4. Login as Company A - you'll only see Company A's data
5. Logout and login as Company B - you'll only see Company B's data

### Adding Users to Existing Company
1. Login as an existing user
2. Logout
3. Register with the same company name but different login ID
4. Both users can now access the same company's data
