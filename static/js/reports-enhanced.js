/* reports-enhanced.js
   Enhanced reports with detailed visualizations, data tables, and inline editing
*/

(function() {
  'use strict';

  let machinesChartInstance = null;
  let sensorsChartInstance = null;
  let csvData = null;

  // Initialize editable tables
  function initEditableTable(tableId, editableFields, updateEndpoint, deleteEndpoint) {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.addEventListener('click', async (e) => {
      const target = e.target;
      
      // Handle edit button
      if (target.classList.contains('btn-edit')) {
        const row = target.closest('tr');
        const cells = row.querySelectorAll('.editable-cell');
        cells.forEach(cell => {
          if (editableFields.includes(cell.dataset.field)) {
            const originalValue = cell.textContent.trim();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalValue;
            input.className = 'input';
            cell.textContent = '';
            cell.appendChild(input);
            cell.classList.add('editing');
            input.focus();
            input.select();

            // Save on Enter, cancel on Escape
            input.addEventListener('keydown', async (evt) => {
              if (evt.key === 'Enter') {
                await saveCell(cell, input.value, originalValue, row, updateEndpoint);
              } else if (evt.key === 'Escape') {
                cancelEdit(cell, originalValue);
              }
            });

            input.addEventListener('blur', async () => {
              if (cell.classList.contains('editing')) {
                await saveCell(cell, input.value, originalValue, row, updateEndpoint);
              }
            });
          }
        });
      }

      // Handle save button
      if (target.classList.contains('btn-save')) {
        const row = target.closest('tr');
        await saveRow(row, updateEndpoint);
      }

      // Handle cancel button
      if (target.classList.contains('btn-cancel')) {
        const row = target.closest('tr');
        cancelRowEdit(row);
      }

      // Handle delete button
      if (target.classList.contains('btn-delete')) {
        if (confirm('Are you sure you want to delete this record?')) {
          const row = target.closest('tr');
          const id = row.dataset.id;
          await deleteRow(id, deleteEndpoint, row);
        }
      }
    });
  }

  async function saveCell(cell, newValue, originalValue, row, updateEndpoint) {
    if (newValue === originalValue) {
      cancelEdit(cell, originalValue);
      return;
    }

    const field = cell.dataset.field;
    const id = row.dataset.id;
    const statusEl = row.querySelector('.save-status');
    
    if (statusEl) {
      statusEl.textContent = 'Saving...';
      statusEl.className = 'save-status saving';
    }

    try {
      const response = await fetch(`${updateEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        cell.textContent = newValue;
        cell.classList.remove('editing');
        if (statusEl) {
          statusEl.textContent = 'Saved';
          statusEl.className = 'save-status saved';
          setTimeout(() => statusEl.textContent = '', 2000);
        }
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      alert(`Error saving: ${error.message}`);
      cancelEdit(cell, originalValue);
      if (statusEl) {
        statusEl.textContent = 'Error';
        statusEl.className = 'save-status error';
      }
    }
  }

  async function saveRow(row, updateEndpoint) {
    const id = row.dataset.id;
    const inputs = row.querySelectorAll('.editable-cell.editing input');
    const data = {};

    inputs.forEach(input => {
      const field = input.closest('.editable-cell').dataset.field;
      data[field] = input.value;
    });

    const statusEl = row.querySelector('.save-status');
    if (statusEl) {
      statusEl.textContent = 'Saving...';
      statusEl.className = 'save-status saving';
    }

    try {
      const response = await fetch(`${updateEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update all edited cells
        inputs.forEach(input => {
          const cell = input.closest('.editable-cell');
          cell.textContent = input.value;
          cell.classList.remove('editing');
        });
        
        if (statusEl) {
          statusEl.textContent = 'Saved';
          statusEl.className = 'save-status saved';
          setTimeout(() => statusEl.textContent = '', 2000);
        }
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      alert(`Error saving: ${error.message}`);
      if (statusEl) {
        statusEl.textContent = 'Error';
        statusEl.className = 'save-status error';
      }
    }
  }

  function cancelEdit(cell, originalValue) {
    cell.textContent = originalValue;
    cell.classList.remove('editing');
  }

  function cancelRowEdit(row) {
    const cells = row.querySelectorAll('.editable-cell.editing');
    cells.forEach(cell => {
      const input = cell.querySelector('input');
      if (input) {
        cell.textContent = input.value; // Or restore original
        cell.classList.remove('editing');
      }
    });
  }

  async function deleteRow(id, deleteEndpoint, row) {
    const statusEl = row.querySelector('.save-status');
    if (statusEl) {
      statusEl.textContent = 'Deleting...';
      statusEl.className = 'save-status saving';
    }

    try {
      const response = await fetch(`${deleteEndpoint}/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        row.style.opacity = '0.5';
        setTimeout(() => row.remove(), 300);
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      alert(`Error deleting: ${error.message}`);
      if (statusEl) {
        statusEl.textContent = 'Error';
        statusEl.className = 'save-status error';
      }
    }
  }

  // Load and display machines data
  async function loadMachinesData() {
    const btn = document.getElementById('loadMachinesDataBtn');
    const container = document.getElementById('machinesDataTableContainer');
    const tbody = document.getElementById('machinesDataTableBody');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<img src="/static/icons/refresh.svg" width="12" height="12" alt=""> Loading...';
    }
    
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" class="muted small" style="text-align:center; padding:20px;">Loading data...</td></tr>';
    }

    try {
      const response = await fetch('/api/data/machines/all');
      if (!response.ok) throw new Error('Failed to load data');
      
      const machines = await response.json();
      
      // Render chart
      renderMachinesChart(machines);
      
      // Render table
      renderMachinesTable(machines);
      
      if (container) container.style.display = 'block';
    } catch (error) {
      alert(`Error loading machines data: ${error.message}`);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="muted small" style="text-align:center; padding:20px; color:#bb0000;">Error: ${error.message}</td></tr>`;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<img src="/static/icons/refresh.svg" width="12" height="12" alt=""> Load Data';
      }
    }
  }

  function renderMachinesChart(machines) {
    const canvas = document.getElementById('machinesPerformanceChart');
    if (!canvas || !window.Chart) return;

    if (machinesChartInstance) {
      machinesChartInstance.destroy();
    }

    const labels = machines.map(m => m.name || `Machine ${m.id}`);
    const efficiencies = machines.map(m => m.efficiency || 0);

    machinesChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Efficiency %',
          data: efficiencies,
          backgroundColor: efficiencies.map(eff => 
            eff >= 80 ? '#28a745' : eff >= 60 ? '#ffc107' : '#dc3545'
          ),
          borderColor: '#003366',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Machine Performance Overview',
            font: { size: 14, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  function renderMachinesTable(machines) {
    const tbody = document.getElementById('machinesDataTableBody');
    if (!tbody) return;

    if (machines.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="muted small" style="text-align:center; padding:20px;">No machines found</td></tr>';
      return;
    }

    tbody.innerHTML = machines.map(m => `
      <tr data-id="${m.id}">
        <td>${m.id}</td>
        <td class="editable-cell" data-field="name">${escapeHtml(m.name || '—')}</td>
        <td class="editable-cell" data-field="type">${escapeHtml(m.type || '—')}</td>
        <td class="editable-cell" data-field="location">${escapeHtml(m.location || '—')}</td>
        <td class="editable-cell" data-field="status">${escapeHtml(m.status || '—')}</td>
        <td>${m.efficiency || 0}%</td>
        <td>${m.last_updated || '—'}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon btn-edit" title="Edit">✎</button>
            <span class="save-status"></span>
          </div>
        </td>
      </tr>
    `).join('');

    initEditableTable('machinesDataTable', ['name', 'type', 'location', 'status'], '/api/data/machines', null);
  }

  // Load and display sensors data
  async function loadSensorsData() {
    const btn = document.getElementById('loadSensorsDataBtn');
    const container = document.getElementById('sensorsDataTableContainer');
    const tbody = document.getElementById('sensorsDataTableBody');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<img src="/static/icons/refresh.svg" width="12" height="12" alt=""> Loading...';
    }
    
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted small" style="text-align:center; padding:20px;">Loading data...</td></tr>';
    }

    try {
      const response = await fetch('/api/data/sensors/all');
      if (!response.ok) throw new Error('Failed to load data');
      
      const sensors = await response.json();
      
      // Render chart
      renderSensorsChart(sensors);
      
      // Render table
      renderSensorsTable(sensors);
      
      if (container) container.style.display = 'block';
    } catch (error) {
      alert(`Error loading sensors data: ${error.message}`);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="muted small" style="text-align:center; padding:20px; color:#bb0000;">Error: ${error.message}</td></tr>`;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<img src="/static/icons/refresh.svg" width="12" height="12" alt=""> Load Data';
      }
    }
  }

  function renderSensorsChart(sensors) {
    const canvas = document.getElementById('sensorsDataChart');
    if (!canvas || !window.Chart) return;

    if (sensorsChartInstance) {
      sensorsChartInstance.destroy();
    }

    // Group by sensor name and get latest 50 readings
    const recentSensors = sensors.slice(0, 50);
    const labels = recentSensors.map((s, i) => `Reading ${i + 1}`);
    const values = recentSensors.map(s => parseFloat(s.value) || 0);

    sensorsChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sensor Values',
          data: values,
          borderColor: '#0a6ed1',
          backgroundColor: 'rgba(10, 110, 209, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Sensor Readings Trend (Last 50)',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function renderSensorsTable(sensors) {
    const tbody = document.getElementById('sensorsDataTableBody');
    if (!tbody) return;

    if (sensors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted small" style="text-align:center; padding:20px;">No sensor readings found</td></tr>';
      return;
    }

    tbody.innerHTML = sensors.map(s => `
      <tr data-id="${s.id}">
        <td>${s.id}</td>
        <td>${escapeHtml(s.sensor_name || '—')}</td>
        <td>${escapeHtml(s.machine_name || '—')}</td>
        <td class="editable-cell" data-field="value">${parseFloat(s.value) || 0}</td>
        <td>${escapeHtml(s.unit || '—')}</td>
        <td class="editable-cell" data-field="timestamp">${escapeHtml(s.timestamp || '—')}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon btn-edit" title="Edit">✎</button>
            <button class="btn-icon btn-delete" title="Delete">🗑</button>
            <span class="save-status"></span>
          </div>
        </td>
      </tr>
    `).join('');

    initEditableTable('sensorsDataTable', ['value', 'timestamp'], '/api/data/sensors', '/api/data/sensors');
  }

  // CSV data table
  function renderCSVTable(csvData) {
    const thead = document.getElementById('csvDataTableHead');
    const tbody = document.getElementById('csvDataTableBody');
    const container = document.getElementById('csvDataTableContainer');
    
    if (!thead || !tbody || !csvData) return;

    container.style.display = 'block';

    // Render header
    thead.innerHTML = `<tr>
      ${csvData.columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
      <th>Actions</th>
    </tr>`;

    // Render rows (limit to 100 for performance)
    const rowsToShow = csvData.rows.slice(0, 100);
    tbody.innerHTML = rowsToShow.map((row, idx) => `
      <tr data-row-index="${idx}">
        ${csvData.columns.map(col => {
          const value = row[col] || '';
          return `<td class="editable-cell" data-field="${col}" data-row-index="${idx}">${escapeHtml(value)}</td>`;
        }).join('')}
        <td>
          <div class="table-actions">
            <button class="btn-icon btn-edit" title="Edit">✎</button>
            <span class="save-status"></span>
          </div>
        </td>
      </tr>
    `).join('');

    // Make CSV cells editable (client-side only) - use event delegation
    tbody.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit')) {
        const row = e.target.closest('tr');
        const cells = row.querySelectorAll('.editable-cell');
        cells.forEach(cell => {
          if (cell.classList.contains('editing')) return; // Already editing
          
          const originalValue = cell.textContent.trim();
          const input = document.createElement('input');
          input.type = 'text';
          input.value = originalValue;
          input.className = 'input';
          cell.textContent = '';
          cell.appendChild(input);
          cell.classList.add('editing');
          input.focus();
          input.select();

          const handleKeydown = (evt) => {
            if (evt.key === 'Enter') {
              saveCSVCell(cell, input.value, originalValue, row);
              input.removeEventListener('keydown', handleKeydown);
              input.removeEventListener('blur', handleBlur);
            } else if (evt.key === 'Escape') {
              cancelEdit(cell, originalValue);
              input.removeEventListener('keydown', handleKeydown);
              input.removeEventListener('blur', handleBlur);
            }
          };

          const handleBlur = () => {
            if (cell.classList.contains('editing')) {
              saveCSVCell(cell, input.value, originalValue, row);
              input.removeEventListener('keydown', handleKeydown);
              input.removeEventListener('blur', handleBlur);
            }
          };

          input.addEventListener('keydown', handleKeydown);
          input.addEventListener('blur', handleBlur);
        });
      }
    });
  }

  function saveCSVCell(cell, newValue, originalValue, row) {
    if (newValue === originalValue) {
      cancelEdit(cell, originalValue);
      return;
    }

    const field = cell.dataset.field;
    const rowIndex = parseInt(cell.dataset.rowIndex);
    
    // Update local data
    if (csvData && csvData.rows[rowIndex]) {
      csvData.rows[rowIndex][field] = newValue;
    }

    cell.textContent = newValue;
    cell.classList.remove('editing');

    const statusEl = row.querySelector('.save-status');
    if (statusEl) {
      statusEl.textContent = 'Updated';
      statusEl.className = 'save-status saved';
      setTimeout(() => statusEl.textContent = '', 2000);
    }
  }

  function escapeHtml(text) {
    if (text == null) return '—';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Export functions
  function exportToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      // Exclude Actions column and save-status
      const cols = Array.from(row.querySelectorAll('th, td')).filter(col => {
        const parent = col.closest('td');
        return !parent || !parent.classList.contains('table-actions');
      });
      
      const rowData = cols.map(col => {
        // Get text from input if editing, otherwise from cell
        const input = col.querySelector('input');
        const text = input ? input.value : col.textContent;
        const cleanText = text.trim().replace(/"/g, '""');
        return `"${cleanText}"`;
      });
      csv.push(rowData.join(','));
    });

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', () => {
    // Load machines data button
    const loadMachinesBtn = document.getElementById('loadMachinesDataBtn');
    if (loadMachinesBtn) {
      loadMachinesBtn.addEventListener('click', loadMachinesData);
    }

    // Load sensors data button
    const loadSensorsBtn = document.getElementById('loadSensorsDataBtn');
    if (loadSensorsBtn) {
      loadSensorsBtn.addEventListener('click', loadSensorsData);
    }

    // Export buttons
    const exportMachinesBtn = document.getElementById('exportMachinesBtn');
    if (exportMachinesBtn) {
      exportMachinesBtn.addEventListener('click', () => exportToCSV('machinesDataTable', 'machines_data.csv'));
    }

    const exportSensorsBtn = document.getElementById('exportSensorsBtn');
    if (exportSensorsBtn) {
      exportSensorsBtn.addEventListener('click', () => exportToCSV('sensorsDataTable', 'sensors_data.csv'));
    }

    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) {
      exportCSVBtn.addEventListener('click', () => exportToCSV('csvDataTable', 'csv_data.csv'));
    }

    // Monitor for CSV data updates
    const observer = new MutationObserver(() => {
      // Check if CSV charts are visible and data is available
      const csvCharts = document.getElementById('csvChartsContainer');
      if (csvCharts && csvCharts.style.display !== 'none') {
        // Try to get CSV data from the page context
        setTimeout(() => {
          if (window.csvDataCache) {
            csvData = window.csvDataCache;
            renderCSVTable(csvData);
          }
        }, 500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });

  // Expose functions globally
  window.ReportsEnhanced = {
    loadMachinesData,
    loadSensorsData,
    renderCSVTable,
    exportToCSV
  };

})();
