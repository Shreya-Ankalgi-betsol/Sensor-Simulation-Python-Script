# FRONTEND DOCUMENTATION

## 1) Project Overview
Real Time Threat Detection System is a desktop application for monitoring multi-sensor activity and identifying threats as they occur. It is built with Electron, React, and TypeScript to provide a continuous operational view of alerts, sensors, and analytics in real time.

## 2) Tech Stack
- Electron - desktop application wrapper
- React with TypeScript - frontend framework
- Vite - build tool
- Tailwind CSS - styling
- Recharts - data visualization charts
- React Router - page navigation
- React DatePicker - date and time selection
- Lucide React - icons
- FastAPI backend - REST API and WebSocket (external)
- TimescaleDB - time-series database (external)
- WebSocket - real-time data streaming

## 3) Application Pages

### Dashboard
The Dashboard is the main operational page for live monitoring and map-based threat awareness. It combines current activity with timeline-style viewing so users can understand what is happening now and what happened recently.

Features available:
- Interactive threat map view
- Live threat alert panel
- Threat selection details
- Playback mode for recent historical activity
- Timeline-based replay controls
- Active sensor visibility in the monitoring view
- Manual refresh for recent history

When HTTP is called:
- On entering playback-focused viewing to load recent threat history
- On manual refresh to reload recent historical threats
- On periodic reconciliation while playback/history view is active
- Key endpoint: /api/v1/threats

When WebSocket is used:
- Continuously while the app is connected to receive new live threats
- During live monitoring to update alerts and map content without refresh
- Key endpoint: /ws

### Threats
The Threats page is dedicated to active and historical threat review. It separates live events from stored logs so operators can react immediately while also investigating past records.

Features available:
- Two-tab threat experience: Live Stream and Threat Logs
- Live connection status indicator
- Live stream pause and resume controls
- Clear live stream view control
- Filterable historical logs
- Paginated log browsing
- Severity-highlighted threat listing
- Summary cards for threat counts

When HTTP is called:
- When opening or using Threat Logs
- When filters change in Threat Logs
- When loading additional log pages
- When refreshing log results from notification-driven actions
- Key endpoint: /api/v1/threats

When WebSocket is used:
- In Live Stream mode to append incoming threat events in real time
- For live connection health status shown on the page
- While paused, connection remains active and stream updates resume on unpause
- Key endpoint: /ws

### Sensors
The Sensors page is the control center for sensor inventory and sensor status. It allows users to review, add, and update sensor records used by the monitoring system.

Features available:
- Sensor list with status and key metadata
- Sensor status badges (active/inactive/error style)
- Sensor summary cards
- Add sensor flow
- Edit sensor flow
- View-on-map navigation action
- Loading and retry states for data reliability

When HTTP is called:
- On page load to fetch the sensor list
- On add sensor submission
- On edit sensor submission
- After successful add or edit to refresh sensor data
- On retry action after load failure
- Key endpoints: /api/v1/sensors, /api/v1/sensors/{sensor_id}

When WebSocket is used:
- No direct WebSocket data stream is used on this page

### Visualization
The Visualization page provides analytical insights and trend views for threat activity. It helps users understand volume, distribution, and severity patterns over selected time windows.

Features available:
- Threat trend chart over time
- Threat distribution by type
- Severity breakdown visualization
- Sensor or location-oriented threat distribution
- Time range filtering including custom date and time
- Multi-filter controls (location, type, sensor type, severity)
- Reset filters action
- Loading and error states for analytics refresh

When HTTP is called:
- On page load to fetch analytics datasets
- Whenever filters are changed
- Whenever time range is changed, including custom date and time selection
- When reset is used to return to default analytics view
- Key endpoints: /api/v1/analytics/threat-timeline, /api/v1/analytics/threats-per-sensor, /api/v1/analytics/severity-breakdown, /api/v1/analytics/threat-type-breakdown

When WebSocket is used:
- No direct WebSocket data stream is used on this page

### Profile
The Profile page manages user account details and security actions. It supports updating profile information and password management in one place.

Features available:
- Profile details display and edit
- Save profile updates
- Password change workflow
- Input validation for account and password updates
- Logout action
- Success and error feedback messages

When HTTP is called:
- On page load to fetch current user details
- On save profile action
- On change password action
- Key endpoints: /api/v1/users, /api/v1/users/{user_id}, /api/v1/users/{user_id}/change-password

When WebSocket is used:
- No direct WebSocket data stream is used on this page

## 4) Key Features
- Real-time threat detection via WebSocket
- Live map with sensor markers
- Two-tab threat view with Live Stream and Threat Logs
- Filter-based threat log querying
- Sensor management
- Interactive analytics charts
- Notification bell with toast popups
- Timezone-aware filtering
- Map playback mode
- Dark-themed map with coverage radius visualization

## 5) Frontend Folder Structure
src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── pages/
│   ├── services/
│   └── types/
├── imports/
│   └── pasted_text/
├── styles/
│   ├── fonts.css
│   ├── index.css
│   ├── tailwind.css
│   └── theme.css
└── main.tsx

## 6) Pages and Data Sources

| Page | Data Source (HTTP or WebSocket or Both) | Key Endpoint |
|---|---|---|
| Dashboard | Both | HTTP: /api/v1/threats, WebSocket: /ws |
| Threats | Both | HTTP: /api/v1/threats, WebSocket: /ws |
| Sensors | HTTP | /api/v1/sensors |
| Visualization | HTTP | /api/v1/analytics/* |
| Profile | HTTP | /api/v1/users |

## 7) Real-Time Features
The application maintains a live WebSocket connection to receive new threat events and update live-facing interfaces immediately. This real-time stream powers instant threat visibility, live status-oriented UI updates, notification toasts, and the Live Stream threat experience without requiring a page refresh.
