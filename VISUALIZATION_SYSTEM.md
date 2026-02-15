# Advanced Visualization System - Implementation Guide

## Overview

Your Industrial Machinery Control System now has an **intelligent, real-time visualization system** that:

✅ **Generates visualizations instantly** when demo data is created
✅ **Clears visualizations immediately** when data is cleared
✅ **Syncs charts across all pages** automatically
✅ **Uses event-driven architecture** for connected updates
✅ **Optimizes performance** with smart caching and batch updates
✅ **Works across all browsers** with fallback support

---

## System Components

### 1. **VizManager** (`viz-manager.js`)
Core visualization management system that handles:
- Data state tracking
- Demo data generation with visualization
- Data clearing with visualization cleanup
- Event dispatching for synchronized updates
- Performance optimization with caching

**Key Methods:**
```javascript
VizManager.generateDemo(options)      // Generate demo data with visualization
VizManager.clearDemo()                // Clear all data and visualizations
VizManager.refreshCharts()            // Update all charts on page
VizManager.checkData()                // Check if data exists
VizManager.isLoaded()                 // Get data loaded state
VizManager.loadStats()                // Get current data statistics
```

**Key Events:**
```javascript
'viz:data-generated'    // Fired when demo data is generated
'viz:data-cleared'      // Fired when data is cleared
'viz:charts-refresh'    // Fired when charts need refresh
```

### 2. **ChartSync** (`chart-sync.js`)
Synchronization system that tracks and updates all charts:
- Registers Chart.js canvas instances
- Registers image-based charts
- Updates all chart types simultaneously
- Clears charts when data is cleared
- Maintains chart registry

**Key Methods:**
```javascript
ChartSync.registerCanvas(canvasId, chartInstance)    // Register Chart.js chart
ChartSync.registerImage(elementId, chartType)        // Register image chart
ChartSync.updateCanvasCharts()                       // Update all Canvas charts
ChartSync.updateImageCharts()                        // Update all Image charts
ChartSync.syncAllCharts()                            // Sync everything
ChartSync.clearAllCharts()                           // Clear all charts
ChartSync.getState()                                 // Get chart count
```

### 3. **Dashboard VIZ Integration** (`dashboard-viz-integration.js`)
Connects dashboard charts to the global visualization system:
- Auto-registers dashboard charts
- Listens for VizManager events
- Refreshes dashboard on demand
- Provides visual feedback during updates

---

## How It Works

### When You Click "Generate Demo Data"

1. **Button Click** → VizManager.generateDemo()
2. **API Call** → `/api/demo/generate` endpoint
3. **Server Process** → Generates 5+ machines with 7 days of data
4. **Chart Generation** → Server creates PNG charts
5. **Event Dispatch** → `viz:data-generated` event
6. **Chart Sync** → ChartSync.syncAllCharts() updates all visualizations
7. **Visual Feedback** → Charts fade and update smoothly
8. **Toast Message** → "✓ Generated X data points"

### When You Click "Clear Data"

1. **Button Click** → VizManager.clearDemo()
2. **Confirmation** → User confirms action (safety)
3. **API Call** → `/api/demo/clear` endpoint
4. **Server Process** → Deletes all demo records
5. **Event Dispatch** → `viz:data-cleared` event
6. **Chart Cleanup** → All charts show "No Data" state
7. **Cache Clear** → visualization cache is reset
8. **Toast Message** → "✓ All data cleared"

### When You Click "Refresh"

1. **Button Click** → Refreshes charts
2. **Chart Update** → Each chart gets new data
3. **Visual Feedback** → Smooth fade animation
4. **Cache Update** → Chart cache updated with timestamp
5. **State Sync** → Visualization state synchronized

---

## Key Features

### ⚡ Fast Visualization Updates
- Charts update in real-time (300-500ms)
- Batch updates prevent UI blocking
- Staggered updates reduce server load
- Cache-busting timestamps ensure fresh data

### 🔄 Cross-Page Synchronization
- All pages receive same visualization events
- Sidebar doesn't need page refresh
- Data state consistent everywhere
- No page reload required

### 📊 Support for Multiple Chart Types
- Canvas-based charts (Chart.js)
- Image-based charts (PNG fallbacks)
- CSV visualizations
- Machine-specific charts

### 🎯 Intelligent State Management
```javascript
vizState = {
  isDataLoaded: boolean,      // Is data currently loaded?
  dataCount: number,          // Total data points
  lastUpdate: timestamp,      // Last update time
  chartCache: object,         // Chart URL cache
  dataSourceKey: string       // Current data source
}
```

