/**
 * VIZ MANAGER - Universal Visualization System (FIXED)
 * Manages real-time chart updates across all pages
 * Event-driven architecture for synchronized data visualization
 */

(function() {
  'use strict';

  // ===== VISUALIZATION EVENT SYSTEM =====
  const vizEvents = {
    // Core events
    DATA_GENERATED: 'viz:data-generated',
    DATA_CLEARED: 'viz:data-cleared',
    DATA_UPDATED: 'viz:data-updated',

    // Chart events
    CHARTS_REFRESH: 'viz:charts-refresh',
    CHARTS_CLEAR: 'viz:charts-clear',

    // Machine events
    MACHINE_STATUS_CHANGED: 'viz:machine-status-changed',
    ALERT_TRIGGERED: 'viz:alert-triggered',
    MAINTENANCE_UPDATED: 'viz:maintenance-updated'
  };

  // Global visualization state
  const vizState = {
    isDataLoaded: false,
    dataCount: 0,
    lastUpdate: null,
    chartCache: {},
    dataSourceKey: null,
    isUpdating: false
  };

  // Chart element mappings
  const chartMappings = {
    'performanceChart': { fallback: 'performanceChartFallback', url: '/chart/summary.png' },
    'statusChart': { fallback: 'statusChartFallback', url: '/chart/status.png' },
    'alertsChart': { fallback: 'alertsChartFallback', url: '/chart/alerts-trend.png' }
  };

  // ===== EVENT DISPATCHER =====
  function dispatchVizEvent(eventName, data = {}) {
    const event = new CustomEvent(eventName, {
      detail: {
        timestamp: new Date().toISOString(),
        state: { ...vizState },
        ...data
      },
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(event);
    console.log(`[VIZ] Event: ${eventName}`, event.detail);
  }

  // ===== VISUALIZATION UPDATER =====
  const vizUpdater = {
    // Update all charts on page - with proper fallback handling
    refreshAllCharts: function() {
      if (vizState.isUpdating) {
        console.log('[VIZ] Update already in progress, skipping...');
        return;
      }

      vizState.isUpdating = true;
      const timestamp = Date.now();
      let updateCount = 0;

      // Update fallback images
      Object.keys(chartMappings).forEach((canvasId, index) => {
        const mapping = chartMappings[canvasId];
        const fallbackId = mapping.fallback;
        const fallbackUrl = mapping.url;

        setTimeout(() => {
          this.updateChartFallback(fallbackId, fallbackUrl, timestamp);
          updateCount++;
        }, index * 150); // Stagger updates
      });

      // Update canvas-based charts if they exist
      const canvasElements = document.querySelectorAll('canvas[data-tracked="true"]');
      canvasElements.forEach((canvas, index) => {
        setTimeout(() => {
          if (canvas.chart && typeof canvas.chart.update === 'function') {
            canvas.chart.update('none');
            console.log(`[VIZ] Updated canvas chart: ${canvas.id}`);
            updateCount++;
          }
        }, (Object.keys(chartMappings).length + index) * 150);
      });

      // Set updating flag to false after all updates
      setTimeout(() => {
        vizState.isUpdating = false;
        console.log(`[VIZ] Refreshed ${updateCount} charts`);
        dispatchVizEvent(vizEvents.CHARTS_REFRESH, { updateCount });
      }, (Object.keys(chartMappings).length + canvasElements.length) * 150 + 100);
    },

    // Update fallback image chart
    updateChartFallback: function(elementId, baseUrl, timestamp) {
      const element = document.getElementById(elementId);
      if (!element) {
        console.warn(`[VIZ] Fallback chart element not found: ${elementId}`);
        return;
      }

      const newUrl = `${baseUrl}?t=${timestamp}`;

      // Fade out
      element.style.transition = 'opacity 0.2s ease';
      element.style.opacity = '0.5';

      // Update image
      element.src = newUrl;

      element.onload = () => {
        // Fade in
        element.style.opacity = '1';
        element.style.transition = 'opacity 0.3s ease';

        vizState.chartCache[elementId] = {
          url: newUrl,
          timestamp: timestamp
        };

        console.log(`[VIZ] Updated fallback chart: ${elementId}`);
      };

      element.onerror = () => {
        element.style.opacity = '0.8';
        console.warn(`[VIZ] Failed to load fallback chart: ${elementId}`);
      };
    },

    // Update specific chart
    updateChart: function(element, chartType, machineId = null) {
      if (!vizState.isDataLoaded) {
        console.log('[VIZ] No data loaded, skipping chart update');
        return;
      }

      const timestamp = Date.now();
      let chartUrl = `/chart/${chartType}.png?t=${timestamp}`;

      if (machineId) {
        chartUrl = `/chart/machine/${machineId}.png?t=${timestamp}`;
      }

      element.style.opacity = '0.6';
      element.style.transition = 'opacity 0.3s ease';
      element.src = chartUrl;

      element.onload = () => {
        element.style.opacity = '1';
        vizState.chartCache[element.id] = {
          url: chartUrl,
          timestamp: timestamp
        };
      };

      element.onerror = () => {
        element.style.opacity = '1';
        console.warn(`[VIZ] Failed to load chart: ${chartType}`);
      };
    },

    // Clear all visualizations properly
    clearAllCharts: function() {
      console.log('[VIZ] Clearing all charts...');

      // Clear fallback images
      Object.keys(chartMappings).forEach(canvasId => {
        const mapping = chartMappings[canvasId];
        const fallbackId = mapping.fallback;
        const fallbackElement = document.getElementById(fallbackId);

        if (fallbackElement) {
          fallbackElement.style.opacity = '0.3';
          // Create a simple "no data" placeholder
          fallbackElement.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23f5f5f5%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3ENo Data%3C/text%3E%3C/svg%3E';
          console.log(`[VIZ] Cleared fallback chart: ${fallbackId}`);
        }
      });

      // Clear canvas charts
      const canvasElements = document.querySelectorAll('canvas[data-tracked="true"]');
      canvasElements.forEach(canvas => {
        if (canvas.chart && typeof canvas.chart.destroy === 'function') {
          canvas.chart.destroy();
          canvas.chart = null;
          console.log(`[VIZ] Destroyed canvas chart: ${canvas.id}`);
        }
      });

      vizState.chartCache = {};
      console.log('[VIZ] All charts cleared');
    },

    // Batch update with progress
    batchUpdateCharts: function(count = 3) {
      console.log(`[VIZ] Starting batch update of ${count} charts...`);
      this.refreshAllCharts();
    }
  };

  // ===== DATA LOADER =====
  const dataLoader = {
    // Check if data exists
    async checkDataExists() {
      try {
        const response = await fetch('/api/summary', { cache: 'no-store' });
        if (!response.ok) throw new Error('API error');

        const data = await response.json();

        const hasData = data && (
          (data.total_machines && data.total_machines > 0) ||
          (data.total_sensors && data.total_sensors > 0) ||
          (data.total_readings && data.total_readings > 0)
        );

        vizState.isDataLoaded = hasData;
        vizState.dataCount = data.total_readings || 0;
        vizState.lastUpdate = new Date().toISOString();

        console.log('[VIZ] Data check:', {
          hasData,
          machines: data.total_machines,
          readings: data.total_readings
        });

        return hasData;
      } catch (e) {
        console.warn('[VIZ] Failed to check data:', e);
        vizState.isDataLoaded = false;
        return false;
      }
    },

    // Load and display data stats
    async loadDataStats() {
      try {
        const response = await fetch('/api/summary', { cache: 'no-store' });
        if (!response.ok) throw new Error('API error');

        const data = await response.json();

        return {
          machines: data.total_machines || 0,
          sensors: data.total_sensors || 0,
          readings: data.total_readings || 0,
          alerts: data.total_alerts || 0
        };
      } catch (e) {
        console.warn('[VIZ] Failed to load stats:', e);
        return null;
      }
    }
  };

  // ===== DEMO DATA HANDLER =====
  const demoHandler = {
    // Generate demo data with visualization
    async generateDemoData(options = {}) {
      const { machines = 5, days = 7 } = options;

      try {
        // Show loading indicator
        this.showLoadingIndicator();

        const response = await fetch('/api/demo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ num_machines: machines, days_of_data: days })
        });

        const result = await response.json();

        if (result.success) {
          console.log('[VIZ] Demo data generated:', result);

          // Wait for server to finish generating charts
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Update visualization state
          vizState.isDataLoaded = true;
          vizState.dataCount = result.records_created || 0;
          vizState.lastUpdate = new Date().toISOString();

          // Dispatch event
          dispatchVizEvent(vizEvents.DATA_GENERATED, {
            machines: machines,
            days: days,
            recordsCreated: result.records_created
          });

          // Refresh all charts
          setTimeout(() => {
            vizUpdater.refreshAllCharts();
            this.hideLoadingIndicator();
            this.showSuccessMessage(`✓ Generated ${result.records_created} data points`);
          }, 500);

          return true;
        } else {
          this.showErrorMessage(result.error || 'Failed to generate demo data');
          return false;
        }
      } catch (e) {
        console.error('[VIZ] Demo generation error:', e);
        this.showErrorMessage('Error generating demo data: ' + e.message);
        return false;
      } finally {
        this.hideLoadingIndicator();
      }
    },

    // Clear demo data
    async clearDemoData() {
      if (!confirm('Clear all demo data? This cannot be undone.')) return false;

      try {
        this.showLoadingIndicator();

        const response = await fetch('/api/demo/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
          console.log('[VIZ] Demo data cleared:', result);

          // Update visualization state
          vizState.isDataLoaded = false;
          vizState.dataCount = 0;
          vizState.chartCache = {};
          vizState.lastUpdate = new Date().toISOString();

          // Dispatch event
          dispatchVizEvent(vizEvents.DATA_CLEARED, {
            deletedCount: result.deleted_count || 0
          });

          // Clear all visualizations
          vizUpdater.clearAllCharts();
          this.hideLoadingIndicator();
          this.showSuccessMessage('✓ All data cleared');

          return true;
        } else {
          this.showErrorMessage(result.error || 'Failed to clear demo data');
          return false;
        }
      } catch (e) {
        console.error('[VIZ] Clear error:', e);
        this.showErrorMessage('Error clearing data: ' + e.message);
        return false;
      } finally {
        this.hideLoadingIndicator();
      }
    },

    // UI helpers
    showLoadingIndicator: function() {
      let loader = document.getElementById('vizLoadingIndicator');
      if (!loader) {
        loader = document.createElement('div');
        loader.id = 'vizLoadingIndicator';
        loader.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 30px 50px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(loader);
      }
      loader.innerHTML = '⏳ Processing... Please wait';
      loader.style.display = 'block';
    },

    hideLoadingIndicator: function() {
      const loader = document.getElementById('vizLoadingIndicator');
      if (loader) loader.style.display = 'none';
    },

    showSuccessMessage: function(msg) {
      this.showToast(msg, 'success');
    },

    showErrorMessage: function(msg) {
      this.showToast(msg, 'error');
    },

    showToast: function(msg, type = 'info') {
      let toast = document.getElementById('vizToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'vizToast';
        document.body.appendChild(toast);
      }

      const bgColor = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3'
      }[type];

      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        z-index: 10001;
        font-size: 14px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;
      toast.textContent = msg;

      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => (toast.style.display = 'none'), 300);
      }, 3000);
    }
  };

  // ===== EVENT LISTENERS =====
  function attachEventListeners() {
    console.log('[VIZ] Attaching event listeners...');

    // Demo Data Buttons
    const generateBtn = document.getElementById('generateDemoBtn');
    const clearBtn = document.getElementById('clearDemoBtn');
    const demoDataBtn = document.getElementById('demoDataBtn');

    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        console.log('[VIZ] Generate demo button clicked');
        demoHandler.generateDemoData({ machines: 5, days: 7 });
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        console.log('[VIZ] Clear demo button clicked');
        demoHandler.clearDemoData();
      });
    }

    if (demoDataBtn) {
      demoDataBtn.addEventListener('click', () => {
        const panel = document.getElementById('datasetManagerPanel');
        if (panel) {
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[VIZ] Refresh button clicked');
        if (vizState.isDataLoaded) {
          vizUpdater.refreshAllCharts();
        } else {
          demoHandler.showToast('No data to visualize. Generate demo data first.', 'info');
        }
      });
    }

    // Listen for visualization events
    window.addEventListener(vizEvents.DATA_GENERATED, (e) => {
      console.log('[VIZ] Data generated event received:', e.detail);
    });

    window.addEventListener(vizEvents.DATA_CLEARED, (e) => {
      console.log('[VIZ] Data cleared event received:', e.detail);
    });

    window.addEventListener(vizEvents.CHARTS_REFRESH, (e) => {
      console.log('[VIZ] Charts refresh event:', e.detail);
    });
  }

  // ===== INITIALIZATION =====
  async function init() {
    console.log('[VIZ] Initializing Visualization Manager');

    // Check initial data state
    const hasData = await dataLoader.checkDataExists();
    console.log('[VIZ] Initial data check:', hasData ? 'Data found' : 'No data');

    // Attach event listeners
    attachEventListeners();

    // If data exists, prepare for visualization
    if (hasData) {
      console.log('[VIZ] Data found, preparing visualizations');
      setTimeout(() => {
        vizUpdater.refreshAllCharts();
      }, 800);
    } else {
      console.log('[VIZ] No data, clearing visualizations');
      vizUpdater.clearAllCharts();
    }

    // Setup periodic check every 60 seconds
    setInterval(async () => {
      const hasData = await dataLoader.checkDataExists();
      console.log('[VIZ] Periodic data check:', hasData ? 'Data exists' : 'No data');
    }, 60000);
  }

  // ===== PUBLIC API =====
  window.VizManager = {
    // Methods
    refreshCharts: () => {
      console.log('[VIZ] Public API: refreshCharts called');
      vizUpdater.refreshAllCharts();
    },
    clearCharts: () => {
      console.log('[VIZ] Public API: clearCharts called');
      vizUpdater.clearAllCharts();
    },
    generateDemo: (opts) => {
      console.log('[VIZ] Public API: generateDemo called with', opts);
      return demoHandler.generateDemoData(opts);
    },
    clearDemo: () => {
      console.log('[VIZ] Public API: clearDemo called');
      return demoHandler.clearDemoData();
    },
    updateChart: (elem, type, id) => {
      console.log('[VIZ] Public API: updateChart called');
      vizUpdater.updateChart(elem, type, id);
    },

    // State
    getState: () => ({ ...vizState }),
    isLoaded: () => vizState.isDataLoaded,
    getDataCount: () => vizState.dataCount,

    // Events
    on: (eventName, callback) => window.addEventListener(eventName, callback),
    off: (eventName, callback) => window.removeEventListener(eventName, callback),
    emit: dispatchVizEvent,

    // Data
    checkData: () => dataLoader.checkDataExists(),
    loadStats: () => dataLoader.loadDataStats()
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[VIZ] Visualization Manager loaded and ready');
})();

// ===== CSS ANIMATIONS =====
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  [data-chart-type] {
    transition: opacity 0.3s ease;
  }

  .chart-image {
    transition: opacity 0.3s ease;
  }
`;
document.head.appendChild(style);
