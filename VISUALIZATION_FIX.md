# Visualization System - Quick Fixes & Troubleshooting

## ✅ What Was Fixed

### Fixed Issues:
1. **Chart Element Tracking** - Now properly tracks fallback image elements
2. **Image Update Logic** - Correctly updates image-based charts with src attributes
3. **Staggered Updates** - Charts update sequentially to prevent UI blocking
4. **Error Handling** - Comprehensive try-catch for all operations
5. **Clear Charts** - Creates "No Data" placeholder SVG when clearing
6. **Loading Indicator** - Enhanced visual feedback during processing
7. **State Synchronization** - Better tracking of data load status
8. **Data Check** - Improved API error handling

### Enhanced Features:
- ✅ Better logging for debugging
- ✅ Update prevention (no duplicate updates)
- ✅ Graceful degradation
- ✅ More robust canvas chart handling
- ✅ Fallback for missing elements

---

## 🚀 How to Test

### Test 1: Generate Demo Data
```
1. Open Dashboard in browser
2. Open Browser Dev Tools (F12)
3. Click "Generate Demo Data" button
4. Watch Console for [VIZ] logs
5. Observe:
   - Loading indicator appears
   - "⏳ Processing... Please wait" message
   - Delay of ~2-3 seconds
   - Charts fade and update
   - Success message: "✓ Generated X data points"
   - Console shows: "[VIZ] Refreshed 3 charts"
```

### Test 2: Clear Data
```
1. With demo data loaded
2. Click "Clear Data" button
3. Confirm dialog
4. Watch Console
5. Observe:
   - Loading indicator
   - Charts show "No Data"
   - Success message: "✓ All data cleared"
   - Console shows: "[VIZ] All charts cleared"
```

### Test 3: Refresh Charts
```
1. With demo data loaded
2. Click "Refresh" button
3. Watch Charts
4. Observe:
   - Charts fade (opacity: 0.5)
   - Charts refresh
   - Charts fade back in
   - Charts updated successfully
```

---

## 🔍 Console Debugging Commands

Open Browser Console (F12) and run these commands:

```javascript
// Check visualization state
VizManager.getState()
// Output: { isDataLoaded: true, dataCount: 12345, ... }

// Check if data is loaded
VizManager.isLoaded()
// Output: true or false

// Get data statistics
VizManager.loadStats()
// Output: { machines: 5, sensors: 25, readings: 12345, alerts: 0 }

// Force check data
await VizManager.checkData()
// Output: true or false

// Check chart registry
ChartSync.getState()
// Output: { canvasCharts: 3, imageCharts: 0, totalCharts: 3 }

// Manually refresh charts
VizManager.refreshCharts()
// Refreshes all charts on page

// Manually clear charts
VizManager.clearCharts()
// Clears all visualizations

// Generate demo data
await VizManager.generateDemo({ machines: 5, days: 7 })
// Generates demo data with visualization

// Clear demo data
await VizManager.clearDemo()
// Clears all demo data and visualizations
```

---

## 📊 Understanding Console Logs

The system logs with prefixes:

```
[VIZ]          - VizManager logs
[SYNC]         - ChartSync logs
[DASHBOARD-VIZ] - Dashboard integration logs
```

### Example Debug Session:

```
[VIZ] Visualization Manager loaded and ready
[VIZ] Initializing Visualization Manager
[VIZ] Initial data check: Data found
[VIZ] Attaching event listeners...
[DASHBOARD-VIZ] Module loaded
[DASHBOARD-VIZ] Initializing dashboard visualization integration
[DASHBOARD-VIZ] Performing initial data check...
[DASHBOARD-VIZ] Data found, loading visualizations
[VIZ] Refreshing all charts...
[VIZ] Updated fallback chart: performanceChartFallback
[VIZ] Updated fallback chart: statusChartFallback
[VIZ] Updated fallback chart: alertsChartFallback
[VIZ] Refreshed 3 charts
[DASHBOARD-VIZ] Integration complete
```

---

## 🐛 Troubleshooting Guide

### Issue: "Generate Demo Data" button does nothing

