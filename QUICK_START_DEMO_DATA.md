# Quick Start: Demo Data & Dataset Management

## 🚀 Quick Start (5 Minutes)

### Step 1: Generate Demo Data

1. **Start the application:**
   ```bash
   python app.py
   ```

2. **Login to your account** (or register if you don't have one)

3. **Click "Demo Data" button** in the dashboard header

4. **Click "Generate Demo Data"** and enter:
   - Number of machines: `5` (or any number)
   - Days of data: `30` (or any number)

5. **Wait for confirmation** - The system will create:
   - Machines with sensors
   - Historical sensor readings
   - Alerts and maintenance tasks

6. **View your dashboard** - All data will now be visible!

### Step 2: Explore the Dashboard

After generating demo data, you'll see:
- **KPIs**: Total machines, efficiency, alerts, system health
- **Charts**: Performance trends, status distribution, alerts
- **Machine List**: All generated machines with their status
- **Location Breakdown**: Performance by location

### Step 3: Import Your Own Data

1. **Click "Datasets" button** in dashboard header
2. **Click "Import Dataset"**
3. **Select a CSV or JSON file**
4. **Select the dataset** from dropdown to visualize

## 📊 Dataset Management Features

### Generate Demo Data
- Creates realistic machines, sensors, and readings
- Configurable number of machines and days
- Perfect for testing without live sensors

### Import Datasets
- **CSV**: First row = headers, rest = data
- **JSON**: Array of objects or structured format
- Auto-detects column types (numeric, text, timestamp)

### Create Custom Datasets
- Define your own data patterns
- Choose from: Random, Linear, Sine, Trends
- Specify columns and row count

### Dataset Operations
- **Filter**: Filter rows by column values
- **Transform**: Calculate new columns, aggregate data
- **Analyze**: Statistical analysis and trends
- **Export**: Download processed data

## 🎯 Use Cases

### Testing Without Live Sensors
1. Generate demo data
2. Test all features
3. Clear when done

### Analyzing Historical Data
1. Import CSV with historical data
2. Filter and transform
3. Visualize in dashboard
4. Export results

### Creating Test Scenarios
1. Create custom dataset with specific patterns
2. Test algorithms and visualizations
3. Compare with real data

## 🔧 Troubleshooting

**No data showing?**
- Generate demo data first
- Check dataset selection dropdown
- Verify you're logged in

**Charts not rendering?**
- Ensure dataset has numeric columns
- Check browser console for errors
- Refresh the page

**Import fails?**
- Check file format (CSV or JSON)
- Verify file size (max 16MB)
- Ensure proper headers in CSV

## 📝 Example CSV Format

```csv
timestamp,temperature,pressure,efficiency
2024-01-01 00:00:00,45.2,120.5,85.3
2024-01-01 00:15:00,46.1,121.2,86.1
2024-01-01 00:30:00,47.3,119.8,84.9
```

## 🎨 Dashboard Integration

The dashboard automatically:
- Calculates KPIs from numeric columns
- Renders charts for time-series data
- Displays data in tables
- Enables filtering and operations

## 💡 Tips

1. **Start Small**: Generate 3-5 machines with 7 days of data first
2. **Use Filters**: Filter large datasets before visualization
3. **Export Results**: Save processed data for external analysis
4. **Clear When Done**: Clear demo data to start fresh

## 📚 More Information

See `DATASET_MANAGEMENT_GUIDE.md` for detailed documentation.
