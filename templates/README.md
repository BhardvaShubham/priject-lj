# Industrial Machinery Management System

A comprehensive, enterprise-grade industrial machinery monitoring and management system with real-time data visualization, built with Python Flask backend and modern web frontend.

## 🚀 Features

### Backend
- **RESTful API** - Complete API for machines, sensors, alerts, and maintenance
- **SQLite Database** - Persistent data storage with proper schema
- **Python Data Visualization** - Matplotlib-based chart generation
- **Real-time Updates** - Auto-refreshing data endpoints

### Frontend
- **Modern UI** - Beautiful, responsive design with glassmorphism effects
- **Real-time Dashboard** - Live monitoring of all machinery
- **Machine Details** - Detailed sensor data and analytics per machine
- **Alerts Management** - Alert tracking and acknowledgment system
- **Maintenance Scheduling** - Task creation and tracking
- **Analytics & Reports** - Comprehensive data visualization

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## 🛠️ Installation

1. **Clone or navigate to the project directory**

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server:**
   ```bash
   cd backend
   python app.py
   ```
   
   The server will start on `http://127.0.0.1:8000`

4. **Open the frontend:**
   - Simply open any HTML file in your browser (e.g., `dashboard.html`)
   - Or use a local web server:
     ```bash
     # Python 3
     python -m http.server 8080
     
     # Then navigate to http://localhost:8080/dashboard.html
     ```

## 📁 Project Structure

```
project/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── visualization.py     # Python chart generation module
│   └── industrial_machinery.db  # SQLite database (auto-created)
├── dashboard.html          # Main dashboard page
├── machinery-overview.html # Machine inventory
├── machine-details.html    # Detailed machine view
├── alerts.html            # Alert management
├── maintenance.html       # Maintenance scheduling
├── reports.html           # Analytics and reports
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## 🔌 API Endpoints

### Machines
- `GET /api/machines` - Get all machines
- `GET /api/machines/<id>` - Get specific machine

### Sensors
- `GET /api/sensors/<machine_id>` - Get sensor data for a machine
- `POST /api/sensors` - Create new sensor reading

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `POST /api/alerts/<id>/acknowledge` - Acknowledge alert

### Maintenance
- `GET /api/maintenance` - Get all maintenance tasks
- `POST /api/maintenance` - Create maintenance task
- `PUT /api/maintenance/<id>` - Update maintenance task

### Statistics
- `GET /api/stats` - Get dashboard statistics

### Charts (Python Visualization)
- `GET /api/chart/status` - Machine status distribution chart
- `GET /api/chart/sensors` - Sensor trends chart
- `GET /api/chart/random-sensors` - Multi-sensor overview
- `GET /api/chart/maintenance` - Maintenance status chart

### Health
- `GET /api/health` - Health check endpoint

## 🎨 Frontend Pages

### Dashboard (`dashboard.html`)
- Overview of all machinery
- Key metrics and KPIs
- Real-time status charts
- Recent alerts
- Python-generated visualizations

### Machinery Overview (`machinery-overview.html`)
- Complete machine inventory
- Search and filter functionality
- Status indicators
- Quick statistics

### Machine Details (`machine-details.html`)
- Individual machine information
- Live sensor data visualization
- Sensor history table
- Real-time updates

### Alerts (`alerts.html`)
- Alert management interface
- Severity filtering
- Acknowledgment system
- Alert statistics

### Maintenance (`maintenance.html`)
- Task creation form
- Maintenance task tracking
- Status management
- Quick statistics

### Reports (`reports.html`)
- Analytics dashboard
- Python-generated charts
- Performance metrics
- Data visualization

## 🔧 Configuration

The backend runs on `127.0.0.1:8000` by default. To change this, edit `backend/app.py`:

```python
app.run(host='127.0.0.1', port=8000, debug=True)
```

## 📊 Database Schema

The system uses SQLite with the following tables:

- **machines** - Machine information (id, name, type, location, status)
- **sensors** - Sensor readings (machine_id, sensor_type, value, unit, timestamp)
- **alerts** - System alerts (machine_id, severity, message, acknowledged)
- **maintenance** - Maintenance tasks (machine_id, description, priority, status)

## 🎯 Usage

1. **Start the backend:**
   ```bash
   cd backend
   python app.py
   ```

2. **Open the dashboard:**
   - Open `dashboard.html` in your browser
   - The system will automatically load sample data on first run

3. **Navigate between pages:**
   - Use the sidebar navigation to switch between different views
   - All pages are interconnected and share the same design system

## 🚀 Features in Detail

### Real-time Updates
- Frontend automatically refreshes data every 30 seconds
- Charts update dynamically
- Status indicators show live data

### Data Visualization
- **JavaScript Charts** - Using Chart.js for interactive visualizations
- **Python Charts** - Using Matplotlib for server-side chart generation
- Dark theme optimized for industrial monitoring

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Modern glassmorphism UI design
- Smooth animations and transitions

## 🐛 Troubleshooting

**Backend not starting:**
- Ensure Python 3.8+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify port 8000 is not in use

**Charts not loading:**
- Ensure backend is running
- Check browser console for CORS errors
- Verify API endpoints are accessible

**Database issues:**
- Delete `industrial_machinery.db` to reset database
- Restart the backend to reinitialize

## 📝 License

This project is provided as-is for educational and commercial use.

## 👥 Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## 🔮 Future Enhancements

- User authentication and authorization
- Historical data analysis
- Export reports to PDF/Excel
- Email notifications for alerts
- Mobile app integration
- Advanced analytics and machine learning predictions

---

**Built with ❤️ for Industrial Management**