**Solution:**
1. Check console for errors (F12 → Console tab)
2. Verify API endpoint: `/api/demo/generate` exists
3. Check if server is running
4. Clear browser cache (Ctrl+Shift+Del)
5. Reload page (Ctrl+R)

```javascript
// Debug command:
fetch('/api/demo/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ num_machines: 5, days_of_data: 7 })
}).then(r => r.json()).then(d => console.log(d))
```

---

### Issue: Charts not updating after generating data

**Solution:**
1. Check console logs for errors
2. Verify charts are being found:
   ```javascript
   document.getElementById('performanceChartFallback') // Should exist
   document.getElementById('statusChartFallback')      // Should exist
   document.getElementById('alertsChartFallback')      // Should exist
   ```
3. Check chart URLs are accessible:
   ```javascript
   fetch('/chart/summary.png')  // Should return 200
   fetch('/chart/status.png')   // Should return 200
   fetch('/chart/alerts-trend.png') // Should return 200
   ```

---

### Issue: Loading indicator stuck

**Solution:**
1. Manually hide it:
   ```javascript
   document.getElementById('vizLoadingIndicator').style.display = 'none'
   ```
2. Check API response:
   ```javascript
   // Test API directly
   await VizManager.loadStats()
   ```
3. Check network tab in Dev Tools (F12 → Network)

---

### Issue: "No data to visualize" message appears

**Solution:**
1. Verify data exists in database:
   ```javascript
   await VizManager.loadStats()
   // Should show machines > 0 or readings > 0
   ```
2. If no data, generate it:
   ```javascript
   await VizManager.generateDemo()
   ```
3. Check API endpoint:
   ```javascript
   fetch('/api/summary').then(r => r.json()).then(d => console.log(d))
   ```

---

## ✨ Performance Tips

1. **Keep console closed** during operations (reduces logging overhead)
2. **Use latest browser** (Chrome/Firefox recommended)
3. **Check network speed** - slow connections may need longer timeouts
4. **Clear browser cache** if charts look stale
5. **Don't spam buttons** - system prevents duplicate updates

---

## 🧪 Full Test Scenario

```
Step 1: Open Dashboard
  → Should see "No Data" state in charts
  → Console shows initialization logs

Step 2: Click "Generate Demo Data"
  → Loading indicator appears
  → Charts fade and update
  → Success message appears
  → Charts show data

Step 3: Click "Refresh" button
  → Charts fade
  → Charts update
  → Charts come back

Step 4: Visit other pages
  → Data should be visible everywhere
  → Sidebar working properly

Step 5: Return to Dashboard
  → Click "Clear Data"
  → Confirm dialog
  → Charts show "No Data"
  → Success message appears

Step 6: Walk through each page
  → All pages show "No Data"
  → Sidebar still works
  → Can navigate normally
```

---

## 📝 System Architecture

```
User Clicks Button
        ↓
VizManager Intercepts
        ↓
Shows Loading Indicator
        ↓
API Call to /api/demo/generate
        ↓
Server Creates Records + Charts
        ↓
Dispatch Event: viz:data-generated
        ↓
VizManager Updates State
        ↓
Finds All Chart Elements
        ↓
Updates Fallback Images
        ↓
Charts Fade In (success)
        ↓
Hide Loading Indicator
        ↓
Show Success Toast
        ↓
DONE ✓
```

---

## 📞 Quick Reference

| Action | Command |
|--------|---------|
| Generate data | `VizManager.generateDemo()` |
| Clear data | `VizManager.clearDemo()` |
| Refresh charts | `VizManager.refreshCharts()` |
| Check state | `VizManager.getState()` |
| Check if loaded | `VizManager.isLoaded()` |
| Get statistics | `await VizManager.loadStats()` |
| Clear UI alerts | `document.getElementById('vizToast').style.display = 'none'` |

---

## 🔄 Manual Recovery Steps

If visualization gets stuck:

```javascript
// Step 1: Clear state
VizManager.clearCharts()

// Step 2: Re-check data
await VizManager.checkData()

// Step 3: Refresh manually
VizManager.refreshCharts()

// Step 4: Or reload page
location.reload()
```

---

*All systems now functioning correctly with improved error handling and logging.*
