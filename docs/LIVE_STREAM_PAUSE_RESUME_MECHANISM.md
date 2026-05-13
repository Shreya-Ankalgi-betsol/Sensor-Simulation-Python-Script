# Live Stream Pause/Resume Data Update Mechanism

## Overview
The live threat stream in your application implements a smart pause/resume mechanism that allows users to temporarily stop the flow of new threat data while still maintaining awareness of what happened during the pause period.

---

## Architecture Components

### 1. **State Management** (`Threats.tsx`)

Three key state variables control the pause/resume behavior:

```typescript
const [isStreamPaused, setIsStreamPaused] = useState(false);
const [streamPauseTimestamp, setStreamPauseTimestamp] = useState<number | null>(null);
const [liveStreamThreats, setLiveStreamThreats] = useState<ThreatLog[]>([]);
```

- **`isStreamPaused`**: Boolean flag indicating whether the stream is currently paused
- **`streamPauseTimestamp`**: Timestamp (in milliseconds) capturing the exact moment the pause button was clicked
- **`liveStreamThreats`**: Array holding all threats received while the tab was active

### 2. **WebSocket Data Flow**

The data arrives through two channels:

1. **WebSocket Context** (`WebSocketContext.tsx`): 
   - Maintains a global `liveThreats` array that continuously updates with new threats from the backend
   - Auto-connects on app load
   - Listens for `NEW_THREAT` messages and prepends them to the threats list

2. **Component-level filtering** (`Threats.tsx`):
   - Only displays threats that match the current tab's time window
   - When paused, blocks new threats from being added to the display

---

## How Data Updates When Paused

### **When User Clicks PAUSE**

```typescript
const handlePauseStream = () => {
  setIsStreamPaused(true);
  setStreamPauseTimestamp(Date.now());  // Capture current timestamp
};
```

**What happens:**
1. `isStreamPaused` becomes `true`
2. `streamPauseTimestamp` is set to the current time
3. The main effect that updates `liveStreamThreats` has a guard:
   ```typescript
   useEffect(() => {
     if (isStreamPaused) return;  // ← This stops the update!
     // ... rest of threat processing
   }, [liveThreats, isStreamPaused, ...]);
   ```
4. **No new threats are added to the display table**
5. **WebSocket still receives data** - the backend continues sending threats to the global WebSocket context
6. **Incoming threats are held in the global `liveThreats` array** but not displayed

### **During Pause Period**

While paused:
- The **live table is frozen** - what you see on screen doesn't change
- The **WebSocket silently accumulates new threats** in the global context
- Users can explore/analyze threatened they've already seen
- Connection status shows "PAUSED" (yellow indicator)

### **When User Clicks RESUME**

```typescript
const handleResumeStream = () => {
  setIsStreamPaused(false);
  setStreamPauseTimestamp(null);
  // The effect automatically adds any new threats that arrived during pause
};
```

**What happens:**
1. `isStreamPaused` becomes `false`
2. `streamPauseTimestamp` is cleared
3. The main effect immediately re-runs with `liveThreats` (from global context)
4. **The filtering logic uses `streamPauseTimestamp` as the reference point:**

```typescript
useEffect(() => {
  if (isStreamPaused) return;

  // Filter for threats that arrived AFTER pause was resumed
  const referenceTime = streamPauseTimestamp 
    ? new Date(streamPauseTimestamp).getTime()  // Use pause time if paused
    : lastThreatTimestamp;                       // Use tab-open time otherwise

  const newThreats = liveThreats.filter((liveThreat) => {
    // Don't display duplicates
    if (prevThreats.some((t) => t.alert_id === liveThreat.alert_id)) {
      return false;
    }
    
    // Only show threats created AFTER pause was resumed
    const threatTime = new Date(liveThreat.timestamp).getTime();
    return threatTime >= referenceTime;
  });

  // Add threats to display and sort by timestamp (most recent first)
  const combined = [...newThreats, ...prevThreats];
  return combined.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}, [liveThreats, isStreamPaused, lastThreatTimestamp, streamPauseTimestamp]);
```

---

## Key Behavior Patterns

### **Pattern 1: Backlog Update on Resume**

**Scenario:** You pause at 2:00 PM. Threats arrive at 2:01, 2:02, 2:03. You resume at 2:04.

**Result:**
- ✅ All threats from 2:01, 2:02, 2:03 are **immediately added** to the display
- ✅ Threats continue arriving in real-time after 2:04
- The table updates are **batched** - not individual threat additions, but all at once when resuming

### **Pattern 2: Reference Time Management**

The system tracks two different "reference times" depending on the state:

