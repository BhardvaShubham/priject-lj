/* dashboard-main.js — Single unified dashboard controller
   Replaces dashboard.js, dashboard-enhanced.js, dashboard-viz-integration.js
   All charts use maintainAspectRatio:false so they fill their containers.
*/
(function () {
    'use strict';

    /* ── helpers ── */
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function el(id) { return document.getElementById(id); }
    function setText(id, v) { const e = el(id); if (e) e.textContent = v; }

    /* ── chart registry — destroy before recreate ── */
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

    /* ── SAP 90s colour palette ── */
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

    /* ══════════════════════════════════════════
       KPI SECTION
    ══════════════════════════════════════════ */
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
                setText('k_total', ov.total_machines ?? '—');
                setText('k_running', `Running: ${ov.running_machines ?? '—'}`);
                setText('k_eff', (ov.avg_efficiency != null ? ov.avg_efficiency + '%' : '—%'));
                setText('k_uptime', `Uptime: ${ov.uptime_percentage ?? '—'}%`);
                setText('k_alerts', ov.active_alerts ?? '—');
                setText('k_maintenance', `Pending: ${ov.pending_maintenance ?? '—'}`);
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
                setText('k_total', summary.total_machines ?? '—');
                setText('k_eff', (summary.avg_efficiency != null ? summary.avg_efficiency + '%' : '—%'));
                setText('k_alerts', summary.active_alerts ?? '—');
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

    /* ══════════════════════════════════════════
       MACHINE STATUS BREAKDOWN
    ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       MACHINES TABLE
    ══════════════════════════════════════════ */
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
                        const eff = m.efficiency != null ? m.efficiency : '—';
                        const statusClass = (m.status || 'offline').toLowerCase().includes('run') ? 'running'
                            : (m.status || '').toLowerCase().includes('idle') ? 'idle'
                                : (m.status || '').toLowerCase().includes('maint') ? 'maintenance' : 'down';
                        return `<tr>
              <td><a href="/machine/${m.id}">${esc(m.name)}</a></td>
              <td>${esc(m.type)}</td>
              <td>${esc(m.location)}</td>
              <td><span class="status-badge ${statusClass}">${esc(m.status || '—')}</span></td>
              <td>${eff}${eff !== '—' ? '%' : ''}</td>
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

    /* ══════════════════════════════════════════
       PERFORMANCE TREND CHART (7 days)
    ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       STATUS DISTRIBUTION CHART (doughnut)
    ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       ALERTS TREND CHART (14 days)
    ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       MACHINE COMPARISON CHART (top 8 by efficiency)
    ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       PERFORMANCE MATRIX (bubble chart)
    ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       ALERTS LIST
    ══════════════════════════════════════════ */
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
                const ts = a.raised_at ? new Date(a.raised_at).toLocaleString() : '—';
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

    /* ══════════════════════════════════════════
       ACKNOWLEDGE ALERT MODAL
    ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       MAINTENANCE MODAL
    ══════════════════════════════════════════ */
    // Exposed globally so dashboard.html onclick="loadMachinesForMaintenance()" works
    window.loadMachinesForMaintenance = async function () {
        const sel = el('maintMachineId');
        if (!sel) return;
        sel.innerHTML = '<option value="">Loading machines…</option>';
        try {
            const machines = await fetch('/api/machines').then(r => r.ok ? r.json() : []);
            sel.innerHTML = '<option value="">Select a machine…</option>';
            if (!machines || machines.length === 0) {
                sel.innerHTML = '<option value="">No machines found — generate demo data first</option>';
                return;
            }
            machines.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} (${m.type || '?'}) — ${m.location || '?'}`;
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

        // fix: priority 'critical' not in DB schema — map to 'high'
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

    /* ══════════════════════════════════════════
       CSV UPLOAD
    ══════════════════════════════════════════ */
    function initCSVUpload() {
        const dropZone = el('csvDropZone');
        const fileInput = el('csvFileInput');
        const csvViz = el('csvVisualization');
        const csvInfo = el('csvInfo');
        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault(); dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) processCSV(file);
        });
        fileInput.addEventListener('change', e => {
            if (e.target.files[0]) processCSV(e.target.files[0]);
        });

        function processCSV(file) {
            const reader = new FileReader();
            reader.onload = evt => {
                const lines = evt.target.result.split('\n').filter(l => l.trim());
                if (lines.length < 2) { if (csvInfo) csvInfo.textContent = 'CSV must have at least 2 rows'; return; }
                const headers = lines[0].split(',').map(h => h.trim());
                const rows = lines.slice(1).map(l => l.split(',').map(v => v.trim()));

                // find numeric columns
                const numericCols = headers.map((h, i) => {
                    const vals = rows.map(r => parseFloat(r[i])).filter(v => !isNaN(v));
                    return vals.length > rows.length * 0.5 ? { name: h, idx: i, vals } : null;
                }).filter(Boolean);

                if (numericCols.length === 0) { if (csvInfo) csvInfo.textContent = 'No numeric columns found'; return; }

                const labels = rows.map((r, i) => r[0] || `Row ${i + 1}`);
                const datasets = numericCols.slice(0, 4).map((col, ci) => ({
                    label: col.name,
                    data: rows.map(r => parseFloat(r[col.idx]) || 0),
                    borderColor: [COLORS.blue, COLORS.running, COLORS.warning, COLORS.maintenance][ci],
                    backgroundColor: [COLORS.blueAlpha, 'rgba(16,126,62,0.15)', 'rgba(233,115,12,0.15)', 'rgba(187,0,0,0.15)'][ci],
                    borderWidth: 2, fill: false, tension: 0.3, pointRadius: 3
                }));

                if (csvViz) csvViz.style.display = 'block';
                if (csvInfo) csvInfo.textContent = `✓ ${file.name} — ${rows.length} rows, ${headers.length} columns`;

                makeChart('csv', 'csvChart', {
                    type: 'line',
                    data: { labels, datasets },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'Tahoma, Arial, sans-serif', size: 11 } } } },
                        scales: {
                            x: { ticks: { maxTicksLimit: 20, font: { family: 'Tahoma, Arial, sans-serif', size: 10 } }, grid: { display: false } },
                            y: { ticks: { font: { family: 'Tahoma, Arial, sans-serif', size: 11 } }, grid: { color: COLORS.grid } }
                        }
                    }
                });
            };
            reader.readAsText(file);
        }
    }

    /* ══════════════════════════════════════════
       DEMO DATA BUTTONS
    ══════════════════════════════════════════ */
    function initDemoButtons() {
        const generateBtn = el('generateDemoBtn');
        const clearBtn = el('clearDemoBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const n = prompt('Number of machines to generate?', '5');
                const d = prompt('Days of historical data?', '30');
                if (!n || !d) return;
                try {
                    const res = await fetch('/api/demo/generate', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ num_machines: parseInt(n), days: parseInt(d) })
                    });
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

    /* ══════════════════════════════════════════
       CHART EXPORT
    ══════════════════════════════════════════ */
    window.exportChart = function (canvasId) {
        const canvas = el(canvasId);
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${canvasId}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    /* ══════════════════════════════════════════
       FALLBACK HELPER
    ══════════════════════════════════════════ */
    function showChartFallback(canvasId, fallbackId) {
        const canvas = el(canvasId);
        const fallback = el(fallbackId);
        if (canvas) canvas.style.display = 'none';
        if (fallback) fallback.style.display = 'block';
    }

    /* ══════════════════════════════════════════
       REFRESH ALL
    ══════════════════════════════════════════ */
    async function refreshAll() {
        await Promise.all([
            loadKPIs(),
            loadMachinesTable(),
            loadAlertsList(),
            createPerformanceTrendChart(),
            createStatusDistributionChart(),
            createAlertsTrendChart()
        ]);
    }

    /* ══════════════════════════════════════════
       INIT
    ══════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {
        // Refresh button
        const refreshBtn = el('refreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', refreshAll);

        // Maintenance button — already in HTML, just wire the click
        const maintBtn = el('createMaintenanceBtn');
        if (maintBtn) {
            maintBtn.addEventListener('click', () => {
                el('createMaintenanceModal')?.classList.remove('hidden');
                window.loadMachinesForMaintenance();
            });
        }

        // Dataset manager panel toggle
        const dsBtn = el('datasetManagerBtn');
        const dsPanel = el('datasetManagerPanel');
        if (dsBtn && dsPanel) {
            dsBtn.addEventListener('click', () => {
                dsPanel.style.display = dsPanel.style.display === 'none' ? 'block' : 'none';
            });
        }

        initCSVUpload();
        initDemoButtons();

        // Service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/static/sw.js').catch(() => { });
        }

        // Initial load
        refreshAll();

        // Auto-refresh every 60s
        setInterval(refreshAll, 60000);
    });

})();
