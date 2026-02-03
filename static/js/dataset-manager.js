/* dataset-manager.js
   Dataset management system for importing, creating, and operating on various data types
*/

(function() {
  'use strict';

  let currentDataset = null;
  let datasetHistory = [];

  // Dataset types supported
  const DATASET_TYPES = {
    'time_series': 'Time Series Data',
    'numeric': 'Numeric Data',
    'categorical': 'Categorical Data',
    'mixed': 'Mixed Data Types',
    'sensor': 'Sensor Readings',
    'performance': 'Performance Metrics',
    'custom': 'Custom Dataset'
  };

  // Initialize dataset manager
  function initDatasetManager() {
    const createBtn = document.getElementById('createDatasetBtn');
    const importBtn = document.getElementById('importDatasetBtn');
    const datasetSelect = document.getElementById('datasetSelect');
    const operationsPanel = document.getElementById('datasetOperations');

    if (createBtn) {
      createBtn.addEventListener('click', showCreateDatasetModal);
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        document.getElementById('datasetFileInput')?.click();
      });
    }

    if (datasetSelect) {
      datasetSelect.addEventListener('change', (e) => {
        loadDataset(e.target.value);
      });
    }

    // File input handler
    const fileInput = document.getElementById('datasetFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', handleDatasetImport);
    }

    // Load available datasets
    loadAvailableDatasets();
  }

  // Create new dataset
  function showCreateDatasetModal() {
    const modal = document.getElementById('createDatasetModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function createDataset(datasetConfig) {
    const { name, type, columns, numRows, dataPattern } = datasetConfig;
    
    const dataset = {
      id: `dataset_${Date.now()}`,
      name: name,
      type: type,
      columns: columns,
      rows: [],
      created_at: new Date().toISOString(),
      metadata: {
        row_count: numRows,
        pattern: dataPattern
      }
    };

    // Generate data based on type and pattern
    dataset.rows = generateDatasetRows(columns, numRows, dataPattern, type);
    
    // Store dataset
    storeDataset(dataset);
    currentDataset = dataset;
    
    // Visualize
    visualizeDataset(dataset);
    
    return dataset;
  }

  function generateDatasetRows(columns, numRows, pattern, type) {
    const rows = [];
    const now = new Date();
    
    for (let i = 0; i < numRows; i++) {
      const row = {};
      
      columns.forEach(col => {
        if (col.type === 'timestamp' || col.type === 'date') {
          const date = new Date(now.getTime() - (numRows - i) * 60000); // 1 minute intervals
          row[col.name] = date.toISOString();
        } else if (col.type === 'numeric') {
          if (pattern === 'linear') {
            row[col.name] = (i / numRows) * 100;
          } else if (pattern === 'random') {
            row[col.name] = Math.random() * 100;
          } else if (pattern === 'sine') {
            row[col.name] = 50 + 30 * Math.sin(i * 0.1);
          } else if (pattern === 'trend_up') {
            row[col.name] = 20 + (i / numRows) * 60;
          } else if (pattern === 'trend_down') {
            row[col.name] = 80 - (i / numRows) * 60;
          } else {
            row[col.name] = Math.random() * 100;
          }
          row[col.name] = Math.round(row[col.name] * 100) / 100;
        } else if (col.type === 'categorical') {
          const options = col.options || ['A', 'B', 'C', 'D'];
          row[col.name] = options[Math.floor(Math.random() * options.length)];
        } else if (col.type === 'text') {
          row[col.name] = `Value ${i + 1}`;
        } else {
          row[col.name] = `Data ${i + 1}`;
        }
      });
      
      rows.push(row);
    }
    
    return rows;
  }

  // Import dataset from file
  async function handleDatasetImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileType = file.name.split('.').pop().toLowerCase();
    
    try {
      let dataset;
      
      if (fileType === 'csv') {
        dataset = await importCSVDataset(file);
      } else if (fileType === 'json') {
        dataset = await importJSONDataset(file);
      } else {
        throw new Error('Unsupported file type. Please use CSV or JSON.');
      }
      
      storeDataset(dataset);
      currentDataset = dataset;
      visualizeDataset(dataset);
      
      showNotification(`Dataset "${dataset.name}" imported successfully`, 'success');
      loadAvailableDatasets();
      
    } catch (error) {
      showNotification(`Import failed: ${error.message}`, 'error');
    }
  }

  async function importCSVDataset(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('CSV file must have at least a header and one data row');
          }
          
          const headers = lines[0].split(',').map(h => h.trim());
          const rows = [];
          
          for (let i = 1; i < lines.length && i < 1001; i++) { // Limit to 1000 rows
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx]?.trim() || '';
            });
            rows.push(row);
          }
          
          // Auto-detect column types
          const columns = headers.map(header => {
            const sampleValues = rows.slice(0, 10).map(r => r[header]).filter(v => v);
            let type = 'text';
            
            if (sampleValues.length > 0) {
              const firstVal = sampleValues[0];
              
              // Check if numeric
              if (!isNaN(parseFloat(firstVal)) && isFinite(firstVal)) {
                type = 'numeric';
              }
              // Check if date/timestamp
              else if (firstVal.match(/\d{4}-\d{2}-\d{2}/) || firstVal.match(/\d{2}\/\d{2}\/\d{4}/)) {
                type = 'timestamp';
              }
              // Check if boolean
              else if (['true', 'false', 'yes', 'no', '1', '0'].includes(firstVal.toLowerCase())) {
                type = 'boolean';
              }
            }
            
            return { name: header, type: type };
          });
          
          const dataset = {
            id: `dataset_${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: detectDatasetType(columns, rows),
            columns: columns,
            rows: rows,
            created_at: new Date().toISOString(),
            metadata: {
              row_count: rows.length,
              source: 'csv_import'
            }
          };
          
          resolve(dataset);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async function importJSONDataset(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          let rows, columns;
          
          if (Array.isArray(data)) {
            rows = data.slice(0, 1000);
            if (rows.length > 0) {
              columns = Object.keys(rows[0]).map(key => ({
                name: key,
                type: detectColumnType(rows[0][key])
              }));
            }
          } else if (data.rows && data.columns) {
            rows = data.rows.slice(0, 1000);
            columns = data.columns;
          } else {
            throw new Error('Invalid JSON format');
          }
          
          const dataset = {
            id: `dataset_${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: detectDatasetType(columns, rows),
            columns: columns,
            rows: rows,
            created_at: new Date().toISOString(),
            metadata: {
              row_count: rows.length,
              source: 'json_import'
            }
          };
          
          resolve(dataset);
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  function detectColumnType(value) {
    if (value === null || value === undefined) return 'text';
    
    if (typeof value === 'number') return 'numeric';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date || (typeof value === 'string' && value.match(/\d{4}-\d{2}-\d{2}/))) {
      return 'timestamp';
    }
    if (typeof value === 'string' && ['true', 'false', 'yes', 'no'].includes(value.toLowerCase())) {
      return 'boolean';
    }
    return 'text';
  }

  function detectDatasetType(columns, rows) {
    const hasTimestamp = columns.some(c => c.type === 'timestamp' || c.type === 'date');
    const hasNumeric = columns.some(c => c.type === 'numeric');
    const hasCategorical = columns.some(c => c.type === 'categorical');
    
    if (hasTimestamp && hasNumeric) return 'time_series';
    if (hasNumeric && !hasCategorical) return 'numeric';
    if (hasCategorical && !hasNumeric) return 'categorical';
    if (hasNumeric && hasCategorical) return 'mixed';
    return 'custom';
  }

  // Dataset operations
  function filterDataset(dataset, filters) {
    let filtered = [...dataset.rows];
    
    filters.forEach(filter => {
      const { column, operator, value } = filter;
      
      filtered = filtered.filter(row => {
        const cellValue = row[column];
        
        switch (operator) {
          case 'equals':
            return String(cellValue) === String(value);
          case 'contains':
            return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
          case 'greater_than':
            return parseFloat(cellValue) > parseFloat(value);
          case 'less_than':
            return parseFloat(cellValue) < parseFloat(value);
          case 'between':
            return parseFloat(cellValue) >= parseFloat(value[0]) && 
                   parseFloat(cellValue) <= parseFloat(value[1]);
          default:
            return true;
        }
      });
    });
    
    return {
      ...dataset,
      rows: filtered,
      metadata: {
        ...dataset.metadata,
        filtered: true,
        original_count: dataset.rows.length,
        filtered_count: filtered.length
      }
    };
  }

  function transformDataset(dataset, transformations) {
    let transformed = [...dataset.rows];
    
    transformations.forEach(transform => {
      const { type, column, newColumn, operation } = transform;
      
      if (type === 'calculate') {
        transformed = transformed.map(row => {
          const newRow = { ...row };
          if (operation === 'sum') {
            newRow[newColumn] = transform.columns.reduce((sum, col) => sum + (parseFloat(row[col]) || 0), 0);
          } else if (operation === 'average') {
            const values = transform.columns.map(col => parseFloat(row[col]) || 0);
            newRow[newColumn] = values.reduce((a, b) => a + b, 0) / values.length;
          } else if (operation === 'multiply') {
            newRow[newColumn] = transform.columns.reduce((prod, col) => prod * (parseFloat(row[col]) || 1), 1);
          }
          return newRow;
        });
      } else if (type === 'aggregate') {
        // Group by and aggregate
        const grouped = {};
        transformed.forEach(row => {
          const key = row[transform.groupBy];
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(row);
        });
        
        transformed = Object.keys(grouped).map(key => {
          const group = grouped[key];
          const aggRow = { [transform.groupBy]: key };
          
          transform.aggregations.forEach(agg => {
            const values = group.map(r => parseFloat(r[agg.column]) || 0);
            if (agg.function === 'sum') {
              aggRow[agg.newColumn] = values.reduce((a, b) => a + b, 0);
            } else if (agg.function === 'avg') {
              aggRow[agg.newColumn] = values.reduce((a, b) => a + b, 0) / values.length;
            } else if (agg.function === 'min') {
              aggRow[agg.newColumn] = Math.min(...values);
            } else if (agg.function === 'max') {
              aggRow[agg.newColumn] = Math.max(...values);
            } else if (agg.function === 'count') {
              aggRow[agg.newColumn] = values.length;
            }
          });
          
          return aggRow;
        });
      }
    });
    
    return {
      ...dataset,
      rows: transformed,
      metadata: {
        ...dataset.metadata,
        transformed: true
      }
    };
  }

  // Store dataset in IndexedDB
  async function storeDataset(dataset) {
    if (!window.indexedDB) {
      // Fallback to localStorage
      const datasets = JSON.parse(localStorage.getItem('datasets') || '[]');
      datasets.push(dataset);
      localStorage.setItem('datasets', JSON.stringify(datasets));
      return;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IMCS_Datasets', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['datasets'], 'readwrite');
        const store = tx.objectStore('datasets');
        store.put(dataset);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('datasets')) {
          const store = db.createObjectStore('datasets', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  // Load dataset
  async function loadDataset(datasetId) {
    if (!datasetId || datasetId === 'none') {
      currentDataset = null;
      return;
    }
    
    if (!window.indexedDB) {
      const datasets = JSON.parse(localStorage.getItem('datasets') || '[]');
      currentDataset = datasets.find(d => d.id === datasetId);
      if (currentDataset) {
        visualizeDataset(currentDataset);
      }
      return;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IMCS_Datasets', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['datasets'], 'readonly');
        const store = tx.objectStore('datasets');
        const getRequest = store.get(datasetId);
        
        getRequest.onsuccess = () => {
          currentDataset = getRequest.result;
          if (currentDataset) {
            visualizeDataset(currentDataset);
            resolve(currentDataset);
          } else {
            reject(new Error('Dataset not found'));
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Load available datasets
  async function loadAvailableDatasets() {
    const select = document.getElementById('datasetSelect');
    if (!select) return;
    
    let datasets = [];
    
    if (window.indexedDB) {
      // Load from IndexedDB
      const request = indexedDB.open('IMCS_Datasets', 1);
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.contains('datasets')) {
          const tx = db.transaction(['datasets'], 'readonly');
          const store = tx.objectStore('datasets');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            datasets = getAllRequest.result;
            populateDatasetSelect(datasets);
          };
        } else {
          populateDatasetSelect([]);
        }
      };
    } else {
      // Load from localStorage
      datasets = JSON.parse(localStorage.getItem('datasets') || '[]');
      populateDatasetSelect(datasets);
    }
  }

  function populateDatasetSelect(datasets) {
    const select = document.getElementById('datasetSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="none">Select a dataset...</option>';
    
    datasets.forEach(dataset => {
      const option = document.createElement('option');
      option.value = dataset.id;
      option.textContent = `${dataset.name} (${dataset.type}, ${dataset.rows.length} rows)`;
      select.appendChild(option);
    });
  }

  // Visualize dataset
  function visualizeDataset(dataset) {
    if (!dataset || !window.Chart) return;
    
    // Update dashboard with dataset data
    if (window.updateDashboardWithDataset) {
      window.updateDashboardWithDataset(dataset);
    }
    
    // Render charts
    renderDatasetCharts(dataset);
    
    // Show dataset info
    showDatasetInfo(dataset);
  }

  function renderDatasetCharts(dataset) {
    const canvas = document.getElementById('datasetChart');
    if (!canvas) return;
    
    // Destroy existing chart
    if (window.datasetChartInstance) {
      window.datasetChartInstance.destroy();
    }
    
    const numericCols = dataset.columns.filter(c => c.type === 'numeric');
    const timestampCol = dataset.columns.find(c => c.type === 'timestamp' || c.type === 'date');
    
    if (numericCols.length === 0) {
      return;
    }
    
    const labels = timestampCol 
      ? dataset.rows.map(r => {
          const date = new Date(r[timestampCol.name]);
          return isNaN(date.getTime()) ? r[timestampCol.name] : date.toLocaleDateString();
        })
      : dataset.rows.map((_, i) => `Point ${i + 1}`);
    
    const datasets = numericCols.slice(0, 3).map((col, idx) => {
      const colors = ['#0a6ed1', '#e9730c', '#28a745'];
      return {
        label: col.name,
        data: dataset.rows.map(r => parseFloat(r[col.name]) || 0),
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
        borderWidth: 2,
        fill: idx === 0
      };
    });
    
    window.datasetChartInstance = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: dataset.name,
            font: { size: 14, weight: 'bold' }
          },
          legend: {
            display: true
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

  function showDatasetInfo(dataset) {
    const infoEl = document.getElementById('datasetInfo');
    if (!infoEl) return;
    
    infoEl.innerHTML = `
      <div style="padding: 12px; background: #F5F5F5; border-radius: 4px;">
        <strong>Dataset: ${dataset.name}</strong><br>
        <span class="muted small">Type: ${dataset.type} | Rows: ${dataset.rows.length} | Columns: ${dataset.columns.length}</span>
      </div>
    `;
  }

  function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#D4EDDA' : type === 'error' ? '#F8D7DA' : '#D1ECF1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
      border: 1px solid ${type === 'success' ? '#C3E6CB' : type === 'error' ? '#F5C6CB' : '#BEE5EB'};
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', () => {
    initDatasetManager();
  });

  // Expose globally
  window.DatasetManager = {
    createDataset,
    importCSVDataset,
    importJSONDataset,
    filterDataset,
    transformDataset,
    loadDataset,
    loadAvailableDatasets,
    visualizeDataset,
    getCurrentDataset: () => currentDataset
  };

})();
