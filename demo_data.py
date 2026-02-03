"""
Demo Data Generator
Creates sample machines, sensors, and sensor readings for testing
"""
import sqlite3
import random
from datetime import datetime, timedelta
import os

DB = "imcs.db"

def generate_demo_data(company_id=1, num_machines=5, days_of_data=30):
    """Generate comprehensive demo data for testing"""
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    
    try:
        # Machine types and locations
        machine_types = ['CNC Machine', 'Lathe', 'Milling Machine', 'Robot Arm', 'Conveyor', 'Press', 'Welder']
        locations = ['Production Line A', 'Production Line B', 'Assembly Floor', 'Quality Control', 'Warehouse']
        statuses = ['running', 'idle', 'maintenance', 'down']
        
        # Sensor types
        sensor_configs = [
            {'name': 'Temperature', 'unit': '°C', 'min': 20, 'max': 100, 'normal_range': (40, 80)},
            {'name': 'Pressure', 'unit': 'PSI', 'min': 0, 'max': 200, 'normal_range': (50, 150)},
            {'name': 'Vibration', 'unit': 'mm/s', 'min': 0, 'max': 50, 'normal_range': (2, 15)},
            {'name': 'Speed', 'unit': 'RPM', 'min': 0, 'max': 3000, 'normal_range': (500, 2500)},
            {'name': 'Efficiency', 'unit': '%', 'min': 0, 'max': 100, 'normal_range': (70, 95)},
            {'name': 'Power Consumption', 'unit': 'kW', 'min': 0, 'max': 100, 'normal_range': (10, 80)},
        ]
        
        machine_ids = []
        
        # Create machines
        print(f"Creating {num_machines} demo machines...")
        for i in range(num_machines):
            machine_type = random.choice(machine_types)
            location = random.choice(locations)
            status = random.choice(statuses)
            rated_capacity = random.randint(50, 200)
            
            c.execute("""
                INSERT INTO machines (name, type, location, rated_capacity, status, company_id, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """, (f"{machine_type} {i+1}", machine_type, location, rated_capacity, status, company_id))
            
            machine_id = c.lastrowid
            machine_ids.append(machine_id)
            
            # Create 2-4 sensors per machine
            num_sensors = random.randint(2, 4)
            selected_sensors = random.sample(sensor_configs, num_sensors)
            
            for sensor_config in selected_sensors:
                c.execute("""
                    INSERT INTO sensors (machine_id, name, unit, min_threshold, max_threshold)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    machine_id,
                    sensor_config['name'],
                    sensor_config['unit'],
                    sensor_config['min'],
                    sensor_config['max']
                ))
        
        conn.commit()
        print(f"Created {len(machine_ids)} machines with sensors")
        
        # Generate sensor readings for the last N days
        print(f"Generating sensor readings for last {days_of_data} days...")
        total_readings = 0
        
        for machine_id in machine_ids:
            # Get sensors for this machine
            sensors = c.execute(
                "SELECT id, name, unit, min_threshold, max_threshold FROM sensors WHERE machine_id = ?",
                (machine_id,)
            ).fetchall()
            
            if not sensors:
                continue
            
            # Generate readings every 15 minutes for the last N days
            start_date = datetime.now() - timedelta(days=days_of_data)
            current_date = start_date
            
            while current_date <= datetime.now():
                for sensor in sensors:
                    sensor_id, sensor_name, unit, min_thresh, max_thresh = sensor
                    
                    # Get sensor config for normal range
                    sensor_config = next((s for s in sensor_configs if s['name'] == sensor_name), None)
                    if sensor_config:
                        normal_min, normal_max = sensor_config['normal_range']
                        # 80% chance of normal value, 20% chance of abnormal
                        if random.random() < 0.8:
                            value = random.uniform(normal_min, normal_max)
                        else:
                            # Abnormal value (could be high or low)
                            if random.random() < 0.5:
                                value = random.uniform(normal_max, max_thresh * 0.95)
                            else:
                                value = random.uniform(min_thresh * 1.05, normal_min)
                    else:
                        value = random.uniform(min_thresh, max_thresh)
                    
                    # Add some realistic variation
                    value = round(value + random.uniform(-value * 0.05, value * 0.05), 2)
                    value = max(min_thresh, min(max_thresh, value))
                    
                    timestamp = current_date.strftime('%Y-%m-%d %H:%M:%S')
                    
                    c.execute("""
                        INSERT INTO sensor_readings (sensor_id, value, timestamp)
                        VALUES (?, ?, ?)
                    """, (sensor_id, value, timestamp))
                    total_readings += 1
                
                # Move to next 15-minute interval
                current_date += timedelta(minutes=15)
                
                # Limit to prevent too many readings
                if total_readings > 50000:
                    break
            
            if total_readings > 50000:
                break
        
        conn.commit()
        print(f"Generated {total_readings} sensor readings")
        
        # Generate some alerts
        print("Generating sample alerts...")
        alert_count = 0
        for machine_id in machine_ids[:3]:  # Alerts for first 3 machines
            for _ in range(random.randint(2, 5)):
                severities = ['info', 'warning', 'critical']
                messages = [
                    'Temperature exceeded threshold',
                    'Vibration level high',
                    'Efficiency dropped below normal',
                    'Maintenance required',
                    'Sensor reading abnormal',
                    'Performance degradation detected'
                ]
                
                severity = random.choice(severities)
                message = random.choice(messages)
                raised_at = (datetime.now() - timedelta(days=random.randint(0, days_of_data))).strftime('%Y-%m-%d %H:%M:%S')
                acknowledged = 1 if random.random() < 0.6 else 0
                
                c.execute("""
                    INSERT INTO alarms (machine_id, severity, message, raised_at, acknowledged, company_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (machine_id, severity, message, raised_at, acknowledged, company_id))
                alert_count += 1
        
        conn.commit()
        print(f"Generated {alert_count} alerts")
        
        # Generate maintenance tasks
        print("Generating maintenance tasks...")
        maint_count = 0
        for machine_id in machine_ids:
            for _ in range(random.randint(1, 3)):
                descriptions = [
                    'Routine inspection',
                    'Lubrication required',
                    'Calibration needed',
                    'Component replacement',
                    'System update',
                    'Preventive maintenance'
                ]
                priorities = ['low', 'medium', 'high']
                statuses_maint = ['open', 'in_progress', 'completed']
                
                description = random.choice(descriptions)
                priority = random.choice(priorities)
                status = random.choice(statuses_maint)
                scheduled_date = (datetime.now() + timedelta(days=random.randint(-10, 30))).strftime('%Y-%m-%d')
                technician = random.choice(['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', None])
                
                c.execute("""
                    INSERT INTO maintenance_tasks 
                    (machine_id, description, priority, technician, scheduled_date, status, company_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (machine_id, description, priority, technician, scheduled_date, status, company_id))
                maint_count += 1
        
        conn.commit()
        print(f"Generated {maint_count} maintenance tasks")
        
        print(f"\n✅ Demo data generation complete!")
        print(f"   - {len(machine_ids)} machines")
        print(f"   - {total_readings} sensor readings")
        print(f"   - {alert_count} alerts")
        print(f"   - {maint_count} maintenance tasks")
        
        return {
            'machines': len(machine_ids),
            'readings': total_readings,
            'alerts': alert_count,
            'maintenance': maint_count
        }
        
    except Exception as e:
        conn.rollback()
        print(f"Error generating demo data: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    
    # Get company_id from command line or use default
    company_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    num_machines = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    days = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    
    print(f"Generating demo data for company_id={company_id}, machines={num_machines}, days={days}")
    generate_demo_data(company_id, num_machines, days)
