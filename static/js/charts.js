/* charts.js
   Offline-first client-side chart rendering using Chart.js
   Falls back to server-side PNG charts when offline or Chart.js unavailable
*/

(function() {
  'use strict';

  const CHART_CACHE_KEY = 'imcs_chart_data';
  const CHART_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Chart.js configuration with SAP styling
  const SAP_CHART_CONFIG = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { family: 'Tahoma, Arial, sans-serif', size: 11 },
          color: '#003366'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 51, 102, 0.9)',
        titleFont: { family: 'Tahoma, Arial, sans-serif', size: 12 },
        bodyFont: { family: 'Tahoma, Arial, sans-serif', size: 11 },
        padding: 8,
        cornerRadius: 4
      }
    },
    scales: {
      x: {
        grid: { color: '#D5D5D5', lineWidth: 1 },
        ticks: { font: { family: 'Tahoma', size: 10 }, color: '#003366' }
      },
      y: {
        grid: { color: '#D5D5D5', lineWidth: 1 },
        ticks: { font: { family: 'Tahoma', size: 10 }, color: '#003366' }
      }
    }
  };

  const SAP_COLORS = {
    primary: '#0a6ed1',
    success: '#107e3e',
    warning: '#e9730c',
    error: '#bb0000',
    muted: '#9aa6b2',
    accent: '#a37d2a'
  };

  // Cache helpers
  function cacheChartData(key, data) {
    try {
      const item = { ts: Date.now(), data: data };
      localStorage.setItem(`${CHART_CACHE_KEY}_${key}`, JSON.stringify(item));
    } catch (e) {}
  }

  function getCachedChartData(key) {
    try {
      const raw = localStorage.getItem(`${CHART_CACHE_KEY}_${key}`);
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (Date.now() - item.ts > CHART_CACHE_TTL) return null;
      return item.data;
    } catch (e) {
      return null;
    }
  }

  // Fetch with offline fallback
  async function fetchChartData(url) {
    const cacheKey = url.replace(/[^a-zA-Z0-9]/g, '_');
    const cached = getCachedChartData(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      cacheChartData(cacheKey, data);
      return data;
    } catch (e) {
      return cached || null;
    }
  }

  // Check if Chart.js is available
  function hasChartJS() {
    return typeof Chart !== 'undefined' && Chart.Chart;
  }

  // Render performance trend chart
  function renderPerformanceChart(canvasId, data) {
    if (!hasChartJS() || !data || !data.performance_trend) {
      return false;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const trend = data.performance_trend;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.map(t => t.date),
        datasets: [{
          label: 'Efficiency %',
          data: trend.map(t => t.efficiency),
          borderColor: SAP_COLORS.primary,
          backgroundColor: SAP_COLORS.primary + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        ...SAP_CHART_CONFIG,
        plugins: {
          ...SAP_CHART_CONFIG.plugins,
          title: {
            display: true,
            text: 'Performance Trend (Last 7 Days)',
            font: { family: 'Tahoma', size: 13, weight: 'bold' },
            color: '#003366'
          }
        },
        scales: {
          ...SAP_CHART_CONFIG.scales,
          y: {
            ...SAP_CHART_CONFIG.scales.y,
            min: 0,
            max: 100
          }
        }
      }
    });
    return true;
  }

  // Render status distribution pie chart
  function renderStatusChart(canvasId, data) {
    if (!hasChartJS() || !data || !data.status_distribution) {
      return false;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const dist = data.status_distribution;
    const labels = Object.keys(dist);
    const values = Object.values(dist);
    const colors = labels.map(l => {
      if (l === 'running') return SAP_COLORS.success;
      if (l === 'idle') return SAP_COLORS.warning;
      if (l === 'down') return SAP_COLORS.error;
      return SAP_COLORS.muted;
    });

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#EFEFEF'
        }]
      },
      options: {
        ...SAP_CHART_CONFIG,
        plugins: {
          ...SAP_CHART_CONFIG.plugins,
          title: {
            display: true,
            text: 'Machine Status Distribution',
            font: { family: 'Tahoma', size: 13, weight: 'bold' },
            color: '#003366'
          }
        }
      }
    });
    return true;
  }

  // Render alerts trend chart
  function renderAlertsChart(canvasId, data) {
    if (!hasChartJS() || !data || !data.trend) {
      return false;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const trend = data.trend;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: trend.map(t => t.date),
        datasets: [
          {
            label: 'Critical',
            data: trend.map(t => t.critical || 0),
            backgroundColor: SAP_COLORS.error,
            borderColor: SAP_COLORS.error,
            borderWidth: 1
          },
          {
            label: 'Warning',
            data: trend.map(t => t.warning || 0),
            backgroundColor: SAP_COLORS.warning,
            borderColor: SAP_COLORS.warning,
            borderWidth: 1
          },
          {
            label: 'Info',
            data: trend.map(t => t.info || 0),
            backgroundColor: SAP_COLORS.muted,
            borderColor: SAP_COLORS.muted,
            borderWidth: 1
          }
        ]
      },
      options: {
        ...SAP_CHART_CONFIG,
        plugins: {
          ...SAP_CHART_CONFIG.plugins,
          title: {
            display: true,
            text: 'Alerts Trend (Last 14 Days)',
            font: { family: 'Tahoma', size: 13, weight: 'bold' },
            color: '#003366'
          }
        },
        scales: {
          ...SAP_CHART_CONFIG.scales,
          x: {
            ...SAP_CHART_CONFIG.scales.x,
            stacked: true
          },
          y: {
            ...SAP_CHART_CONFIG.scales.y,
            stacked: true,
            beginAtZero: true
          }
        }
      }
    });
    return true;
  }

  // Render machine comparison chart
  function renderMachineComparison(canvasId, machines) {
    if (!hasChartJS() || !machines || machines.length === 0) {
      return false;
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    // Sort by efficiency and take top 10
    const sorted = machines
      .filter(m => m.efficiency != null)
      .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
      .slice(0, 10);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(m => m.name),
        datasets: [{
          label: 'Efficiency %',
          data: sorted.map(m => m.efficiency || 0),
          backgroundColor: sorted.map(m => {
            const eff = m.efficiency || 0;
            if (eff >= 85) return SAP_COLORS.success;
            if (eff >= 60) return SAP_COLORS.warning;
            return SAP_COLORS.error;
          }),
          borderColor: '#A0A0A0',
          borderWidth: 1
        }]
      },
      options: {
        ...SAP_CHART_CONFIG,
        indexAxis: 'y',
        plugins: {
          ...SAP_CHART_CONFIG.plugins,
          title: {
            display: true,
            text: 'Top 10 Machines by Efficiency',
            font: { family: 'Tahoma', size: 13, weight: 'bold' },
            color: '#003366'
          },
          legend: { display: false }
        },
        scales: {
          ...SAP_CHART_CONFIG.scales,
          x: {
            ...SAP_CHART_CONFIG.scales.x,
            min: 0,
            max: 100
          }
        }
      }
    });
    return true;
  }

  // Public API
  window.IMCSCharts = {
    renderPerformanceChart,
    renderStatusChart,
    renderAlertsChart,
    renderMachineComparison,
    fetchChartData,
    hasChartJS
  };

})();

