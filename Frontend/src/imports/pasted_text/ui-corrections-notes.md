📄 THREATS PAGE — Corrections
Filter Bar Labels:
Add a small label above each dropdown filter. Labels should be in small caps, #6B7280 (secondary gray), font size 10px, monospace:

Above 1st dropdown: TIME RANGE
Above 2nd dropdown: SENSOR TYPE
Above 3rd dropdown: THREAT TYPE
Above 4th dropdown: SEVERITY
Above 5th dropdown: ACKNOWLEDGMENT

Threat Log Table — Column Order Fix:
The current table has all values shifted one column to the right. Correct the alignment so each value sits strictly under its own column header. The correct order must be:
THREATSENSOR IDSENSOR TYPELOCATIONSEVERITYACKNOWLEDGMENTDroneR-001RadarNorth Gate🔴 HighToggle OFFTrespassingL-002LidarEast Fence🟠 MediumToggle ONWeaponR-003RadarMain Entry🔴 HighToggle OFFTemperatureL-001LidarServer Room🟡 LowToggle ONDroneR-002RadarSouth Perimeter🔴 HighToggle OFFTrespassingL-003LidarWest Wall🟠 MediumToggle ON
No value should bleed into an adjacent column. Each column is fixed width.

📡 SENSORS PAGE — Corrections
Sensor Table — Column Order Fix:
Same issue — all values are shifted one column. Correct alignment so each value is strictly under its header. Correct order:
SENSOR IDTYPESTATUSLOCATIONLAST UPDATEDACTIONSR-001Radar🟢 ActiveNorth Gate18 Mar 2025, 14:32Edit / DeleteR-002Radar🟢 ActiveSouth Perimeter18 Mar 2025, 14:30Edit / DeleteR-003Radar🔴 ErrorMain Entry18 Mar 2025, 13:55Edit / DeleteL-001Lidar🟢 ActiveServer Room18 Mar 2025, 14:31Edit / DeleteL-002Lidar🟢 ActiveEast Fence18 Mar 2025, 14:28Edit / DeleteL-003Lidar⚫ OfflineWest Wall18 Mar 2025, 11:10Edit / Delete
Add DELETE option in Actions column:

Each row in the ACTIONS column should have two buttons side by side:

EDIT — ghost button, cyan border + cyan text
DELETE — ghost button, red border #FF3B3B + red text


On hovering DELETE: background turns to faint red rgba(255,59,59,0.1)
On clicking DELETE: show a small confirmation modal — "Are you sure you want to delete sensor [ID]?" with CONFIRM (red filled) and CANCEL (ghost) buttons

Bottom buttons — keep both:

EDIT SENSOR (ghost cyan) and ADD SENSOR (filled cyan) remain at bottom-right of the table
The inline row EDIT button opens a pre-filled edit modal for that specific sensor row


🗺️ DASHBOARD PAGE — Corrections
Alert Panel / Ticker Bar:

Remove sensor name and location from the scrolling ticker messages
Only show what was detected, not where or by whom — since the right-side live alert panel already shows full details
New ticker message format examples:

🔴 DRONE DETECTED
⚠ HUMAN DETECTED
🔴 WEAPON DETECTED
🟡 TEMPERATURE SPIKE
✅ ALL CLEAR


Keep color coding: red for critical, amber for warning, green for all-clear
Keep the blinking dot before each message

Map — No Default Horizontal/Vertical Scroll:

On initial load, the map must fit entirely within the visible screen area — no scroll bars visible, no content cut off
The map should be fully contained and visible without any panning at default zoom level
All 6 sensor markers, coverage circles, facility boundary, and drone path must be visible within this default view
Zoom controls (+ / − buttons): Only after the user zooms in past the default level should pan/scroll (drag-to-pan) become active
Touchpad zoom support: Enable pinch-to-zoom on trackpad. Scroll gesture (two-finger scroll up/down on touchpad) = zoom in/out on the map
Mouse scroll wheel = zoom in/out
After zooming in: allow drag-to-pan in all four directions (up, down, left, right)
At default zoom: map is locked to fit-screen, no accidental pan


🧭 SIDEBAR & NAVIGATION — Corrections
Hamburger (3-lines) Button — Move to Sidebar:

Remove the hamburger ☰ icon from the top header bar entirely
Place the hamburger icon at the very top of the left sidebar, above all nav icons
Style: same cyan color #00E5FF, centered in the collapsed sidebar (60px wide)
On click: sidebar expands to 220px with smooth slide animation, showing full nav labels
On click again (when expanded): sidebar collapses back to 60px icon-only mode

Profile Icon — Add to Bottom of Sidebar:

At the very bottom of the left sidebar, add a circular profile/user avatar icon
Collapsed state: show just a user circle icon 👤 in secondary gray, centered
Expanded state: show avatar + username (e.g., Admin User) + small role tag (e.g., Security Operator) in small monospace text
On hovering: icon highlights in cyan
On clicking: opens the Profile Page (see below)


👤 PROFILE PAGE — New Page
Trigger: Clicking the profile icon at the bottom of the sidebar
Layout: Centered card on dark background, card width 480px, background #141926, border 1px solid #1E2535, border-radius 12px, padding 40px
Page title: PROFILE in Rajdhani Bold 28px, with breadcrumb Dashboard / Profile above in secondary gray
Profile card content (top to bottom):

Avatar circle — large, 72px diameter, centered, cyan border ring, initials inside (e.g., AU for Admin User)
Username / Email field:

Label: USERNAME / EMAIL in small caps, secondary gray
Input: pre-filled with current value (e.g., admin@threatwatch.io)
Dark input style: background #0A0D14, border #1E2535, focus border cyan, monospace font


Password field:

Label: PASSWORD in small caps
Input: masked •••••••• with show/hide toggle eye icon on right
Same dark input style


Save Changes button:

Full-width, filled cyan #00E5FF, dark text, rounded 8px
Hover: slight glow effect


Divider line #1E2535
Logout button:

Full-width, ghost style — red border #FF3B3B, red text LOGOUT
Icon: power/exit icon on left
Hover: background turns faint red rgba(255,59,59,0.08)
On click: show confirmation modal — "Are you sure you want to logout?" with LOGOUT (red filled) and CANCEL (ghost) buttons