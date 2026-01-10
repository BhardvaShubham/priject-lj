/* csv-viz.js
   CSV upload and visualization module
   Offline-first with IndexedDB storage
*/

(function() {
  'use strict';

  const DB_NAME = 'imcs_csv_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'csv_files';
  let db = null;

  // Initialize IndexedDB
  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  // Store CSV data in IndexedDB
  async function storeCSVData(data) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add({
        ...data,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get CSV data from IndexedDB
  async function getCSVData(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // List all CSV files
  async function listCSVFiles() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Handle file drop
  function handleFileDrop(dropZone, onSuccess, onError) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      }, false);
    });

    dropZone.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length === 0) return;
      
      const file = files[0];
      if (!file.name.endsWith('.csv')) {
        onError('Please drop a CSV file');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload-csv', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.success) {
          // Store in IndexedDB
          await storeCSVData(result.data);
          onSuccess(result);
        } else {
          onError(result.error || 'Upload failed');
        }
      } catch (error) {
        onError('Network error. File saved locally.');
        // Fallback: parse locally
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const rows = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((h, i) => {
            obj[h.trim()] = values[i]?.trim() || '';
          });
          return obj;
        });
        
        const localData = {
          columns: headers,
          rows: rows.slice(0, 1000),
          row_count: rows.length,
          filename: file.name
        };
        
        await storeCSVData(localData);
        onSuccess({ success: true, data: localData, cache_key: `local_${Date.now()}` });
      }
    }, false);
  }

  // Visualize CSV data
  function visualizeCSVData(data, canvasId, chartType = 'auto') {
    if (!window.IMCSCharts || !window.IMCSCharts.hasChartJS()) {
      return false;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return false;

    // Auto-detect chart type
    if (chartType === 'auto') {
      const numericCols = data.columns.filter(col => {
        return data.rows.some(row => !isNaN(parseFloat(row[col])));
      });
      
      if (numericCols.length === 0) {
        return false;
      }

      // If we have date-like column, use line chart
      const dateCols = data.columns.filter(col => {
        return data.rows.some(row => {
          const val = row[col];
          return val && (val.includes('-') || val.includes('/'));
        });
      });

      if (dateCols.length > 0 && numericCols.length > 0) {
        chartType = 'line';
      } else {
        chartType = 'bar';
      }
    }

    const numericCols = data.columns.filter(col => {
      return data.rows.some(row => !isNaN(parseFloat(row[col])));
    });

    if (chartType === 'line' && numericCols.length > 0) {
      // Line chart with first numeric column
      const col = numericCols[0];
      const values = data.rows.map(row => parseFloat(row[col]) || 0);
      const labels = data.rows.map((row, i) => `Row ${i + 1}`);

      new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: col,
            data: values,
            borderColor: '#0a6ed1',
            backgroundColor: '#0a6ed120',
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
              text: `CSV Visualization: ${data.filename}`,
              font: { family: 'Tahoma', size: 13, weight: 'bold' }
            }
          }
        }
      });
      return true;
    } else if (chartType === 'bar' && numericCols.length > 0) {
      // Bar chart with first numeric column
      const col = numericCols[0];
      const values = data.rows.slice(0, 20).map(row => parseFloat(row[col]) || 0);
      const labels = data.rows.slice(0, 20).map((row, i) => `Row ${i + 1}`);

      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: col,
            data: values,
            backgroundColor: '#0a6ed1',
            borderColor: '#0856aa',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `CSV Visualization: ${data.filename}`,
              font: { family: 'Tahoma', size: 13, weight: 'bold' }
            }
          }
        }
      });
      return true;
    }

    return false;
  }

  // Public API
  window.IMCSCSV = {
    handleFileDrop,
    visualizeCSVData,
    storeCSVData,
    getCSVData,
    listCSVFiles,
    initDB
  };

})();

