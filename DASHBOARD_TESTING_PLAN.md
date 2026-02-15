# Dashboard Testing & Verification Plan

## Purpose
Verify that all dashboard features are working correctly after recent fixes and enhancements.

## Test Categories

### 1. **API Endpoints Verification**
All required endpoints for dashboard operation exist and are functional:
- GET /api/dashboard/widgets - KPI and location data
- GET /api/machines - List of machines with efficiency
- GET /api/alerts?ack=0 - Unacknowledged alerts
- POST /api/alerts/{id}/ack - Acknowledge alert
- GET /api/maintenance - Maintenance task list
- POST /api/maintenance - Create maintenance task
- GET /api/chart-data/summary - Chart data
- GET /chart/summary.png - Performance chart
- GET /chart/status.png - Status chart
- GET /chart/alerts-trend.png - Alerts trend chart
- POST /api/demo/generate - Generate demo data
- POST /api/demo/clear - Clear demo data

### 2. **Dashboard Page Load**
- [ ] Page loads without JavaScript errors (check F12 console)
- [ ] All DOM elements exist and are accessible
- [ ] Chart containers render properly
- [ ] Modals exist and are hidden initially
- [ ] No 404 errors for static assets

### 3. **KPI Widgets Loading**
After page load or demo data generation:
- [ ] k_total shows total machines
- [ ] k_running shows "Running: X" format
- [ ] k_uptime shows "Uptime: X%" format
- [ ] k_maintenance shows "Maintenance: X" format
- [ ] k_health shows percentage and status (Excellent/Good/Warning)
- [ ] All values update after demo data generation

### 4. **Machine Status Breakdown**
- [ ] status_running shows running count
- [ ] status_running_pct shows percentage
- [ ] status_idle shows idle count
- [ ] status_idle_pct shows percentage
- [ ] status_maintenance shows maintenance count
- [ ] status_maintenance_pct shows percentage
- [ ] status_offline shows offline count
- [ ] status_offline_pct shows percentage
- [ ] All percentages sum to 100%

### 5. **Charts Rendering**

**Performance Trend Chart (Line Chart)**
- [ ] Canvas renders without errors
- [ ] Shows 7 data points (7 days)
- [ ] X-axis shows dates (Feb 15, Feb 16, etc.)
- [ ] Y-axis shows "Efficiency %" from 0-100
- [ ] Line is blue with semi-transparent fill
- [ ] Auto-refreshes every 2 minutes

**Status Distribution Chart (Doughnut Chart)**
- [ ] Canvas renders without errors
- [ ] Shows 4 slices: Running, Idle, Maintenance, Offline
- [ ] Colors correct: green, blue, orange, red
- [ ] Legend displays properly
- [ ] Auto-refreshes every 2 minutes

**Performance Matrix Chart (Bubble Chart)**
- [ ] Canvas renders without errors
- [ ] Shows one bubble per machine
- [ ] Bubble colors match status
- [ ] Bubble sizes represent efficiency
- [ ] Auto-refreshes every 2 minutes

### 6. **Alerts Section**
- [ ] alertsList populates with alerts
- [ ] Shows "No active alerts" when empty
- [ ] Each alert shows machine, severity, message, timestamp
- [ ] Severity color-coded correctly
- [ ] Each alert has "Acknowledge" button
- [ ] Auto-refreshes every 30 seconds

**Alert Acknowledgement Modal**
- [ ] Modal opens on "Acknowledge" click
- [ ] Shows alert details (machine, severity, message)
- [ ] Comment field accepts input
- [ ] "Acknowledge & Resolve" submits and closes
- [ ] Alert removed from list after success
- [ ] Proper error handling on failure

### 7. **Maintenance Task Creation**
**Opening Modal**
- [ ] "Create Maintenance" button in header
- [ ] Modal opens with form fields
- [ ] Machine dropdown populated correctly

**Form Submission**
- [ ] Machine dropdown shows "Name (Type)" format
- [ ] Description field accepts text
- [ ] Priority dropdown has all options
- [ ] Scheduled Date is date picker
- [ ] Technician field optional
- [ ] Form validation works
- [ ] Success closes modal and clears form
- [ ] Error messages display properly

### 8. **Error Handling**
- [ ] Page doesn't crash if APIs fail
- [ ] All functions in try-catch blocks
- [ ] No crashes on missing DOM elements
- [ ] Alert messages properly escaped
- [ ] Special characters handled correctly
- [ ] Console shows [DASHBOARD] prefix

### 9. **Auto-Refresh & Timers**
- [ ] KPI widgets refresh every 60 seconds
- [ ] Machine status refreshes every 60 seconds
- [ ] Alerts refresh every 30 seconds
- [ ] Charts refresh every 2 minutes
- [ ] No duplicate timers
- [ ] Data updates visible to user

### 10. **Demo Data Workflow**
**Generate**
- [ ] Click "Demo Data" button
- [ ] Generate 5 machines, 30 days
- [ ] After 2 seconds, dashboard updates
- [ ] All sections show new data
- [ ] Success message appears

**Clear**
- [ ] Click "Cle Demo Data" button
- [ ] Confirmation dialog appears
- [ ] After clearing: all sections reset
- [ ] KPI widgets show "—"
- [ ] Alerts show "No active alerts"
- [ ] Charts clear properly
- [ ] Success message shown

## Quick Start Tests

### Browser Console Tests
```javascript
// Check APIs
fetch('/api/dashboard/widgets').then(r => r.json()).then(d => console.log('Widgets:', d))
fetch('/api/machines').then(r => r.json()).then(d => console.log('Machines:', d))
fetch('/api/alerts?ack=0').then(r => r.json()).then(d => console.log('Alerts:', d))

// Generate demo data
fetch('/api/demo/generate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({num_machines: 5, days: 30})
}).then(r => r.json()).then(d => console.log('Demo result:', d))

// Check chart data
fetch('/api/chart-data/summary').then(r => r.json()).then(d => console.log('Chart data:', d))
```

## Testing Checklist

1. **Setup**
   - [ ] Open browser to /dashboard
   - [ ] Open F12 console
   - [ ] Check for errors

2. **Load Test**
   - [ ] Page loads in under 3 seconds
   - [ ] All elements visible
   - [ ] No 404 errors
   - [ ] No JavaScript errors

3. **Demo Data Test**
   - [ ] Click "Demo Data" button
   - [ ] Generate 5 machines, 30 days
   - [ ] All sections update with data

4. **Functionality Test**
   - [ ] View active alerts
   - [ ] Acknowledge one alert
   - [ ] Verify it disappears
   - [ ] Create maintenance task
   - [ ] Verify success

5. **Data Integrity**
   - [ ] Wait 2 minutes for auto-refresh
   - [ ] Verify data consistency
   - [ ] Charts still formatted correctly

6. **Clear Data Test**
   - [ ] Clear demo data
   - [ ] Confirm all sections reset
   - [ ] Verify success message

## Expected Results

All tests should pass:
- No red console errors
- All UI elements responsive
- All forms submitting correctly
- All data displaying properly
- No crashes or page reloads

## Troubleshooting

If issues occur, check:
1. Flask running on http://127.0.0.1:8000
2. Database file exists (imcs.db)
3. Required .js files loaded (chart-sync.js, viz-manager.js, etc.)
4. Chart.js library available from CDN
5. Network tab shows 200 responses for API calls
