🎨 GLOBAL — Light Theme
Convert the entire application from dark to light theme using these colors:

Background: #F0F4F8
Sidebar: #FFFFFF
Cards/Panels: #FFFFFF
Header bar: #FFFFFF
Table rows alternate: #FFFFFF and #F8FAFC
Table header background: #F1F5F9
Primary Accent: #0284C7 (ocean blue)
Danger/Threat: #DC2626 (red)
Warning: #D97706 (amber)
Safe/OK: #16A34A (green)
Offline: #6B7280 (gray)
Text Primary: #0F172A
Text Secondary: #64748B
Borders: #E2E8F0
Sidebar active item: #EFF6FF background, #0284C7 left border and text
Buttons: filled blue #0284C7 with white text, hover darkens to #0369A1
Delete button: #DC2626 border and text, hover fills light red rgba(220,38,38,0.08)
Severity badges: same colors but on light backgrounds — red badge #FEE2E2 with #DC2626 text, amber badge #FEF3C7 with #D97706 text, green badge #DCFCE7 with #16A34A text
Shadows: soft box-shadow: 0 1px 3px rgba(0,0,0,0.08) on cards
All CSS variables updated accordingly throughout

Increase all font sizes by 15% across the entire application. For example if a label was 0.75rem make it 0.865rem, if body was 0.875rem make it 1rem, headings from 2rem to 2.3rem etc.

🗺️ DASHBOARD PAGE
Sticky Header:

The top header bar (application name, logo, hamburger) must be position: sticky or position: fixed at the top with z-index: 100
When the user scrolls down, the header stays visible at all times
Add a subtle box-shadow: 0 2px 8px rgba(0,0,0,0.08) to the header when scrolled

Remove Alert Ticker:

Remove the scrolling alert ticker bar completely from the dashboard

Map behavior:

The main content area should be split into two fixed columns:

Left: Map area taking 75% of the width — this is the only part that scrolls when zooming/panning
Right: Live Alerts panel taking 25% of the width — this must be position: sticky, fixed to the right side, always visible even when the map is panned or zoomed. It should not move at all.


The Live Alerts panel has its own internal scroll if alerts overflow

Live Alerts as popup on other pages:

On all pages other than Dashboard (Threats, Sensors, Visualization, Profile), show a floating popup in the top-right corner
Popup style: white card 240px wide, border 1px solid #E2E8F0, border-radius 12px, soft shadow, position: fixed, top: 80px, right: 20px, z-index: 200
Popup header: LIVE ALERTS in small caps blue, with a small close × button
Shows the latest 3 alerts only, each with threat type icon, description, and timestamp
If closed, show a small bell icon button 🔔 in top-right corner to reopen it


📡 SENSORS PAGE
Remove ACTIONS column entirely from the table.
Add 3-dot menu per row:

At the end of each sensor row, add a ⋮ (vertical three dots) icon button
Style: subtle gray icon, no border, no background — just the icon
On hover: icon gets a light blue circle background rgba(2,132,199,0.1)
On click: a small dropdown menu appears near the icon with 3 options:

✏️ Edit Sensor — opens the existing edit modal pre-filled with that sensor's data
🗑️ Delete Sensor — opens the existing delete confirmation modal
➕ Add Sensor — opens the add sensor modal (blank form)


Dropdown style: white card, border #E2E8F0, border-radius 8px, soft shadow, each option is a clickable row with hover highlight #F0F9FF
Clicking outside the dropdown closes it

Remove the ADD SENSOR button from the bottom of the table since it's now inside the 3-dot menu.

⚠️ THREATS PAGE
Remove Acknowledgment entirely:

Remove the ACKNOWLEDGMENT filter dropdown
Remove the ACKNOWLEDGED stat card (keep only 3 cards: Total Threats, High Severity, Active Sensors)
Remove the Acknowledgment column from the Threat Log table
Remove all toggle switches from the table

Time Range filter — Custom option with Calendar:

When the user selects Custom from the Time Range dropdown, show a date-time range picker below the filter bar
The picker has two sections side by side: FROM and TO
Each section has:

A dropdown calendar — clicking the date field opens a monthly calendar view where the user can click to select day, navigate months with < > arrows, and click the year/month header to switch to year/month picker view
Below the calendar: a time input in HH:MM format that the user can type manually or use up/down arrows
A APPLY blue button to confirm the range


Calendar style: white card, soft border, current day highlighted in blue circle, selected range highlighted in light blue #EFF6FF, today's date has blue dot indicator
If the user prefers to type manually: also keep a text input showing the selected value in format DD/MM/YYYY HH:MM that updates when calendar selection changes


🔕 REMOVE ACKNOWLEDGMENT GLOBALLY
Remove every acknowledgment-related element from the entire codebase:

Remove acknowledged field from mockData.ts
Remove filterAck state and its dropdown from Threats page
Remove acknowledgedThreats state and toggleAcknowledge function
Remove ACKNOWLEDGED stat card
Remove Acknowledgment table column and <Switch> component from threat rows
Remove any acknowledgment imports