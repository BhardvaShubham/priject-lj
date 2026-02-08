/* charts-enhanced.js
   Enterprise-grade chart rendering with professional styling
   High-quality visualizations with animations and interactivity
*/

(function() {
  'use strict';

  // Professional SAP color palette
  const SAP_COLORS = {
    primary: '#0a6ed1',
    primaryLight: '#4a9eff',
    primaryDark: '#0856aa',
    success: '#107e3e',
    successLight: '#5cb85c',
    warning: '#e9730c',
    warningLight: '#ffa500',
    error: '#bb0000',
    errorLight: '#ff4444',
    info: '#0070f2',
    muted: '#9aa6b2',
    accent: '#a37d2a',
    gradient1: 'linear-gradient(135deg, #0a6ed1 0%, #4a9eff 100%)',
    gradient2: 'linear-gradient(135deg, #107e3e 0%, #5cb85c 100%)',
    gradient3: 'linear-gradient(135deg, #e9730c 0%, #ffa500 100%)'
  };

  // Enterprise chart configuration
  const ENTERPRISE_CHART_CONFIG = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            family: 'Tahoma, Arial, sans-serif',
            size: 12,
            weight: '600'
          },
          color: '#003366',
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 51, 102, 0.95)',
        titleFont: {
          family: 'Tahoma, Arial, sans-serif',
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          family: 'Tahoma, Arial, sans-serif',
          size: 12
        },
        padding: 12,
        cornerRadius: 6,
        displayColors: true,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            const y = context.parsed.y;
            label += Number.isFinite(y) ? y.toFixed(2) : '0.00';
            if (context.dataset.unit) label += ' ' + context.dataset.unit;
            return label;
          }
        }
      },
      title: {
        display: true,
        font: {
          family: 'Tahoma, Arial, sans-serif',
          size: 14,
          weight: 'bold'
        },
        color: '#003366',
        padding: {
          top: 10,
          bottom: 15
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          font: {
            family: 'Tahoma',
            size: 11
          },
          color: '#003366',
          padding: 8
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          font: {
            family: 'Tahoma',
            size: 11
          },
          color: '#003366',
          padding: 8
        },
        beginAtZero: true
      }
    }
  };

  // Create gradient for charts
  function createGradient(ctx, colorStart, colorEnd) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
  }

  // Enhanced performance trend chart
  function renderEnhancedPerformanceChart(canvasId, data) {
    if (!window.Chart || !data || !data.performance_trend) return false;

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const trend = data.performance_trend;
    const chartCtx = ctx.getContext('2d');
    const gradient = createGradient(chartCtx, SAP_COLORS.primary + '40', SAP_COLORS.primary + '05');

    new Chart(chartCtx, {
      type: 'line',
      data: {
        labels: trend.map(t => {
          const date = new Date(t.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: 'Efficiency %',
          data: trend.map(t => t.efficiency),
          borderColor: SAP_COLORS.primary,
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: SAP_COLORS.primary,
          pointBorderWidth: 2,
          pointHoverBackgroundColor: SAP_COLORS.primary,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        ...ENTERPRISE_CHART_CONFIG,
        plugins: {
          ...ENTERPRISE_CHART_CONFIG.plugins,
          title: {
            ...ENTERPRISE_CHART_CONFIG.plugins.title,
            text: 'Performance Trend (Last 7 Days)'
          }
        },
        scales: {
          ...ENTERPRISE_CHART_CONFIG.scales,
          y: {
            ...ENTERPRISE_CHART_CONFIG.scales.y,
            min: 0,
            max: 100,
            ticks: {
              ...ENTERPRISE_CHART_CONFIG.scales.y.ticks,
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
    return true;
  }

  // Enhanced status distribution chart
  function renderEnhancedStatusChart(canvasId, data) {
    if (!window.Chart || !data || !data.status_distribution) return false;

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const dist = data.status_distribution;
    const labels = Object.keys(dist);
    const values = Object.values(dist);
    
    const colorMap = {
      'running': { bg: SAP_COLORS.success, border: SAP_COLORS.successDark },
      'idle': { bg: SAP_COLORS.warning, border: SAP_COLORS.warningDark },
      'down': { bg: SAP_COLORS.error, border: SAP_COLORS.errorDark },
      'maintenance': { bg: SAP_COLORS.muted, border: '#6b7280' }
    };

    const colors = labels.map(l => colorMap[l.toLowerCase()]?.bg || SAP_COLORS.muted);
    const borders = labels.map(l => colorMap[l.toLowerCase()]?.border || '#6b7280');

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 3,
          hoverBorderWidth: 5,
          hoverOffset: 8
        }]
      },
      options: {
        ...ENTERPRISE_CHART_CONFIG,
        cutout: '60%',
        plugins: {
          ...ENTERPRISE_CHART_CONFIG.plugins,
          title: {
            ...ENTERPRISE_CHART_CONFIG.plugins.title,
            text: 'Machine Status Distribution'
          },
          legend: {
            ...ENTERPRISE_CHART_CONFIG.plugins.legend,
            position: 'right'
          }
        }
      }
    });
    return true;
  }

  // Enhanced alerts trend chart
  function renderEnhancedAlertsChart(canvasId, data) {
    if (!window.Chart || !data || !data.trend) return false;

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const trend = data.trend;
    const chartCtx = ctx.getContext('2d');

    new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels: trend.map(t => {
          const date = new Date(t.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
          {
            label: 'Critical',
            data: trend.map(t => t.critical || 0),
            backgroundColor: SAP_COLORS.error,
            borderColor: SAP_COLORS.errorDark,
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Warning',
            data: trend.map(t => t.warning || 0),
            backgroundColor: SAP_COLORS.warning,
            borderColor: SAP_COLORS.warningDark,
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Info',
            data: trend.map(t => t.info || 0),
            backgroundColor: SAP_COLORS.info,
            borderColor: '#0051a5',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        ...ENTERPRISE_CHART_CONFIG,
        plugins: {
          ...ENTERPRISE_CHART_CONFIG.plugins,
          title: {
            ...ENTERPRISE_CHART_CONFIG.plugins.title,
            text: 'Alerts Trend (Last 14 Days)'
          }
        },
        scales: {
          ...ENTERPRISE_CHART_CONFIG.scales,
          x: {
            ...ENTERPRISE_CHART_CONFIG.scales.x,
            stacked: true
          },
          y: {
            ...ENTERPRISE_CHART_CONFIG.scales.y,
            stacked: true,
            beginAtZero: true
          }
        }
      }
    });
    return true;
  }

  // Enhanced machine comparison chart
  function renderEnhancedMachineComparison(canvasId, machines) {
    if (!window.Chart || !machines || machines.length === 0) return false;

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const sorted = machines
      .filter(m => m.efficiency != null)
      .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
      .slice(0, 10);

    const chartCtx = ctx.getContext('2d');
    const colors = sorted.map(m => {
      const eff = m.efficiency || 0;
      if (eff >= 85) return SAP_COLORS.success;
      if (eff >= 60) return SAP_COLORS.warning;
      return SAP_COLORS.error;
    });

    new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels: sorted.map(m => m.name),
        datasets: [{
          label: 'Efficiency %',
          data: sorted.map(m => m.efficiency || 0),
          backgroundColor: colors,
          borderColor: '#A0A0A0',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        ...ENTERPRISE_CHART_CONFIG,
        indexAxis: 'y',
        plugins: {
          ...ENTERPRISE_CHART_CONFIG.plugins,
          title: {
            ...ENTERPRISE_CHART_CONFIG.plugins.title,
            text: 'Top 10 Machines by Efficiency'
          },
          legend: {
            display: false
          }
        },
        scales: {
          ...ENTERPRISE_CHART_CONFIG.scales,
          x: {
            ...ENTERPRISE_CHART_CONFIG.scales.x,
            min: 0,
            max: 100,
            ticks: {
              ...ENTERPRISE_CHART_CONFIG.scales.x.ticks,
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
    return true;
  }

  // OEE Gauge Chart (using Chart.js)
  function renderOEEGauge(canvasId, oeeValue) {
    if (!window.Chart) return false;

    const ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    const safeOEE = Number.isFinite(oeeValue) ? oeeValue : 0;
    const oee = Math.max(0, Math.min(100, safeOEE));
    const color = oee >= 85 ? SAP_COLORS.success : oee >= 60 ? SAP_COLORS.warning : SAP_COLORS.error;

    // Create gauge using doughnut chart
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [oee, 100 - oee],
          backgroundColor: [color, '#e0e0e0'],
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          title: {
            display: true,
            text: `OEE: ${oee.toFixed(1)}%`,
            font: { size: 16, weight: 'bold' },
            color: '#003366',
            position: 'bottom'
          }
        }
      },
      plugins: [{
        id: 'gaugeText',
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
          const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
          
          ctx.save();
          ctx.font = 'bold 32px Tahoma';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${oee.toFixed(1)}%`, centerX, centerY - 10);
          
          ctx.font = '14px Tahoma';
          ctx.fillStyle = '#003366';
          ctx.fillText('OEE', centerX, centerY + 20);
          ctx.restore();
        }
      }]
    });
    return true;
  }

  // Public API
  window.IMCSChartsEnhanced = {
    renderEnhancedPerformanceChart,
    renderEnhancedStatusChart,
    renderEnhancedAlertsChart,
    renderEnhancedMachineComparison,
    renderOEEGauge,
    SAP_COLORS,
    ENTERPRISE_CHART_CONFIG
  };

})();

