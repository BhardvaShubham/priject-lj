/* dashboard-enhanced.js
   Enhanced dashboard with live charts integration
   Real-time updates with WebSocket fallback to polling
*/

(function() {
  'use strict';

  let chartInstances = {};
  let updateInterval = null;

  // Initialize all charts with enhanced quality
  async function initCharts() {
    // Load chart data
    const summaryData = await window.IMCSCharts?.fetchChartData('/api/chart-data/summary') || null;
    const alertsData = await window.IMCSCharts?.fetchChartData('/api/chart-data/alerts') || null;
    const machinesData = await window.__sapApp?.fetchJsonLow('/api/machines') || null;

    // Use enhanced charts if available, fallback to regular
    const chartsModule = window.IMCSChartsEnhanced || window.IMCSCharts;

    // Render performance chart (enhanced)
    if (summaryData && chartsModule) {
      if (window.IMCSChartsEnhanced && window.IMCSChartsEnhanced.renderEnhancedPerformanceChart) {
        window.IMCSChartsEnhanced.renderEnhancedPerformanceChart('performanceChart', summaryData);
      } else if (window.IMCSCharts) {
        window.IMCSCharts.renderPerformanceChart('performanceChart', summaryData);
      }
    } else {
      const fallback = document.getElementById('performanceChartFallback');
      if (fallback) fallback.style.display = 'block';
    }

    // Render status chart (enhanced)
    if (summaryData && chartsModule) {
      if (window.IMCSChartsEnhanced && window.IMCSChartsEnhanced.renderEnhancedStatusChart) {
        window.IMCSChartsEnhanced.renderEnhancedStatusChart('statusChart', summaryData);
      } else if (window.IMCSCharts) {
        window.IMCSCharts.renderStatusChart('statusChart', summaryData);
      }
    } else {
      const fallback = document.getElementById('statusChartFallback');
      if (fallback) fallback.style.display = 'block';
    }

    // Render alerts chart (enhanced)
    if (alertsData && chartsModule) {
      if (window.IMCSChartsEnhanced && window.IMCSChartsEnhanced.renderEnhancedAlertsChart) {
        window.IMCSChartsEnhanced.renderEnhancedAlertsChart('alertsChart', alertsData);
      } else if (window.IMCSCharts) {
        window.IMCSCharts.renderAlertsChart('alertsChart', alertsData);
      }
    } else {
      const fallback = document.getElementById('alertsChartFallback');
      if (fallback) fallback.style.display = 'block';
    }

    // Render machine comparison (enhanced)
    if (machinesData && chartsModule) {
      if (window.IMCSChartsEnhanced && window.IMCSChartsEnhanced.renderEnhancedMachineComparison) {
        window.IMCSChartsEnhanced.renderEnhancedMachineComparison('machineComparisonChart', machinesData);
      } else if (window.IMCSCharts) {
        window.IMCSCharts.renderMachineComparison('machineComparisonChart', machinesData);
      }
    }
  }

  // Update charts with fresh data
  async function updateCharts() {
    try {
      const summaryData = await window.IMCSCharts?.fetchChartData('/api/chart-data/summary') || null;
      const alertsData = await window.IMCSCharts?.fetchChartData('/api/chart-data/alerts') || null;

      // Update performance chart if exists
      if (chartInstances.performance && summaryData?.performance_trend) {
        chartInstances.performance.data.labels = summaryData.performance_trend.map(t => t.date);
        chartInstances.performance.data.datasets[0].data = summaryData.performance_trend.map(t => t.efficiency);
        chartInstances.performance.update('none'); // No animation for live updates
      }

      // Update alerts chart if exists
      if (chartInstances.alerts && alertsData?.trend) {
        chartInstances.alerts.data.labels = alertsData.trend.map(t => t.date);
        chartInstances.alerts.data.datasets[0].data = alertsData.trend.map(t => t.critical || 0);
        chartInstances.alerts.data.datasets[1].data = alertsData.trend.map(t => t.warning || 0);
        chartInstances.alerts.data.datasets[2].data = alertsData.trend.map(t => t.info || 0);
        chartInstances.alerts.update('none');
      }
    } catch (e) {
      console.error('Chart update error:', e);
    }
  }

  // Start live updates
  function startLiveUpdates() {
    // Update every 30 seconds
    updateInterval = setInterval(updateCharts, 30000);
    
    // Add live indicator
    const header = document.querySelector('.app-header .hdr-title');
    if (header && !header.querySelector('.live-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'live-indicator';
      indicator.title = 'Live data updates';
      header.insertBefore(indicator, header.firstChild);
    }
  }

  // Stop live updates
  function stopLiveUpdates() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for Chart.js and other modules
    setTimeout(() => {
      initCharts();
      startLiveUpdates();
    }, 500);

    // Cleanup on page unload
    window.addEventListener('beforeunload', stopLiveUpdates);
  });

  // Expose for manual refresh
  window.IMCSDashboard = {
    initCharts,
    updateCharts,
    startLiveUpdates,
    stopLiveUpdates
  };

})();

