# IMCS - Industrial Machinery Control System
## Enterprise-Grade Features & Capabilities

### 🎯 **Core Features**

#### 1. **Live Data Visualization**
- **Real-time Charts**: Interactive Chart.js visualizations with live updates every 30 seconds
- **Multiple Chart Types**: 
  - Line charts for trends
  - Bar charts for comparisons
  - Pie/Doughnut charts for distributions
  - Gauge charts for OEE metrics
  - Heatmaps for status analysis
- **Offline-First**: Charts work offline using cached data and IndexedDB
- **Server-Side Fallback**: PNG charts generated with Matplotlib when Chart.js unavailable

#### 2. **CSV Upload & Visualization**
- **Drag & Drop**: Intuitive CSV file upload interface
- **Auto-Detection**: Automatically detects numeric columns, dates, and data types
- **Multiple Visualizations**: 
  - Line charts for time series data
  - Bar charts for categorical data
  - Automatic chart type selection
- **Offline Storage**: CSV data stored in IndexedDB for offline access
- **Large File Support**: Handles up to 16MB files, processes up to 1000 rows for visualization

#### 3. **Professional SAP-Style UI**
- **Classic SAP GUI Theme**: Authentic 90s SAP look and feel
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Consistent Styling**: SAP color palette and typography
- **Professional Layout**: Enterprise-grade card-based interface

#### 4. **Offline-First Architecture**
- **Service Worker**: Caches static assets and API responses
- **LocalStorage**: Stores chart data and user preferences
- **IndexedDB**: Stores CSV files and large datasets
- **Graceful Degradation**: Falls back to server-side charts when offline

#### 5. **Real-Time Updates**
- **Live Indicators**: Visual indicators showing live data status
- **Auto-Refresh**: Automatic data updates every 30-60 seconds
- **Manual Refresh**: Refresh button for immediate updates
- **Background Sync**: Updates continue in background

### 📊 **Visualization Capabilities**

#### Dashboard Charts
1. **Performance Trend** - Last 7 days efficiency tracking
2. **Status Distribution** - Machine status pie chart
3. **Alerts Trend** - 14-day alert frequency analysis
4. **Machine Comparison** - Top 10 machines by efficiency

#### Machine Details
1. **OEE Gauge** - Overall Equipment Effectiveness visualization
2. **Multi-Sensor Trends** - Multiple sensor data on one chart
3. **Performance History** - Historical performance metrics

#### Reports & Analytics
1. **Performance Metrics** - 30-day performance comparison
2. **Status Heatmap** - Machine status by location
3. **CSV Analysis** - Custom data visualization from uploaded files

### 🔧 **Technical Stack**

#### Backend
- **Flask 3.0.0** - Web framework
- **SQLite** - Database
- **Matplotlib** - Server-side chart generation
- **Pandas** - CSV processing and data analysis
- **NumPy** - Numerical computations

#### Frontend
- **Chart.js 4.4.0** - Client-side chart library
- **Vanilla JavaScript** - No framework dependencies
- **IndexedDB** - Client-side database
- **Service Workers** - Offline support
- **LocalStorage** - Caching and preferences

### 🚀 **Key Features Summary**

✅ **Live Data Visualization** - Real-time charts with auto-updates  
✅ **CSV Upload & Analysis** - Drag-drop CSV files for instant visualization  
✅ **Offline-First** - Works completely offline with cached data  
✅ **Professional UI** - Enterprise SAP-style interface  
✅ **Multiple Chart Types** - Line, bar, pie, gauge, heatmap  
✅ **Real-Time Updates** - Live data refresh every 30 seconds  
✅ **Responsive Design** - Works on all devices  
✅ **Data Export** - CSV data stored locally for offline access  
✅ **Performance Optimized** - Fast loading, efficient caching  
✅ **Enterprise Ready** - Production-grade code quality  

### 📱 **Usage**

1. **Dashboard**: View live KPIs, charts, and machine status
2. **CSV Upload**: Drag and drop CSV files on dashboard or reports page
3. **Charts**: Interactive charts update automatically
4. **Offline Mode**: All features work offline with cached data
5. **Reports**: Comprehensive analytics and custom visualizations

### 🎨 **UI Features**

- SAP 90s classic theme
- Professional color scheme
- Consistent typography
- Responsive grid layout
- Interactive tooltips
- Smooth animations
- Live status indicators

### 🔒 **Data Management**

- Secure file uploads
- Data validation
- Error handling
- Cache management
- Storage quotas
- Data persistence

---

**Built for Industrial Management Excellence**

