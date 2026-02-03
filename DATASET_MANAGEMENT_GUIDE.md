# Dataset Management & Demo Data Guide

## Overview

The IMCS system now supports comprehensive dataset management and demo data generation, allowing you to test and visualize data without live sensors. The system can operate on various types of datasets and perform high-level data operations.

## Features

### 1. Demo Data Generation

Generate realistic sample data for testing:

- **Machines**: Create multiple machines with different types, locations, and statuses
- **Sensors**: Each machine gets 2-4 sensors (Temperature, Pressure, Vibration, Speed, Efficiency, Power)
- **Sensor Readings**: Historical data for the last N days (configurable)
- **Alerts**: Sample alerts with different severity levels
- **Maintenance Tasks**: Scheduled and completed maintenance tasks

#### How to Generate Demo Data

1. Click the **"Demo Data"** button in the dashboard header
2. Click **"Generate Demo Data"** in the Dataset Management panel
3. Enter:
   - Number of machines (default: 5)
   - Days of historical data (default: 30)
4. Click OK to generate

The system will create:
- Machines with realistic names and locations
- Sensors with appropriate thresholds
- Time-series sensor readings (every 15 minutes)
- Alerts and maintenance tasks

#### Clearing Demo Data

1. Click **"Clear Demo Data"** in the Dataset Management panel
2. Confirm the action
3. All demo data for your company will be removed

### 2. Dataset Management

Import, create, and manage datasets for visualization and analysis.

#### Importing Datasets

**Supported Formats:**
- CSV files
- JSON files

**Steps:**
1. Click **"Datasets"** button in the dashboard header
2. Click **"Import Dataset"**
3. Select a CSV or JSON file
4. The system will:
   - Auto-detect column types (numeric, text, timestamp, boolean)
   - Parse and store the data
   - Make it available for visualization

**CSV Format:**
- First row should contain column headers
- Data rows follow
- System automatically detects numeric vs text columns

**JSON Format:**
- Array of objects: `[{col1: val1, col2: val2}, ...]`
- Or structured format: `{columns: [...], rows: [...]}`

#### Creating Custom Datasets

1. Click **"Create Dataset"** in the Dataset Management panel
2. Fill in the form:
   - **Dataset Name**: Unique identifier
   - **Dataset Type**: Time Series, Numeric, Categorical, Mixed, Sensor, Performance
   - **Number of Rows**: 10 to 10,000
   - **Data Pattern**: 
     - Random: Random values
     - Linear: Linear progression
     - Sine: Sine wave pattern
     - Trend Up: Upward trend
     - Trend Down: Downward trend
   - **Columns**: Comma-separated column names (e.g., `timestamp, temperature, pressure`)
3. Click **"Create Dataset"**

The system will generate synthetic data based on your specifications.

### 3. Dataset Operations

Once a dataset is loaded, you can perform various operations:

#### Filtering
- Filter rows based on column values
- Operators: equals, contains, greater than, less than, between
- Multiple filters can be combined

#### Transformation
- Calculate new columns (sum, average, multiply)
- Aggregate data (group by, count, min, max, average)
- Transform data structure

#### Analysis
- Statistical analysis
- Trend detection
- Anomaly detection
- Performance metrics

#### Export
- Export filtered/transformed data to CSV
- Export visualizations
- Download processed datasets

### 4. Dashboard Integration

The dashboard automatically visualizes:
- **KPIs**: Calculated from dataset numeric columns
- **Charts**: Time-series and distribution charts
- **Tables**: Detailed data tables with inline editing

#### Using Datasets in Dashboard

1. Load or create a dataset
2. Select it from the dropdown
3. The dashboard will:
   - Update KPIs with calculated averages
   - Render charts for numeric columns
   - Display data in tables
   - Enable filtering and operations

### 5. Data Types Supported

The system supports various data types:

- **Time Series**: Data with timestamps and numeric values
- **Numeric**: Pure numeric datasets
- **Categorical**: Data with categories/statuses
- **Mixed**: Combination of numeric and categorical
- **Sensor**: Sensor reading format (timestamp, sensor_id, value)
- **Performance**: Performance metrics (efficiency, throughput, etc.)
- **Custom**: Any structured data format

### 6. Storage

Datasets are stored in:
- **IndexedDB**: Browser-based database for client-side storage
- **LocalStorage**: Fallback for browsers without IndexedDB
- **Server**: Uploaded datasets are stored on the server

### 7. Best Practices

1. **Start with Demo Data**: Generate demo data to understand the system
2. **Import Real Data**: Import your actual CSV/JSON files for analysis
3. **Use Filters**: Filter large datasets before visualization
4. **Transform Data**: Use transformations to create derived metrics
5. **Export Results**: Export processed data for external analysis

## API Endpoints

### Generate Demo Data
```
POST /api/demo/generate
Body: {
  "num_machines": 5,
  "days": 30
}
```

### Clear Demo Data
```
POST /api/demo/clear
```

### Upload Dataset
```
POST /api/datasets/upload
FormData: file (CSV or JSON)
```

## Example Workflows

### Workflow 1: Testing Without Live Sensors

1. Generate demo data (5 machines, 30 days)
2. View dashboard with generated data
3. Test all features (alerts, maintenance, reports)
4. Clear demo data when done

### Workflow 2: Analyzing Historical Data

1. Import CSV file with historical sensor data
2. Select dataset from dropdown
3. Apply filters to focus on specific time periods
4. Transform data to calculate metrics
5. Visualize in dashboard
6. Export results

### Workflow 3: Creating Synthetic Test Data

1. Create custom dataset with specific patterns
2. Use for testing algorithms
3. Compare with real data
4. Iterate on data patterns

## Troubleshooting

**No data showing:**
- Generate demo data or import a dataset
- Check dataset selection dropdown
- Verify data format matches expected structure

**Charts not rendering:**
- Ensure dataset has numeric columns
- Check browser console for errors
- Verify Chart.js library is loaded

**Import fails:**
- Check file format (CSV or JSON)
- Verify file size (max 16MB)
- Ensure proper column headers in CSV

**Demo data not generating:**
- Check database connection
- Verify company_id in session
- Check console for error messages

## Advanced Features

### Custom Data Patterns

When creating datasets, you can specify custom patterns:
- **Random**: Good for testing general functionality
- **Linear**: Useful for trend analysis
- **Sine**: Perfect for periodic data simulation
- **Trend Up/Down**: Ideal for performance testing

### Data Transformation Examples

**Calculate Efficiency:**
- Input: `output, input`
- Operation: `(output / input) * 100`
- Result: New `efficiency` column

**Aggregate by Location:**
- Group by: `location`
- Aggregations: `avg(temperature)`, `max(pressure)`
- Result: Summary table by location

## Support

For issues or questions:
1. Check browser console for errors
2. Verify data format matches documentation
3. Test with demo data first
4. Review API responses in Network tab
