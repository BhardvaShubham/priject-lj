# Bug Fixes Report - OEE Chart and Canvas Reuse Issues

## Issues Fixed

### 1. **Server Error: /chart/oee/<id>.png returns 500**

**Root Cause:**
The endpoint was calling `oee()` route function directly instead of calculating OEE directly:
```python
oee_data = oee(mid)
oee_val = oee_data.get_json().get("oee", 0)  # ❌ Error: Can't call route function
```

**Solution Applied:**
Modified `/chart/oee/<int:mid>.png` endpoint in `app.py` (lines 627-653) to:
1. Add `@login_required` decorator for authentication
2. Verify machine belongs to user's company
3. Calculate OEE directly from sensor readings instead of calling the route function
4. Return properly formatted PNG

```python
@app.route("/chart/oee/<int:mid>.png")
@login_required
def chart_oee(mid):
    """OEE gauge chart for a machine."""
    company_id = get_current_company_id()
    with db() as c:
        machine = c.execute(
            "SELECT id FROM machines WHERE id=? AND company_id=?",
            (mid, company_id)
        ).fetchone()
        if not machine:
            return send_file(io.BytesIO(), mimetype="image/png")

        # Calculate OEE directly
        eff = c.execute(
            """SELECT AVG(value) FROM sensor_readings
               WHERE sensor_id IN (
                 SELECT id FROM sensors WHERE machine_id=?
               )""",
            (mid,)
        ).fetchone()[0] or 0

    availability = 100 if eff > 0 else 0
    oee_val = round((availability/100) * (eff/100) * 100, 1)

    buf = viz.oee_gauge_chart(oee_val)
    return send_file(buf, mimetype="image/png")
```

**Result:** ✅ Server now returns valid 200 OK with PNG image

---

### 2. **Client Error: Canvas already in use - Chart reuse conflict**

**Root Cause:**
Chart.js doesn't allow reusing a canvas element for multiple chart instances without destroying the previous one first. When refreshing or re-rendering charts, the old chart instance needed to be destroyed.

```javascript
new Chart(ctx, {...})  // ❌ Error if canvas already has a chart
```

**Solution Applied:**
Created a helper function and updated all chart rendering functions in `charts-enhanced.js`:

#### Helper Function (lines 142-149)
```javascript
// Helper: Destroy existing chart on canvas to prevent reuse conflicts
function destroyExistingChart(canvasElement) {
  if (!canvasElement) return;
  const canvasCtx = canvasElement.getContext ? canvasElement.getContext('2d') : null;
  if (canvasCtx && canvasCtx.canvas.__chartInstance) {
    canvasCtx.canvas.__chartInstance.destroy();
  }
}
```

#### Updated All Chart Functions
Modified 5 chart rendering functions to:
1. Call `destroyExistingChart(ctx)` before creating new chart
2. Store chart reference: `ctx.__chartInstance = chart`

**Functions Fixed:**
1. `renderEnhancedPerformanceChart()` - Lines 152-218
2. `renderEnhancedStatusChart()` - Lines 220-275
3. `renderEnhancedAlertsChart()` - Lines 278-351
4. `renderEnhancedMachineComparison()` - Lines 353-421
5. `renderOEEGauge()` - Lines 423-479

**Pattern Applied:**
```javascript
function renderChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return false;

  // ✅ Destroy existing chart first
  destroyExistingChart(ctx);

  // Create new chart
  const chart = new Chart(ctx.getContext('2d'), {...});

  // ✅ Store reference for future cleanup
  ctx.__chartInstance = chart;
  return true;
}
```

**Result:** ✅ Charts now update smoothly without canvas reuse errors

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `app.py` | Fixed `/chart/oee/<id>.png` endpoint | 627-653 |
| `charts-enhanced.js` | Added `destroyExistingChart()` helper + fixed 5 chart functions | 142-479 |

---

## Testing Verification

### Before Fixes
```
Error 1: GET /chart/oee/115.png → 500 INTERNAL SERVER ERROR
Error 2: "Canvas is already in use. Chart with ID '0' must be destroyed"
```

### After Fixes
```
✅ GET /chart/oee/115.png → 200 OK (returns PNG)
✅ Charts render without canvas reuse errors
✅ Chart refresh/reload works smoothly
```

---

## Impact

- **Server Stability:** Chart endpoints now return valid responses
- **Client Stability:** No more canvas reuse errors on chart updates
- **User Experience:** Smooth chart rendering with auto-refresh functionality
- **Security:** OEE endpoint now properly authenticated and company-scoped

---

## Technical Details

### Why This Happened

1. **Server Error:** The code attempted to call a Flask route function (`oee(mid)`) directly from another route, which returns a Flask Response object, not the data. This can't be used with `.get_json()`.

2. **Canvas Error:** Chart.js maintains ownership of a canvas. Once a chart is instantiated on a canvas, the canvas is "in use". Creating another chart on the same canvas without destroying the first one causes a conflict.

### Why the Fix Works

1. **Server:** Direct database queries for OEE calculation avoid circular function calls and Flask context issues.

2. **Client:** Explicitly destroying the old chart instance before creating a new one releases the canvas, allowing reuse.

---

**Status:** ✅ All issues resolved and tested
**Date:** 2025-02-14
