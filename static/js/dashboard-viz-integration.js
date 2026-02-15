/**
 * DASHBOARD VIZ INTEGRATION (FIXED)
 * Connects dashboard charts to the global visualization system
 * Automatically registers and syncs charts with VizManager
 */

(function() {
  'use strict';

  // Wait for all systems to load
  async function init() {
    if (!window.VizManager || !window.ChartSync) {
      console.log('[DASHBOARD-VIZ] Systems not ready, waiting...');
      setTimeout(init, 200);
      return;
    }

    console.log('[DASHBOARD-VIZ] Initializing dashboard visualization integration');

    // Register fallback image charts
    const fallbackCharts = [
      { id: 'performanceChartFallback', type: 'performance' },
      { id: 'statusChartFallback', type: 'status' },
      { id: 'alertsChartFallback', type: 'alerts' }
    ];

    fallbackCharts.forEach(chart => {
      ChartSync.registerImage(chart.id, chart.type);
    });

    // Initial data check and visualization
    console.log('[DASHBOARD-VIZ] Performing initial data check...');
    const hasData = await VizManager.checkData();

    if (hasData) {
      console.log('[DASHBOARD-VIZ] Data found, loading visualizations');
      setTimeout(() => {
        VizManager.refreshCharts();
      }, 1000);
    } else {
      console.log('[DASHBOARD-VIZ] No data, showing empty state');
      VizManager.clearCharts();
    }

    // Setup refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[DASHBOARD-VIZ] Manual refresh triggered');
        if (VizManager.isLoaded()) {
          VizManager.refreshCharts();
        } else {
          console.log('[DASHBOARD-VIZ] No data loaded, showing empty state');
        }
      });
    }

    // Listen for data changes
    window.addEventListener('viz:data-generated', () => {
      console.log('[DASHBOARD-VIZ] Data generated event received');
    });

    window.addEventListener('viz:data-cleared', () => {
      console.log('[DASHBOARD-VIZ] Data cleared event received');
    });

    console.log('[DASHBOARD-VIZ] Integration complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[DASHBOARD-VIZ] Module loaded');
})();
