/* dashboard-main.js â€” Single unified dashboard controller
   Replaces dashboard.js, dashboard-enhanced.js, dashboard-viz-integration.js
   All charts use maintainAspectRatio:false so they fill their containers.
*/
(function () {
    'use strict';

    /* â”€â”€ helpers â”€â”€ */
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function el(id) { return document.getElementById(id); }
    function setText(id, v) { const e = el(id); if (e) e.textContent = v; }

    /* â”€â”€ chart registry â€” destroy before recreate â”€â”€ */
    const charts = {};
    function destroyChart(key) {
        if (charts[key]) { try { charts[key].destroy(); } catch (_) { } charts[key] = null; }
    }
    function makeChart(key, canvasId, config) {
        destroyChart(key);
        const canvas = el(canvasId);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        charts[key] = new Chart(ctx, config);
        return charts[key];
    }

    /* â”€â”€ SAP 90s colour palette â”€â”€ */
    const COLORS = {
        running: '#107e3e',
        idle: '#0a6ed1',
        maintenance: '#e9730c',
        offline: '#bb0000',
        blue: '#0a6ed1',
        blueAlpha: 'rgba(10,110,209,0.15)',
        critical: '#bb0000',
        warning: '#e9730c',
        info: '#0a6ed1',
        grid: 'rgba(0,0,0,0.07)',
        white: '#ffffff'
    };

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       KPI SECTION
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function loadKPIs() {
        try {
            const [widgetsRes, summaryRes] = await Promise.all([
                fetch('/api/dashboard/widgets'),
                fetch('/api/summary')
            ]);
            const widgets = widgetsRes.ok ? await widgetsRes.json() : null;
            const summary = summaryRes.ok ? await summaryRes.json() : null;

            if (widgets && widgets.overview) {
                const ov = widgets.overview;
                setText('k_total', ov.total_machines ?? 'â€”');
                setText('k_running', `Running: ${ov.running_machines ?? 'â€”'}`);
                setText('k_eff', (ov.avg_efficiency != null ? ov.avg_efficiency + '%' : 'â€”%'));
                setText('k_uptime', `Uptime: ${ov.uptime_percentage ?? 'â€”'}%`);
                setText('k_alerts', ov.active_alerts ?? 'â€”');
                setText('k_maintenance', `Pending: ${ov.pending_maintenance ?? 'â€”'}`);
                const pct = ov.uptime_percentage ?? 0;
                setText('k_health', pct + '%');
                setText('k_health_status', pct >= 90 ? 'Excellent' : pct >= 70 ? 'Good' : 'Warning');

                // sidebar badges
                const ba = el('badge-alerts');
                const bm = el('badge-maintenance');
                if (ba) { ba.textContent = ov.active_alerts || 0; ba.style.display = ov.active_alerts > 0 ? '' : 'none'; }
                if (bm) { bm.textContent = ov.pending_maintenance || 0; bm.style.display = ov.pending_maintenance > 0 ? '' : 'none'; }

                // location breakdown
                if (widgets.location_breakdown) loadLocationBreakdown(widgets.location_breakdown);
            } else if (summary) {
                setText('k_total', summary.total_machines ?? 'â€”');
                setText('k_eff', (summary.avg_efficiency != null ? summary.avg_efficiency + '%' : 'â€”%'));
                setText('k_alerts', summary.active_alerts ?? 'â€”');
            }
        } catch (e) {
            console.error('[DASH] KPI load error:', e);
        }
    }

    function loadLocationBreakdown(locations) {
        const div = el('locationBreakdown');
        if (!div) return;
        if (!locations || locations.length === 0) {
            div.innerHTML = '<div class="muted small">No location data available</div>';
            return;
        }
        div.innerHTML = locations.map(loc => `
      <div class="location-card">
        <div class="location-name">${esc(loc.location)}</div>
        <div class="location-stats">
          <span>Machines: <strong>${loc.machine_count}</strong></span><br>
          <span>Avg Efficiency: <strong>${loc.avg_efficiency}%</strong></span>
        </div>
      </div>`).join('');
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       MACHINE STATUS BREAKDOWN
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function loadMachineStatus(machines) {
        try {
            const list = machines || await fetch('/api/machines').then(r => r.ok ? r.json() : []);
            if (!Array.isArray(list)) return;
            const counts = { running: 0, idle: 0, maintenance: 0, offline: 0 };
            list.forEach(m => {
                const s = (m.status || 'offline').toLowerCase();
                if (s.includes('run')) counts.running++;
                else if (s.includes('idle')) counts.idle++;
                else if (s.includes('maint')) counts.maintenance++;
                else counts.offline++;
            });
            const total = list.length || 1;
            ['running', 'idle', 'maintenance', 'offline'].forEach(k => {
                setText('status_' + k, counts[k]);
                setText('status_' + k + '_pct', Math.round((counts[k] / total) * 100) + '%');
            });
        } catch (e) { console.error('[DASH] status breakdown error:', e); }
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       MACHINES TABLE
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function loadMachinesTable() {
        try {
            const machines = await fetch('/api/machines').then(r => r.ok ? r.json() : []);
            if (!Array.isArray(machines)) return;

            // populate table
            const tbody = document.querySelector('#machinesTable tbody');
            if (tbody) {
                if (machines.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="muted small" style="text-align:center;padding:20px;">No machines registered</td></tr>';
                } else {
                    tbody.innerHTML = machines.map(m => {
                        const eff = m.efficiency != null ? m.efficiency : 'â€”';
                        const statusClass = (m.status || 'offline').toLowerCase().includes('run') ? 'running'
                            : (m.status || '').toLowerCase().includes('idle') ? 'idle'
                                : (m.status || '').toLowerCase().includes('maint') ? 'maintenance' : 'down';
                        return `<tr>
              <td><a href="/machine/${m.id}">${esc(m.name)}</a></td>
              <td>${esc(m.type)}</td>
              <td>${esc(m.location)}</td>
              <td><span class="status-badge ${statusClass}">${esc(m.status || 'â€”')}</span></td>
              <td>${eff}${eff !== 'â€”' ? '%' : ''}</td>
              <td><a href="/machine/${m.id}" class="btn" style="padding:2px 8px;font-size:11px;">View</a></td>
            </tr>`;
                    }).join('');
                }
            }

            // wire search
            const search = el('searchInput');
            if (search) {
                search.addEventListener('input', () => {
                    const q = search.value.toLowerCase();
                    document.querySelectorAll('#machinesTable tbody tr').forEach(row => {
                        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
                    });
                });
            }

            // also update status breakdown and machine comparison chart
            loadMachineStatus(machines);
            createMachineComparisonChart(machines);
            createPerformanceMatrixChart(machines);
        } catch (e) { console.error('[DASH] machines table error:', e); }
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       PERFORMANCE TREND CHART (7 days)
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function createPerformanceTrendChart() {
        let labels = [], data = [];
        try {
            const res = await fetch('/api/chart-data/summary');
            const json = res.ok ? await res.json() : null;
            if (json && Array.isArray(json.performance_trend) && json.performance_trend.length > 0) {
                labels = json.performance_trend.map(p => p.date);
                data = json.performance_trend.map(p => p.efficiency);
            }
        } catch (_) { }

        // fallback: simulated 7-day data
        if (labels.length === 0) {
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today); d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            }
            let v = 75;
            for (let i = 0; i < 7; i++) { v += (Math.random() - 0.5) * 10; data.push(+Math.max(50, Math.min(100, v)).toFixed(1)); }
        }

        // Cache for chart-type switcher
        _dashChartData.perf = { labels, data };

        makeChart('perf', 'performanceChart', {
            type: 'line',

            data: {
                labels,
                datasets: [{
                    label: 'Efficiency %',
                    data,
                    borderColor: COLORS.blue,
                    backgroundColor: COLORS.blueAlpha,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: COLORS.blue,
                    pointBorderColor: COLORS.white,
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 12, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                    tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.85)', padding: 10 }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                    y: { min: 0, max: 100, ticks: { stepSize: 20, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, grid: { color: COLORS.grid } }
                }
            }
        });
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       STATUS DISTRIBUTION CHART (doughnut)
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function createStatusDistributionChart() {
        try {
            const machines = await fetch('/api/machines').then(r => r.ok ? r.json() : []);
            if (!Array.isArray(machines) || machines.length === 0) {
                showChartFallback('statusChart', 'statusChartFallback'); return;
            }
            const counts = { running: 0, idle: 0, maintenance: 0, offline: 0 };
            machines.forEach(m => {
                const s = (m.status || 'offline').toLowerCase();
                if (s.includes('run')) counts.running++;
                else if (s.includes('idle')) counts.idle++;
                else if (s.includes('maint')) counts.maintenance++;
                else counts.offline++;
            });

            makeChart('status', 'statusChart', {
                type: 'doughnut',
                data: {
                    labels: ['Running', 'Idle', 'Maintenance', 'Offline'],
                    datasets: [{
                        data: [counts.running, counts.idle, counts.maintenance, counts.offline],
                        backgroundColor: [COLORS.running, COLORS.idle, COLORS.maintenance, COLORS.offline],
                        borderColor: COLORS.white,
                        borderWidth: 2,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, padding: 14, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.85)', padding: 10,
                            callbacks: {
                                label: ctx => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    return `${ctx.label}: ${ctx.parsed} (${((ctx.parsed / total) * 100).toFixed(1)}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('[DASH] status chart error:', e);
            showChartFallback('statusChart', 'statusChartFallback');
        }
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       ALERTS TREND CHART (14 days)
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function createAlertsTrendChart() {
        let labels = [], critical = [], warning = [], info = [];
        try {
            const res = await fetch('/api/chart-data/alerts?days=14');
            const json = res.ok ? await res.json() : null;
            if (json && Array.isArray(json.trend) && json.trend.length > 0) {
                json.trend.forEach(row => {
                    labels.push(row.date);
                    critical.push(row.critical || 0);
                    warning.push(row.warning || 0);
                    info.push(row.info || 0);
                });
            }
        } catch (_) { }

        if (labels.length === 0) {
            // fallback: last 14 days empty
            const today = new Date();
            for (let i = 13; i >= 0; i--) {
                const d = new Date(today); d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                critical.push(0); warning.push(0); info.push(0);
            }
        }

        makeChart('alerts', 'alertsChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Critical', data: critical, backgroundColor: COLORS.critical, stack: 'alerts' },
                    { label: 'Warning', data: warning, backgroundColor: COLORS.warning, stack: 'alerts' },
                    { label: 'Info', data: info, backgroundColor: COLORS.info, stack: 'alerts' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 12, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                    tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.85)', padding: 10 }
                },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Tahoma, Arial, sans-serif', size: 10 } } },
                    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, grid: { color: COLORS.grid } }
                }
            }
        });
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       MACHINE COMPARISON CHART (top 8 by efficiency)
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    function createMachineComparisonChart(machines) {
        if (!machines || machines.length === 0) return;
        const sorted = machines
            .filter(m => m.efficiency != null)
            .sort((a, b) => b.efficiency - a.efficiency)
            .slice(0, 8);
        if (sorted.length === 0) return;

        const bgColors = sorted.map(m => {
            const s = (m.status || '').toLowerCase();
            if (s.includes('run')) return COLORS.running;
            if (s.includes('idle')) return COLORS.idle;
            if (s.includes('maint')) return COLORS.maintenance;
            return COLORS.offline;
        });

        makeChart('comparison', 'machineComparisonChart', {
            type: 'bar',
            data: {
                labels: sorted.map(m => m.name),
                datasets: [{
                    label: 'Efficiency %',
                    data: sorted.map(m => m.efficiency),
                    backgroundColor: bgColors,
                    borderColor: bgColors,
                    borderWidth: 1,
                    borderRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 10, callbacks: { label: ctx => `Efficiency: ${ctx.parsed.x}%` } }
                },
                scales: {
                    x: { min: 0, max: 100, ticks: { stepSize: 20, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, grid: { color: COLORS.grid } },
                    y: { ticks: { font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, grid: { display: false } }
                }
            }
        });
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       PERFORMANCE MATRIX (bubble chart)
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    function createPerformanceMatrixChart(machines) {
        if (!machines || machines.length === 0) return;
        const statusMap = { running: 10, idle: 5, maintenance: 3, offline: 1 };
        const bgColors = machines.map(m => {
            const s = (m.status || 'offline').toLowerCase();
            if (s.includes('run')) return COLORS.running;
            if (s.includes('idle')) return COLORS.idle;
            if (s.includes('maint')) return COLORS.maintenance;
            return COLORS.offline;
        });

        makeChart('matrix', 'performanceMatrixChart', {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Machines',
                    data: machines.map(m => ({
                        x: m.efficiency || 0,
                        y: statusMap[(m.status || 'offline').toLowerCase()] || 1,
                        r: Math.max(5, (m.efficiency || 0) / 8),
                        name: m.name
                    })),
                    backgroundColor: bgColors.map(c => c + 'CC'),
                    borderColor: bgColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.85)', padding: 10,
                        callbacks: { label: ctx => `${ctx.raw.name || 'Machine'}: ${ctx.raw.x}% efficiency` }
                    }
                },
                scales: {
                    x: { min: 0, max: 100, title: { display: true, text: 'Efficiency %', font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, ticks: { stepSize: 20 }, grid: { color: COLORS.grid } },
                    y: {
                        min: 0, max: 12, title: { display: true, text: 'Status Level', font: { family: 'Tahoma, Arial, sans-serif', size: 11 } },
                        ticks: { callback: v => ({ 1: 'Offline', 3: 'Maint.', 5: 'Idle', 10: 'Running' }[v] || ''), font: { family: 'Tahoma, Arial, sans-serif', size: 11 } },
                        grid: { color: COLORS.grid }
                    }
                }
            }
        });
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       ALERTS LIST
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function loadAlertsList() {
        const div = el('alertsList');
        if (!div) return;
        try {
            const alerts = await fetch('/api/alerts?ack=0').then(r => r.ok ? r.json() : []);
            if (!Array.isArray(alerts) || alerts.length === 0) {
                div.innerHTML = '<div class="muted small" style="padding:12px;">No active alerts</div>';
                return;
            }
            div.innerHTML = alerts.slice(0, 10).map(a => {
                const sev = a.severity || 'info';
                const sevColor = sev === 'critical' ? COLORS.critical : sev === 'warning' ? COLORS.warning : COLORS.info;
                const ts = a.raised_at ? new Date(a.raised_at).toLocaleString() : 'â€”';
                const msgSafe = esc(a.message || '');
                const machineSafe = esc(a.machine || `Machine ${a.machine_id || '?'}`);
                return `<div style="padding:8px 12px;border-bottom:1px solid #e0e0e0;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;min-width:0;">
            <strong>${machineSafe}</strong>
            <span style="margin-left:6px;font-size:11px;font-weight:bold;color:${sevColor};text-transform:uppercase;">[${esc(sev)}]</span>
            <div class="muted small" style="margin-top:2px;word-break:break-word;">${msgSafe}</div>
            <div class="muted tiny" style="margin-top:3px;">${ts}</div>
          </div>
          <button class="btn" style="padding:3px 8px;font-size:11px;white-space:nowrap;flex-shrink:0;"
            onclick="showAckModal(${a.id},'${esc(a.machine || '')}','${msgSafe.replace(/'/g, "\\'")}','${esc(sev)}')">Ack</button>
        </div>`;
            }).join('');
        } catch (e) {
            console.error('[DASH] alerts list error:', e);
            if (div) div.innerHTML = '<div class="muted small" style="padding:12px;">Error loading alerts</div>';
        }
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       ACKNOWLEDGE ALERT MODAL
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    window.showAckModal = function (alertId, machine, message, severity) {
        window._ackAlertId = alertId;
        const details = el('alertDetails');
        if (details) details.innerHTML = `<strong>Machine:</strong> ${esc(machine)}<br><strong>Severity:</strong> ${esc(severity)}<br><strong>Message:</strong> ${esc(message)}`;
        const comment = el('alertComment');
        if (comment) comment.value = '';
        const modal = el('acknowledgeAlertModal');
        if (modal) modal.classList.remove('hidden');
    };

    window.acknowledgeAlert = async function () {
        if (!window._ackAlertId) return;
        const comment = el('alertComment')?.value || '';
        try {
            const res = await fetch(`/api/alerts/${window._ackAlertId}/ack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment })
            });
            if (res.ok) {
                el('acknowledgeAlertModal')?.classList.add('hidden');
                loadAlertsList();
                loadKPIs();
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'Unknown error'));
            }
        } catch (e) { alert('Network error: ' + e.message); }
    };

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       MAINTENANCE MODAL
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    // Exposed globally so dashboard.html onclick="loadMachinesForMaintenance()" works
    window.loadMachinesForMaintenance = async function () {
        const sel = el('maintMachineId');
        if (!sel) return;
        sel.innerHTML = '<option value="">Loading machinesâ€¦</option>';
        try {
            const machines = await fetch('/api/machines').then(r => r.ok ? r.json() : []);
            sel.innerHTML = '<option value="">Select a machineâ€¦</option>';
            if (!machines || machines.length === 0) {
                sel.innerHTML = '<option value="">No machines found â€” generate demo data first</option>';
                return;
            }
            machines.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} (${m.type || '?'}) â€” ${m.location || '?'}`;
                sel.appendChild(opt);
            });
        } catch (e) {
            console.error('[DASH] maintenance machines error:', e);
            sel.innerHTML = '<option value="">Error loading machines</option>';
        }
    };

    window.createMaintenanceTask = async function () {
        const machineId = el('maintMachineId')?.value;
        const description = el('maintDescription')?.value?.trim();
        const priority = el('maintPriority')?.value || 'medium';
        const date = el('maintScheduledDate')?.value;
        const tech = el('maintTechnician')?.value?.trim();

        if (!machineId || !description) { alert('Please fill in Machine and Description'); return; }

        // fix: priority 'critical' not in DB schema â€” map to 'high'
        const safePriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'high';

        try {
            const res = await fetch('/api/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ machine_id: parseInt(machineId), description, priority: safePriority, scheduled_date: date || null, technician: tech || null })
            });
            if (res.ok) {
                el('createMaintenanceModal')?.classList.add('hidden');
                el('maintDescription').value = '';
                el('maintTechnician').value = '';
                el('maintScheduledDate').value = '';
                loadKPIs();
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'Unknown error'));
            }
        } catch (e) { alert('Network error: ' + e.message); }
    };

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       DASHBOARD CHART TYPE SWITCHERS
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    const _dashChartData = { perf: null, status: null };

    function initDashChartSwitchers() {
        document.querySelectorAll('.dash-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const chartKey = btn.dataset.chart;
                const newType = btn.dataset.type;
                btn.closest('.dash-type-group').querySelectorAll('.dash-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (chartKey === 'perf') switchPerfChart(newType);
                if (chartKey === 'status') switchStatusChart(newType);
            });
        });
    }

    function switchPerfChart(type) {
        const d = _dashChartData.perf;
        if (!d) return;
        const { labels, data } = d;
        const isArea = type === 'area';
        const chartType = (type === 'area' || type === 'line') ? 'line'
            : type === 'scatter' ? 'scatter' : 'bar';
        const dataset = {
            label: 'Efficiency %',
            borderColor: COLORS.blue,
            backgroundColor: isArea ? COLORS.blueAlpha : (chartType === 'bar' ? COLORS.blue + 'CC' : COLORS.blueAlpha),
            borderWidth: 2, fill: isArea, tension: 0.35,
            pointRadius: chartType === 'scatter' ? 5 : 4, pointHoverRadius: 6,
            pointBackgroundColor: COLORS.blue, pointBorderColor: COLORS.white, pointBorderWidth: 2
        };
        dataset.data = chartType === 'scatter' ? labels.map((l, i) => ({ x: i, y: data[i] })) : data;
        makeChart('perf', 'performanceChart', {
            type: chartType, data: { labels, datasets: [dataset] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 12, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                    tooltip: { mode: chartType === 'scatter' ? 'nearest' : 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.85)', padding: 10 }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                    y: { min: 0, max: 100, ticks: { stepSize: 20, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, grid: { color: COLORS.grid } }
                }
            }
        });
    }

    function switchStatusChart(type) {
        const d = _dashChartData.status;
        if (!d) return;
        const { counts } = d;
        const labels = ['Running', 'Idle', 'Maintenance', 'Offline'];
        const values = [counts.running, counts.idle, counts.maintenance, counts.offline];
        const bgColors = [COLORS.running, COLORS.idle, COLORS.maintenance, COLORS.offline];
        const isRadial = (type === 'doughnut' || type === 'pie' || type === 'polarArea');
        const dataset = isRadial
            ? { data: values, backgroundColor: bgColors, borderColor: COLORS.white, borderWidth: 2, hoverOffset: 6 }
            : { label: 'Machines', data: values, backgroundColor: bgColors, borderColor: bgColors.map(c => c + 'CC'), borderWidth: 1, borderRadius: 3 };
        makeChart('status', 'statusChart', {
            type, data: { labels, datasets: [dataset] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: isRadial ? 'bottom' : 'top', labels: { usePointStyle: true, padding: 14, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.85)', padding: 10,
                        callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a, b) => a + b, 0); const v = ctx.parsed?.y ?? ctx.parsed; return `${ctx.label}: ${v} (${((v / total) * 100).toFixed(1)}%)`; } }
                    }
                },
                scales: isRadial ? {} : {
                    x: { grid: { display: false }, ticks: { font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } },
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, grid: { color: COLORS.grid } }
                }
            }
        });
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       CSV UPLOAD â€” ENTERPRISE VISUALIZATION
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    function initCSVUpload() {
        const dropZone = el('csvDropZone');
        const fileInput = el('csvFileInput');
        if (!dropZone || !fileInput) return;

        const PALETTE = ['#0a6ed1', '#107e3e', '#e9730c', '#bb0000', '#6800b4', '#00838f', '#c87606', '#5c6bc0', '#2e7d32', '#ad1457'];
        let csvState = { headers: [], rows: [], numericCols: [], textCols: [], filename: '' };
        let activeChartType = 'line';

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) loadCSVFile(f); });
        fileInput.addEventListener('change', e => { if (e.target.files[0]) loadCSVFile(e.target.files[0]); });

        document.querySelectorAll('.csv-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.csv-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeChartType = btn.dataset.type;
            });
        });

        const applyBtn = el('csvApplyBtn');
        if (applyBtn) applyBtn.addEventListener('click', renderChart);
        const clearBtn = el('csvClearBtn');
        if (clearBtn) clearBtn.addEventListener('click', resetCSV);

        const exportChartBtn = el('csvExportChartBtn');
        if (exportChartBtn) exportChartBtn.addEventListener('click', () => {
            const canvas = el('csvChart'); if (!canvas) return;
            const a = document.createElement('a');
            a.download = `IMCS_CSV_Chart_${csvState.filename}_${new Date().toISOString().slice(0, 10)}.png`;
            a.href = canvas.toDataURL('image/png'); a.click();
        });

        const exportDataBtn = el('csvExportDataBtn');
        if (exportDataBtn) exportDataBtn.addEventListener('click', () => {
            if (!csvState.rows.length) return;
            const limit = parseInt(el('csvRowLimit')?.value || '200');
            const rows = csvState.rows.slice(0, limit);
            const BOM = '\uFEFF';
            const lines = [csvState.headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))];
            const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `IMCS_Export_${csvState.filename}`; a.click();
        });

        function loadCSVFile(file) {
            if (!file.name.toLowerCase().endsWith('.csv')) { setInfo('âœ— Please select a .csv file', true); return; }
            setInfo('â³ Parsing CSVâ€¦');
            const reader = new FileReader();
            reader.onload = evt => parseCSV(evt.target.result, file.name);
            reader.readAsText(file);
        }

        function parseCSV(text, filename) {
            const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
            if (lines.length < 2) { setInfo('âœ— CSV must have a header row and at least one data row', true); return; }
            function parseLine(line) {
                const result = []; let cur = ''; let inQ = false;
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    if (ch === '"') { inQ = !inQ; }
                    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
                    else { cur += ch; }
                }
                result.push(cur.trim()); return result;
            }
            const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
            const rows = lines.slice(1).map(l => parseLine(l));
            csvState = { headers, rows, numericCols: [], textCols: [], filename };
            reclassifyCols();

            el('csvFileName').textContent = filename;
            el('csvRowCount').textContent = rows.length.toLocaleString();
            el('csvColCount').textContent = headers.length;
            el('csvNumericCount').textContent = csvState.numericCols.length;
            el('csvTextCount').textContent = csvState.textCols.length;
            show('csvStatsBar');

            const xSel = el('csvXCol'); xSel.innerHTML = '';
            headers.forEach((h, i) => { const o = document.createElement('option'); o.value = i; o.textContent = h; if (i === 0) o.selected = true; xSel.appendChild(o); });

            const ySel = el('csvYCols'); ySel.innerHTML = '';
            csvState.numericCols.forEach((col, ci) => { const o = document.createElement('option'); o.value = col.idx; o.textContent = col.name; if (ci < 3) o.selected = true; ySel.appendChild(o); });

            const statsDiv = el('csvColStats');
            statsDiv.innerHTML = csvState.numericCols.map(col =>
                `<div class="csv-col-stat"><strong>${col.name}</strong><span>Min: ${col.min.toFixed(2)} Â· Max: ${col.max.toFixed(2)} Â· Avg: ${col.avg.toFixed(2)} Â· n=${col.count}</span></div>`
            ).join('') + csvState.textCols.map(col =>
                `<div class="csv-col-stat"><strong>${col.name}</strong><span>Text Â· ${col.unique} unique values</span></div>`
            ).join('');

            show('csvControls'); show('csvExportChartBtn'); show('csvExportDataBtn'); show('csvClearBtn');
            dropZone.style.display = 'none';
            renderPreviewTable(); renderEditTable(); renderChart();
            setInfo(`âœ“ Loaded ${filename} â€” ${rows.length.toLocaleString()} rows Ã— ${headers.length} columns`);
        }

        function renderChart() {
            if (!csvState.rows.length) return;
            const limit = parseInt(el('csvRowLimit')?.value || '200');
            const xIdx = parseInt(el('csvXCol')?.value ?? '0');
            const yIdxs = Array.from(el('csvYCols')?.selectedOptions || []).map(o => parseInt(o.value));
            if (!yIdxs.length) { setInfo('âœ— Select at least one Y-axis column', true); return; }
            const rows = csvState.rows.slice(0, limit);
            const labels = rows.map((r, i) => r[xIdx] || `Row ${i + 1}`);
            const type = activeChartType;
            let datasets;
            if (type === 'pie') {
                datasets = [{ label: csvState.headers[yIdxs[0]], data: rows.map(r => parseFloat(r[yIdxs[0]]) || 0), backgroundColor: PALETTE.map(c => c + 'CC'), borderColor: PALETTE, borderWidth: 1 }];
            } else if (type === 'scatter') {
                const xVals = rows.map(r => parseFloat(r[xIdx]) || 0);
                datasets = yIdxs.map((yIdx, ci) => ({ label: csvState.headers[yIdx], data: rows.map((r, i) => ({ x: xVals[i], y: parseFloat(r[yIdx]) || 0 })), backgroundColor: PALETTE[ci % PALETTE.length] + '99', borderColor: PALETTE[ci % PALETTE.length], pointRadius: 4, pointHoverRadius: 6 }));
            } else if (type === 'radar') {
                const radarLabels = yIdxs.map(i => csvState.headers[i]);
                datasets = rows.slice(0, 5).map((r, ri) => ({ label: r[xIdx] || `Row ${ri + 1}`, data: yIdxs.map(i => parseFloat(r[i]) || 0), borderColor: PALETTE[ri % PALETTE.length], backgroundColor: PALETTE[ri % PALETTE.length] + '33', borderWidth: 2, pointRadius: 3 }));
                makeChart('csv', 'csvChart', { type: 'radar', data: { labels: radarLabels, datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Tahoma,Arial,sans-serif', size: 11 } } } }, scales: { r: { ticks: { font: { family: 'Tahoma,Arial,sans-serif', size: 10 } } } } } });
                show('csvVisualization'); renderPreviewTable(limit); return;
            } else {
                datasets = yIdxs.map((yIdx, ci) => ({ label: csvState.headers[yIdx], data: rows.map(r => parseFloat(r[yIdx]) || 0), borderColor: PALETTE[ci % PALETTE.length], backgroundColor: type === 'bar' ? PALETTE[ci % PALETTE.length] + 'BB' : PALETTE[ci % PALETTE.length] + '22', borderWidth: 2, fill: type === 'line', tension: 0.35, pointRadius: rows.length > 100 ? 0 : 3, pointHoverRadius: 5 }));
            }
            makeChart('csv', 'csvChart', {
                type: type === 'scatter' ? 'scatter' : type,
                data: { labels: type === 'scatter' ? undefined : labels, datasets },
                options: {
                    responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
                    plugins: {
                        legend: { display: yIdxs.length > 1 || type === 'pie', position: 'top', labels: { font: { family: 'Tahoma,Arial,sans-serif', size: 11 }, boxWidth: 12 } },
                        tooltip: { callbacks: { label: ctx => { const v = ctx.parsed?.y ?? ctx.parsed; return ` ${ctx.dataset.label}: ${typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 3 }) : v}`; } } }
                    },
                    scales: type === 'pie' || type === 'radar' ? {} : {
                        x: { ticks: { maxTicksLimit: 20, maxRotation: 45, font: { family: 'Tahoma,Arial,sans-serif', size: 10 } }, grid: { display: false } },
                        y: { ticks: { font: { family: 'Tahoma,Arial,sans-serif', size: 10 } }, grid: { color: 'rgba(0,0,0,0.06)' } }
                    }
                }
            });
            show('csvVisualization'); renderPreviewTable(limit);
        }

        function renderPreviewTable(limit) {
            const rows = csvState.rows.slice(0, Math.min(limit || 200, 50));
            const headers = csvState.headers;
            const numIdxs = new Set(csvState.numericCols.map(c => c.idx));
            el('csvPreviewLabel').textContent = `(first ${rows.length} of ${csvState.rows.length.toLocaleString()} rows)`;
            const colMax = {};
            headers.forEach((h, i) => { if (numIdxs.has(i)) colMax[i] = Math.max(...csvState.rows.slice(0, 200).map(r => Math.abs(parseFloat(r[i]) || 0))); });
            const thead = `<thead><tr>${headers.map(h => `<th style="white-space:nowrap;padding:5px 8px;">${h}</th>`).join('')}</tr></thead>`;
            const tbody = '<tbody>' + rows.map((row, ri) =>
                `<tr style="${ri % 2 === 0 ? 'background:#fafafa;' : ''}">` +
                headers.map((h, i) => {
                    const v = row[i] ?? '';
                    if (numIdxs.has(i)) {
                        const num = parseFloat(v); const pct = colMax[i] ? Math.min(Math.abs(num) / colMax[i] * 100, 100) : 0; const color = num < 0 ? '#bb0000' : '#0a6ed1';
                        return `<td style="padding:4px 8px;text-align:right;position:relative;"><div style="position:absolute;bottom:0;left:0;width:${pct}%;height:3px;background:${color}22;"></div><span style="font-weight:600;color:${num < 0 ? '#bb0000' : '#003366'};">${isNaN(num) ? v : num.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span></td>`;
                    }
                    return `<td style="padding:4px 8px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${v}">${v}</td>`;
                }).join('') + '</tr>'
            ).join('') + '</tbody>';
            el('csvPreviewTable').innerHTML = thead + tbody;
            const yIdxs = Array.from(el('csvYCols')?.selectedOptions || []).map(o => parseInt(o.value));
            if (yIdxs.length) {
                const stats = yIdxs.map(i => { const col = csvState.numericCols.find(c => c.idx === i); return col ? `${col.name}: avg ${col.avg.toFixed(2)}, range [${col.min.toFixed(2)}â€“${col.max.toFixed(2)}]` : ''; }).filter(Boolean).join(' Â· ');
                el('csvSummaryStats').textContent = stats;
            }
            show('csvPreviewWrap');
        }

        /* â”€â”€ EDITABLE TABLE â”€â”€ */
        function renderEditTable() {
            const tbl = el('csvEditTable');
            if (!tbl || !csvState.headers.length) return;
            el('csvEditTableInfo').textContent = `(${csvState.rows.length.toLocaleString()} rows Ã— ${csvState.headers.length} cols â€” all cells editable)`;

            function buildTable() {
                tbl.innerHTML = `<thead><tr>${csvState.headers.map(h => `<th>${h}</th>`).join('')}<th style="width:30px;"></th></tr></thead>` +
                    '<tbody>' + csvState.rows.map((row, ri) =>
                        `<tr data-row="${ri}">${csvState.headers.map((h, ci) => `<td><input type="text" value="${String(row[ci] ?? '').replace(/"/g, '&quot;')}" data-row="${ri}" data-col="${ci}"></td>`).join('')}<td><button class="del-row-btn" data-row="${ri}" title="Delete row">âœ•</button></td></tr>`
                    ).join('') + '</tbody>';

                tbl.querySelectorAll('td input').forEach(inp => {
                    inp.addEventListener('change', () => { const r = parseInt(inp.dataset.row), c = parseInt(inp.dataset.col); if (csvState.rows[r]) csvState.rows[r][c] = inp.value; });
                });
                tbl.querySelectorAll('.del-row-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        csvState.rows.splice(parseInt(btn.dataset.row), 1);
                        reclassifyCols(); buildTable();
                        el('csvEditTableInfo').textContent = `(${csvState.rows.length.toLocaleString()} rows Ã— ${csvState.headers.length} cols â€” all cells editable)`;
                    });
                });
            }

            buildTable();
            show('csvEditTableWrap');

            // + Add Row
            const addBtn = el('csvAddRowBtn');
            if (addBtn) {
                const fresh = addBtn.cloneNode(true); addBtn.parentNode.replaceChild(fresh, addBtn);
                fresh.addEventListener('click', () => { csvState.rows.push(csvState.headers.map(() => '')); buildTable(); const wrap = tbl.closest('div'); if (wrap) wrap.scrollTop = wrap.scrollHeight; });
            }

            // Save & Replot
            const saveBtn = el('csvSaveEditBtn');
            if (saveBtn) {
                const freshSave = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(freshSave, saveBtn);
                freshSave.addEventListener('click', () => {
                    tbl.querySelectorAll('td input').forEach(inp => { const r = parseInt(inp.dataset.row), c = parseInt(inp.dataset.col); if (csvState.rows[r]) csvState.rows[r][c] = inp.value; });
                    reclassifyCols(); renderChart(); renderPreviewTable();
                    setInfo(`âœ“ Saved â€” chart updated with ${csvState.rows.length} rows`);
                });
            }

            // Download edited CSV
            const dlBtn = el('csvDownloadEditBtn');
            if (dlBtn) {
                const freshDl = dlBtn.cloneNode(true); dlBtn.parentNode.replaceChild(freshDl, dlBtn);
                freshDl.addEventListener('click', () => {
                    tbl.querySelectorAll('td input').forEach(inp => { const r = parseInt(inp.dataset.row), c = parseInt(inp.dataset.col); if (csvState.rows[r]) csvState.rows[r][c] = inp.value; });
                    const BOM = '\uFEFF';
                    const lines = [csvState.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','), ...csvState.rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))];
                    const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `IMCS_Edited_${csvState.filename}`; a.click();
                });
            }
        }

        function reclassifyCols() {
            csvState.numericCols = []; csvState.textCols = [];
            csvState.headers.forEach((h, i) => {
                const vals = csvState.rows.map(r => r[i]).filter(v => v !== '' && v != null);
                const numVals = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
                if (numVals.length >= vals.length * 0.6 && vals.length > 0) {
                    const sorted = [...numVals].sort((a, b) => a - b);
                    const avg = numVals.reduce((s, v) => s + v, 0) / numVals.length;
                    csvState.numericCols.push({ name: h, idx: i, vals: numVals, min: sorted[0], max: sorted[sorted.length - 1], avg, count: numVals.length });
                } else {
                    csvState.textCols.push({ name: h, idx: i, unique: new Set(vals).size, count: vals.length });
                }
            });
        }

        function resetCSV() {
            csvState = { headers: [], rows: [], numericCols: [], textCols: [], filename: '' };
            destroyChart('csv');
            hide('csvStatsBar'); hide('csvControls'); hide('csvVisualization');
            hide('csvPreviewWrap'); hide('csvEditTableWrap');
            hide('csvExportChartBtn'); hide('csvExportDataBtn'); hide('csvClearBtn');
            dropZone.style.display = ''; fileInput.value = ''; setInfo('');
        }

        function show(id) { const e = el(id); if (e) e.style.display = ''; }
        function hide(id) { const e = el(id); if (e) e.style.display = 'none'; }
        function setInfo(msg, isErr) { const e = el('csvInfo'); if (e) { e.textContent = msg; e.style.color = isErr ? '#bb0000' : '#555'; } }
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       DEMO DATA BUTTONS
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    function initDemoButtons() {
        const generateBtn = el('generateDemoBtn');
        const clearBtn = el('clearDemoBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const n = prompt('Number of machines to generate?', '5');
                const d = prompt('Days of historical data?', '30');
                if (!n || !d) return;
                try {
                    const res = await fetch('/api/demo/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ num_machines: parseInt(n), days: parseInt(d) }) });
                    const result = await res.json();
                    if (result.success) { alert(`Generated: ${result.data.machines} machines, ${result.data.readings} readings`); location.reload(); }
                    else alert('Error: ' + (result.error || 'Failed'));
                } catch (e) { alert('Error: ' + e.message); }
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (!confirm('Clear all demo data? This cannot be undone.')) return;
                try {
                    const res = await fetch('/api/demo/clear', { method: 'POST' });
                    const result = await res.json();
                    if (result.success) { alert('Demo data cleared'); location.reload(); }
                    else alert('Error: ' + (result.error || 'Failed'));
                } catch (e) { alert('Error: ' + e.message); }
            });
        }
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       CHART EXPORT
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    window.exportChart = function (canvasId) {
        const canvas = el(canvasId); if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${canvasId}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png'); link.click();
    };

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       FALLBACK HELPER
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    function showChartFallback(canvasId, fallbackId) {
        const canvas = el(canvasId); const fallback = el(fallbackId);
        if (canvas) canvas.style.display = 'none';
        if (fallback) fallback.style.display = 'block';
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       REFRESH ALL
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    async function refreshAll() {
        await Promise.all([
            loadKPIs(), loadMachinesTable(), loadAlertsList(),
            createPerformanceTrendChart(), createStatusDistributionChart(), createAlertsTrendChart()
        ]);
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
       INIT
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    document.addEventListener('DOMContentLoaded', () => {
        const refreshBtn = el('refreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', refreshAll);

        const maintBtn = el('createMaintenanceBtn');
        if (maintBtn) { maintBtn.addEventListener('click', () => { el('createMaintenanceModal')?.classList.remove('hidden'); window.loadMachinesForMaintenance(); }); }

        const dsBtn = el('datasetManagerBtn'); const dsPanel = el('datasetManagerPanel');
        if (dsBtn && dsPanel) { dsBtn.addEventListener('click', () => { dsPanel.style.display = dsPanel.style.display === 'none' ? 'block' : 'none'; }); }

        initCSVUpload();
        initDemoButtons();
        initDashChartSwitchers();

        if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/static/sw.js').catch(() => { }); }

        refreshAll();
        setInterval(refreshAll, 60000);
    });

})();
