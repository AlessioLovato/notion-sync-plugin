# Plugin-Iframe Messaging Architecture

## Overview

The Notion Sync Plugin uses a message-based architecture to communicate between the configuration UI (index.html) and the background plugin (plugin.js). This document explains how configuration updates flow through the system.

## Architecture Principles

### Single Source of Truth
Both the UI and background plugin read from and write to the same persistent storage using Super Productivity's `PluginAPI.persistDataSynced()` and `PluginAPI.loadSyncedData()` methods. This storage is the single source of truth for all configuration.

### One-Way Message Flow
Messages flow in one direction only: **index.html → plugin.js**

The UI sends CONFIG_UPDATE messages to notify the background plugin when the user makes configuration changes. This allows the plugin to react immediately without polling.

### Event-Driven Updates
The background plugin does **not** poll for configuration changes. Instead:
- It loads configuration once at startup
- It registers a message handler to receive updates
- Configuration changes trigger immediate auto-sync adjustments

## Component Responsibilities

### index.html (Configuration UI)
**Responsibilities:**
- Display current configuration and connection state
- Validate user input
- Save configuration to persistent storage
- Send CONFIG_UPDATE messages to plugin.js after saves
- Manage state machine (initial, not_tested, authenticated, configured)

**When it sends messages:**
- After "Save Configuration" button click
- After successful "Test Connection"
- After "Discover Databases" completion

### plugin.js (Background Plugin)
**Responsibilities:**
- Load configuration once at startup
- Register message handler for CONFIG_UPDATE messages
- Start/stop auto-sync based on configuration state
- Execute sync operations and task hooks
- Respond to manual sync button clicks

**Message handling logic:**
- Receives CONFIG_UPDATE → updates internal config
- Stops current auto-sync timer (if running)
- Starts auto-sync only if: `connectionState === 'configured'` AND `autoSyncInterval > 0`

## Configuration States

The system uses four connection states that determine auto-sync behavior:

| State | Description | Auto-Sync Allowed? |
|-------|-------------|-------------------|
| **initial** | No config or test failed | ❌ No |
| **not_tested** | API key saved but not tested | ❌ No |
| **authenticated** | API key valid, databases missing/invalid | ❌ No |
| **configured** | API key + both databases validated | ✅ Yes (if interval > 0) |

## Message Protocol

### CONFIG_UPDATE Message

**Purpose:** Notify plugin.js that configuration has changed

**Structure:**
- `type`: Always 'CONFIG_UPDATE'
- `config`: Complete configuration object including:
  - version
  - apiKey
  - tasksDatabaseId
  - projectsDatabaseId
  - connectionState
  - enableLogging
  - autoSyncInterval

**Response:**
- `success`: Boolean indicating if message was processed
- `autoSyncStarted`: Boolean indicating if auto-sync was started as a result
- `error`: Error message if processing failed

## Initialization Flow

### Plugin Startup (plugin.js loads first)
1. Register message handler via `PluginAPI.onMessage()`
2. Load configuration from persistent storage (one time only)
3. Register all hooks (manual sync button, task hooks, app hooks)
4. Decide whether to start auto-sync:
   - If `connectionState === 'configured'` AND `autoSyncInterval > 0` → Start auto-sync
   - Otherwise → Wait for user to configure via UI

### UI Startup (when user opens plugin settings)
1. Load configuration from persistent storage
2. Update UI to reflect current connection state
3. Enable/disable buttons based on state machine
4. No message sent (both sides already have same config)

## Configuration Update Flow

### Save Configuration
1. User clicks "Save Configuration"
2. UI validates input
3. UI updates in-memory config object
4. UI transitions state to NOT_TESTED (config hasn't been tested yet)
5. UI saves to persistent storage
6. UI updates UI elements
7. UI sends CONFIG_UPDATE message to plugin.js
8. plugin.js receives message, updates internal config, stops auto-sync (not configured)

### Test Connection
1. User clicks "Test Connection"
2. UI tests API key authentication
3. If valid and both database IDs present → test databases
4. UI transitions state based on results:
   - API invalid → INITIAL (clears credentials)
   - API valid, no DBs → AUTHENTICATED
   - API + both DBs valid → CONFIGURED
5. UI saves to persistent storage
6. UI sends CONFIG_UPDATE message to plugin.js
7. plugin.js receives message, starts auto-sync only if state is CONFIGURED

### Discover Databases
1. User clicks "Discover Databases"
2. UI searches for databases by title patterns
3. UI updates config with found database IDs
4. UI transitions state (AUTHENTICATED or CONFIGURED based on findings)
5. UI saves to persistent storage
6. UI sends CONFIG_UPDATE message to plugin.js
7. plugin.js adjusts auto-sync accordingly

### Change Auto-Sync Interval
1. User changes interval dropdown (5min, 15min, Never, etc.)
2. UI saves new interval to config
3. UI saves to persistent storage
4. UI sends CONFIG_UPDATE message to plugin.js
5. plugin.js stops current timer and restarts with new interval (if configured)

## Auto-Sync Decision Logic

The background plugin decides whether to run auto-sync using two conditions:

**Condition 1: System is fully configured**
- `pluginConfig.connectionState === 'configured'`
- Both API key and database IDs validated

**Condition 2: Auto-sync is enabled**
- `pluginConfig.autoSyncInterval > 0`
- User has selected an interval (not "Never")

**Both conditions must be true for auto-sync to start.**

When CONFIG_UPDATE is received:
1. Always stop current auto-sync timer
2. Check both conditions
3. If both true → start new timer with updated interval
4. If either false → keep auto-sync stopped

## Task Hook Behavior

All task hooks (TASK_COMPLETE, TASK_UPDATE, TASK_DELETE) check the connection state before executing:

- If `connectionState !== 'configured'` → Hook exits immediately, no sync
- If `connectionState === 'configured'` → Hook processes the task change

This ensures task hooks only fire when the system is properly configured.

## Error Handling

### Message Send Failure
If CONFIG_UPDATE message fails to send:
- Configuration is already saved to persistent storage (source of truth)
- plugin.js will load correct config on next startup
- Message failure is logged but non-critical
- User is not interrupted

### Message Handler Not Registered
If plugin.js hasn't registered its message handler yet:
- PluginAPI will queue or reject the message
- Configuration is still saved to storage
- On next plugin.js startup, it will load the updated config

## Key Benefits

✅ **No Polling** - Eliminates 2-minute polling timer, reducing CPU usage

✅ **Instant Updates** - Auto-sync adjusts immediately when user changes settings

✅ **State-Based Control** - Auto-sync only runs when system is fully configured

✅ **Simpler Code** - Removes ~200 lines of monitoring logic from plugin.js

✅ **Reliable** - Persistent storage ensures consistency even if messages fail

✅ **Event-Driven** - Responds to user actions rather than periodic checks

## Implementation Notes

### No Backward Compatibility
The system does not maintain backward compatibility with the old `configured: boolean` field. All code uses `connectionState` exclusively.

### Message Direction
Messages only flow from UI to background. The background plugin never sends messages to the UI. Both read the shared persistent storage as needed.

### Startup Order
plugin.js typically loads before index.html (background before UI), but the system works regardless of startup order due to shared persistent storage.

---

**Version:** 1.0.1
**Last Updated:** 2025-10-09
