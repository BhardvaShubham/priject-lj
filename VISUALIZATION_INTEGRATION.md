# Quick Integration Checklist for Visualization System

## Steps to Add Visualization System to Any Page

### Step 1: Add Scripts to Page Head
```html
<!-- In your page's <head> section -->
<script src="/static/js/viz-manager.js" defer></script>
<script src="/static/js/chart-sync.js" defer></script>
```

### Step 2: Add Data Attributes to Charts
For **Canvas Charts (Chart.js)**:
```html
<canvas id="myChart" data-chart-type="mytype" data-tracked="true"></canvas>
```

For **Image Charts**:
```html
<img src="/chart/mytype.png" class="chart-image" data-chart-type="mytype" />
```

### Step 3: Register Charts in Your Page JavaScript
```javascript
// In your page's JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // Register Canvas Chart
  const myChartElement = document.getElementById('myChart');
  if (myChartElement && myChartElement.chart) {
    ChartSync.registerCanvas('myChart', myChartElement.chart);
  }

  // Register Image Chart
  ChartSync.registerImage('myImageChart', 'mytype');

  // Listen for global updates
  window.addEventListener('viz:data-generated', () => {
    // Your chart refresh logic here
  });

  window.addEventListener('viz:data-cleared', () => {
    // Your chart clear logic here
  });
});
```

### Step 4: Optional - Add Integration Module
Create `page-viz-integration.js` similar to `dashboard-viz-integration.js`:
```javascript
// Automatically register and sync your page's charts
(function() {
  function init() {
    if (!window.VizManager || !window.ChartSync) {
      setTimeout(init, 100);
      return;
    }

    // Register your charts
    ChartSync.registerImage('chart1', 'type1');
    ChartSync.registerImage('chart2', 'type2');

    // Listen for events
    window.addEventListener('viz:data-generated', refreshMyCharts);
    window.addEventListener('viz:data-cleared', clearMyCharts);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

---

## Pages Currently Integrated

✅ **dashboard.html** - Full integration with:
- Canvas charts (performanceChart, statusChart, alertsChart)
- Image fallback charts
- Demo data buttons
- Auto data check on load

⏳ **machinery-overview.html** - Awaiting integration
⏳ **machine-details.html** - Awaiting integration
⏳ **alerts.html** - Awaiting integration
⏳ **maintenance.html** - Awaiting integration
⏳ **reports.html** - Awaiting integration

---

## Testing the System

### Test 1: Generate Demo Data
1. Open Dashboard
2. Click "Generate Demo Data"
3. Observe:
   - Loading indicator appears
   - Delay of ~1-2 seconds
   - Charts update smoothly
   - Toast message shows success
   - Visit other pages - they should also see the data

### Test 2: Clear Data
1. Ensure demo data exists
2. Click "Clear Data" in Dataset Manager
3. Confirm action
4. Observe:
   - All charts show "No Data"
   - State is reset
   - Sidebar still works properly
   - Can generate new demo data again

### Test 3: Manual Refresh
1. With demo data loaded
2. Click "Refresh" button
3. Observe:
   - Charts fade and update
   - New data appears immediately
   - No page reload needed

### Test 4: Cross-Page Sync
1. Generate demo data on Dashboard
2. Open another page (Machinery, Alerts, etc.)
3. Data should be visible there too
4. Clear data on Dashboard
5. Other pages should also clear

---

## Console Debugging

The system logs to console with `[VIZ]`, `[SYNC]`, and `[DASHBOARD-VIZ]` prefixes.

```javascript
// Helpful debug commands:
VizManager.getState()           // Check current state
ChartSync.getState()            // Check chart registry
VizManager.isLoaded()           // Is data loaded?
VizManager.loadStats()          // Get data statistics

// Monitor events
window.addEventListener('viz:data-generated', (e) => {
  console.log('Data generated:', e.detail);
});
```

---

## Performance Tips

1. **Stagger page loads** - Don't load all charts at once
2. **Use image fallbacks** - Much lighter than Canvas
3. **Cache busting** - Automatically handled with timestamps
4. **Batch updates** - System automatically batches chart updates
5. **Performance first** - System optimized for older devices too

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Charts not updating | Run `VizManager.refreshCharts()` |
| Data not appearing | Run `VizManager.checkData()` |
| Events not firing | Check console for errors, verify scripts loaded |
| Slow updates | Check network speed, verify server responding |
| Page lag | Clear browser cache, restart page |

---

## Code Examples

### Example 1: Custom Chart Refresh
```javascript
// Manually trigger chart refresh
async function refreshMyCharts() {
  if (!VizManager.isLoaded()) {
    console.log('No data to visualize');
    return;
  }

  // Update your charts
  ChartSync.syncAllCharts();

  // Show feedback
  console.log('Charts refreshed at', new Date().toISOString());
}
```

### Example 2: Listen to Specific Events
```javascript
// React to demo data generation
window.addEventListener('viz:data-generated', (event) => {
  const { machines, days, recordsCreated } = event.detail;

  console.log(`Generated ${recordsCreated} records`);
  console.log(`${machines} machines over ${days} days`);

  // Update your page-specific logic
  updatePageStats(machines, recordsCreated);
});
```

### Example 3: Show Data Statistics
```javascript
// Display current data stats
async function displayDataStats() {
  const stats = await VizManager.loadStats();

  document.getElementById('machineCount').textContent = stats.machines;
  document.getElementById('sensorCount').textContent = stats.sensors;
  document.getElementById('readingCount').textContent = stats.readings;
}
```

---

## Next Steps

To fully integrate the system across your application:

1. ✅ Dashboard - **DONE** - Full integration
2. Add to Machinery Overview page
3. Add to Machine Details page
4. Add to Alerts page
5. Add to Maintenance page
6. Add to Reports page
7. Add WebSocket real-time updates (future)
8. Add analytics visualization (future)

---

*For more details, see VISUALIZATION_SYSTEM.md*
