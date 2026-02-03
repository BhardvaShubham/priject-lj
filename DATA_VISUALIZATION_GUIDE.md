# Data Visualization & Editing Guide

## Overview
The Reports page now includes comprehensive data visualization with detailed tables and inline editing capabilities.

## Features

### 1. Machine Performance Data
- **Visualization**: Bar chart showing efficiency for all machines
- **Data Table**: Detailed table with machine information
- **Editable Fields**: Name, Type, Location, Status
- **Actions**: Edit button to modify data inline

**How to Use:**
1. Click "Load Data" button in the Machine Performance Data section
2. View the bar chart showing machine efficiencies
3. Scroll down to see the detailed data table
4. Click the edit (✎) button on any row to edit fields
5. Click on editable cells to modify values
6. Press Enter to save or Escape to cancel
7. Use "Export" button to download data as CSV

### 2. Sensor Readings Analysis
- **Visualization**: Line chart showing sensor reading trends (last 50 readings)
- **Data Table**: Complete sensor readings with machine information
- **Editable Fields**: Value, Timestamp
- **Actions**: Edit and Delete buttons

**How to Use:**
1. Click "Load Data" button in the Sensor Readings Analysis section
2. View the line chart showing sensor trends
3. Scroll down to see the detailed data table
4. Click edit (✎) to modify values or timestamps
5. Click delete (🗑) to remove sensor readings
6. Changes are saved automatically to the database
7. Use "Export" button to download data as CSV

### 3. CSV Data Analysis
- **Visualization**: Line and Bar charts from uploaded CSV files
- **Data Table**: Full CSV data displayed in editable table
- **Editable Fields**: All CSV columns are editable
- **Actions**: Edit button for each row

**How to Use:**
1. Drag and drop a CSV file or click to upload
2. View visualizations (Line and Bar charts)
3. Scroll down to see the complete data table
4. Click edit (✎) to modify any cell
5. Changes are saved locally (client-side only)
6. Use "Export" button to download modified data as CSV

## Editing Features

### Inline Editing
- Click the edit (✎) button on any row
- All editable cells become input fields
- Modify values directly in the table
- Press **Enter** to save changes
- Press **Escape** to cancel editing
- Click outside the cell to save (on blur)

### Save Status Indicators
- **Saving...** (yellow) - Changes are being saved
- **Saved** (green) - Changes saved successfully
- **Error** (red) - Save failed, check error message

### Editable Fields

**Machines Table:**
- Name
- Type
- Location
- Status

**Sensors Table:**
- Value
- Timestamp

**CSV Table:**
- All columns (client-side editing only)

## Data Export

### Export to CSV
1. Click the "Export" button above any data table
2. CSV file will download automatically
3. File includes all visible data (excluding Actions column)
4. Can be opened in Excel, Google Sheets, etc.

## API Endpoints

### Data Retrieval
- `GET /api/data/machines/all` - Get all machines with performance data
- `GET /api/data/sensors/all` - Get all sensor readings (last 500)

### Data Updates
- `PUT /api/data/machines/<id>` - Update machine data
  ```json
  {
    "name": "New Name",
    "type": "CNC",
    "location": "Floor A",
    "status": "running"
  }
  ```

- `PUT /api/data/sensors/<id>` - Update sensor reading
  ```json
  {
    "value": 85.5,
    "timestamp": "2024-01-01 12:00:00"
  }
  ```

### Data Deletion
- `DELETE /api/data/sensors/<id>` - Delete sensor reading

## Security

- All endpoints require authentication
- Data is filtered by company (multi-tenant isolation)
- Only users from the same company can view/edit data
- Changes are logged in audit log

## Tips

1. **Performance**: Large datasets are limited to 500 sensor readings for performance
2. **CSV Editing**: CSV data editing is client-side only (doesn't save to server)
3. **Real-time Updates**: Click "Load Data" again to refresh with latest data
4. **Keyboard Shortcuts**: Use Enter to save, Escape to cancel while editing
5. **Export**: Export before making changes to keep a backup

## Troubleshooting

### Data Not Loading
- Check browser console for errors
- Verify you're logged in
- Ensure you have data in your company

### Edit Not Working
- Make sure you clicked the edit button first
- Check that the field is editable (has edit button)
- Verify network connection

### Save Failed
- Check error message in status indicator
- Verify field values are valid
- Ensure you have permission to edit

### Export Not Working
- Check browser download settings
- Ensure table has data loaded
- Try a different browser if issues persist