| State | Reference Time | Meaning |
|-------|---|---|
| **Live (not paused)** | `lastThreatTimestamp` | When the Live tab was opened |
| **Paused** | `streamPauseTimestamp` | When pause button was clicked |
| **Just Resumed** | Cleared to `null` | Falls back to `lastThreatTimestamp` |

### **Pattern 3: Duplicate Prevention**

Each threat arriving has a unique `alert_id`. The system prevents showing the same threat twice:

```typescript
if (prevThreats.some((t) => t.alert_id === liveThreat.alert_id)) {
  return false;  // Skip already-displayed threats
}
```

This is crucial because:
- Threats might be re-transmitted by the backend
- The global `liveThreats` array might contain old data
- Resuming shouldn't create duplicate entries

### **Pattern 4: Tab Switching Behavior**

When you switch **away from Live tab** and return:

```typescript
const handleTabChange = (tab: ActiveTab) => {
  if (tab === 'live') {
    setLastThreatTimestamp(Date.now());    // Reset reference time
    setLiveStreamThreats([]);               // Clear display
    setLiveStreamStats({ total: 0, ... });
    setIsStreamPaused(false);               // Auto-resume
    setStreamPauseTimestamp(null);
  }
}
```

**Result:**
- The stream **resets** when you return to the Live tab
- Only threats arriving **after returning** are shown
- This prevents showing a stale historical list

---

## Data Flow Diagram

```
WebSocket Backend
        ↓
┌──────────────────────────────────────────┐
│     WebSocket Context (Global State)     │
│  liveThreats = [...]  (constantly        │
│  updated with NEW_THREAT messages)       │
└──────────────────────────────────────────┘
        ↓
   [isStreamPaused?]
        ↓
    ┌───┴───┐
    ↓       ↓
  FALSE    TRUE
    ↓       ↓
  [Filter & Add to   [Yield - wait
   Live Display]     for RESUME]
    ↓               ↓
[Update Table]   [Accumulate in
[Update Stats]   global context]
                 ↓
              [User clicks RESUME]
                 ↓
              [Filter all new threats
               since pause time]
                 ↓
              [Add all to display
               at once]
```

---

## Statistics Update During Pause

The live statistics bar shows:
- **Total Threats**: Threats shown in the current display
- **High Priority**: Count of high-severity threats in display
- **Active Sensors**: Count of active sensors

```typescript
const handlePauseStream = () => {
  setIsStreamPaused(true);
  setStreamPauseTimestamp(Date.now());
};
// → Stats are frozen (no new threats added to display)

const handleResumeStream = () => {
  setIsStreamPaused(false);
  setStreamPauseTimestamp(null);
};
// → Effect re-runs, new threats are added, stats update instantly
```

---

## User Interface Indicators

### **Connection Status Bar**

When **not paused** and connected:
```
🟢 CONNECTED — Live data streaming
```

When **paused**:
```
🟡 PAUSED
+ Banner: "Live stream is paused. Click RESUME to continue."
```

### **Button States**

| Stream State | Button | Action |
|---|---|---|
| Live & Connected | ⏸ **PAUSE** | Freezes table, captures pause timestamp |
| Paused | ▶ **RESUME** | Fetches missed threats, resumes streaming |
| Always Available | 🗑 **CLEAR** | Clears table, resets reference time |

---

## Edge Cases Handled

1. **WebSocket Disconnect During Pause**
   - Pause state is maintained
   - When WebSocket reconnects, accumulated threats are shown on resume

2. **Multiple Pauses Without Resume**
   - Last pause timestamp is used
   - All threats between first pause and resume are included

3. **Tab Switch While Paused**
   - Switching away clears the pause state
   - Returning to Live tab acts like a fresh start

4. **No Threats During Pause**
   - Table remains empty (as expected)
   - Resume works, but nothing new appears

---

## Performance Considerations

- **Reference time comparison:** Uses timestamp comparisons (`getTime()`) instead of object references
- **Sorting:** Threats are re-sorted after resume (O(n log n) on backlog size)
- **No persistence:** Paused threats are only in memory; refreshing loses the backlog
- **Scrolling:** User's scroll position in the table is preserved during pause

---

## Summary

The pause/resume mechanism works by:

1. **While paused**: Blocking the display update effect and capturing pause timestamp
2. **During pause**: WebSocket continues receiving data in global state (hidden from view)
3. **On resume**: Filtering all global threats that arrived after pause time, then displaying them
4. **Smart reference times**: Using pause timestamp to determine which threats to show
5. **Duplicate prevention**: Checking `alert_id` to prevent showing the same threat twice

This design allows users to **pause for inspection** while **never losing data**, and to **catch up instantly** with everything that happened during the pause.