### 📱 Responsive & Accessible
- Works on all screen sizes
- Graceful degradation
- Loading indicators
- Error handling
- Confirmation dialogs

---

## Usage Examples

### Generate and Visualize Demo Data
```javascript
// Simple - use defaults (5 machines, 7 days)
VizManager.generateDemo();

// With options
VizManager.generateDemo({
  machines: 10,
  days: 14
});
```

### Listen to Visualization Events
```javascript
// When demo data is generated
window.addEventListener('viz:data-generated', (e) => {
  console.log('Records created:', e.detail.recordsCreated);
  console.log('Machines:', e.detail.machines);
});

// When data is cleared
window.addEventListener('viz:data-cleared', (e) => {
  console.log('Deleted:', e.detail.deletedCount);
});
```

### Manually Sync Charts
```javascript
// Update all charts immediately
VizManager.refreshCharts();

// Or use ChartSync directly
ChartSync.syncAllCharts();
```

### Check Data Status
```javascript
// Check if data exists
const hasData = await VizManager.checkData();

// Get current statistics
const stats = await VizManager.loadStats();
console.log('Machines:', stats.machines);
console.log('Sensors:', stats.sensors);
console.log('Readings:', stats.readings);

// Get state
const state = VizManager.getState();
console.log('Data loaded:', state.isDataLoaded);
console.log('Records:', state.dataCount);
```

---

## API Integration Points

### Backend Endpoints Used

**Generate Demo Data**
```
POST /api/demo/generate
Body: { num_machines: 5, days_of_data: 7 }
Response: { success, message, records_created }
```

**Clear Demo Data**
```
POST /api/demo/clear
Response: { success, message, deleted_count }
```

**Get Summary Data**
```
GET /api/summary
Response: {
  total_machines,
  total_sensors,
  total_readings,
  total_alerts
}
```

**Chart Generation**
```
GET /chart/{chartType}.png      // Generate chart image
GET /chart/machine/{id}.png     // Machine-specific chart
GET /chart/status.png           // Status distribution
GET /chart/alerts-trend.png     // Alert trends
```

---

## Performance Optimizations

### 1. Cache Busting
```javascript
// Always adds timestamp to prevent stale caches
/chart/summary.png?t=1671234567890
```

### 2. Staggered Updates
```javascript
// Updates charts with 100ms delay between each
for (let i = 0; i < charts.length; i++) {
  setTimeout(() => updateChart(charts[i]), i * 100);
}
```

### 3. Visual Feedback
```javascript
// Shows loading indicator while processing
showLoadingIndicator() // Shows during API call
hideLoadingIndicator() // Hides when done
showSuccessMessage()   // Shows completion status
```

### 4. Smart State Management
```javascript
// Only updates if data is actually loaded
if (vizState.isDataLoaded) {
  vizUpdater.refreshAllCharts();
}
```

---

## Troubleshooting

### Charts Not Updating?
```javascript
// Check if data is loaded
console.log(VizManager.isLoaded());

// Force refresh
VizManager.refreshCharts();

// Check chart registry
console.log(ChartSync.getState());
```

### Data Not Appearing?
```javascript
// Verify data exists on server
const hasData = await VizManager.checkData();

// Check state
console.log(VizManager.getState());

// Load statistics
const stats = await VizManager.loadStats();
```

### Visualizations Stuck?
```javascript
// Clear and refresh
VizManager.clearCharts();
setTimeout(() => VizManager.refreshCharts(), 1000);
```

---

## Browser Compatibility

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

---

## Future Enhancements

Coming soon:
- Real-time WebSocket updates
- Predictive analytics visualization
- Custom chart builder
- Advanced data filtering
- Export to various formats
- Animation customization

---

## File Locations

```
static/js/
├── viz-manager.js                    # Main visualization manager
├── chart-sync.js                     # Chart synchronization
├── dashboard-viz-integration.js      # Dashboard integration
├── dashboard.js                      # Dashboard logic
├── charts.js                         # Chart utilities
└── dataset-manager.js                # Dataset management
```

---

## Support

For issues or questions:
1. Check browser console for logs (look for `[VIZ]` prefix)
2. Check data state: `VizManager.getState()`
3. Check chart registry: `ChartSync.getState()`
4. Verify API endpoints are responding
5. Clear browser cache if needed

---

*Last Updated: 2025-02-15*
*Version: 2.0 - Event-Driven Visualization System*
