# Connection State Machine Documentation

**Document Version**: 1.0
**Last Updated**: 2025-10-07
**Plugin Config Version**: 1.0.1
**Location**: `index.html`

---

## Overview

The Notion Sync Plugin uses a **state machine** to manage the connection and configuration lifecycle. This ensures users follow a proper setup flow and provides clear feedback about the plugin's readiness.

### Key Benefits

- **Clear Setup Flow**: Users know exactly where they are in the configuration process
- **Smart Error Recovery**: Maintains progress when possible (e.g., API key works but database fails)
- **Progressive Configuration**: Can start with API key only, add databases later
- **Auto-Save on Success**: Configuration automatically saved at each successful step

---

## State Definitions

The plugin has **4 distinct states**, tracked via `pluginConfig.connectionState`:

### 1. `initial` - Not Configured
**Visual**: 🔴 Red indicator "Not Configured"

**Description**: Starting state or when authentication has failed. The plugin has no verified connection to Notion.

**When You're Here**:
- Fresh plugin installation
- API key authentication failed
- Configuration was cleared/reset

**Available Actions**:
- ✅ Save configuration (with valid API key)
- ❌ Test Connection (disabled)
- ❌ Discover Databases (disabled)
- ✅ Export/Import configuration

**How to Progress**: Save a valid API key → moves to `not_tested`

---

### 2. `not_tested` - Configuration Saved
**Visual**: 🟠 Orange indicator "Not Tested"

**Description**: Configuration has been saved but not yet verified with Notion API.

**When You're Here**:
- Just saved API key for the first time
- Modified API key and saved again
- Imported configuration from file

**Available Actions**:
- ✅ Save configuration (update settings)
- ✅ Test Connection (enabled!)
- ❌ Discover Databases (disabled)
- ✅ Export/Import configuration

**How to Progress**: Click "Test Connection" → moves to `authenticated` or `configured`

---

### 3. `authenticated` - API Key Verified
**Visual**: 🔵 Blue indicator "Authenticated"

**Description**: API key has been successfully verified with Notion, but databases are not yet configured or verified.

**When You're Here**:
- Successfully tested API key without database IDs
- Database test failed but API key is valid
- After using "Discover Databases" but no databases found

**Available Actions**:
- ✅ Save configuration
- ✅ Test Connection (re-test or test with new DB IDs)
- ✅ **Discover Databases (enabled!)**
- ✅ Export/Import configuration
- ⚠️ Manual sync will not work yet (needs database)

**How to Progress**:
- Add database IDs manually + Test Connection → `configured`
- Click "Discover Databases" (finds DB IDs automatically) → `configured`

---

### 4. `configured` - Fully Configured
**Visual**: 🟢 Green indicator "Configured"

**Description**: API key and at least one database have been successfully verified. **Plugin is ready to use!**

**When You're Here**:
- Successfully tested API key + database IDs
- Successfully used "Discover Databases" and found databases
- Ready for sync operations

**Available Actions**:
- ✅ Save configuration (update settings)
- ✅ Test Connection (re-verify)
- ✅ Discover Databases (re-discover)
- ✅ Export/Import configuration
- ✅ **Manual Sync (enabled in plugin.js)**
- ✅ **Auto-Sync (works if enabled)**

**How to Progress**: You're ready! Start syncing tasks.

---

## State Transition Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         STATE MACHINE                            │
└─────────────────────────────────────────────────────────────────┘

    [INITIAL] 🔴
    Not Configured
         │
         │ Save API Key
         ↓
    [NOT_TESTED] 🟠
    Not Tested
         │
         │ Test Connection
         ├─────────────────────┐
         │                     │
         │ (API only)          │ (API + DBs)
         ↓                     ↓
    [AUTHENTICATED] 🔵    [CONFIGURED] 🟢
    Authenticated         Configured
         │                     ↑
         │ Discover DBs        │
         │ or Add DB IDs       │ Test Connection
         └─────────────────────┘ (with DBs)

    ERROR HANDLING (Smart Fallback):

    Test Connection Fails:
    ├─ API Failed (401/500/etc) → [INITIAL] 🔴
    └─ API OK, DB Failed → [AUTHENTICATED] 🔵 (keep progress!)
```

---


## Smart Error Fallback Logic

### Fallback Decision Table

| API Test | DB Test | Result State | User Can |
|----------|---------|--------------|----------|
| ❌ Fail  | -       | `initial` 🔴 | Fix API key, retry |
| ✅ Pass  | ❌ Fail | `authenticated` 🔵 | Fix DB ID, use discovery |
| ✅ Pass  | ✅ Pass | `configured` 🟢 | Start syncing! |
| ✅ Pass  | (skip)  | `authenticated` 🔵 | Add DB IDs or discover |

### Benefits

1. **Preserve Progress**: API authentication is expensive, don't lose it on DB errors
2. **Enable Discovery**: If DB IDs are wrong, user can use auto-discovery
3. **Better UX**: Clear feedback about what specifically failed
4. **Faster Recovery**: Fix only the failing component, not everything

---

## Button Availability Matrix

| Button | Initial 🔴 | Not Tested 🟠 | Authenticated 🔵 | Configured 🟢 |
|--------|-----------|--------------|-----------------|--------------|
| **Save Configuration** | ✅ | ✅ | ✅ | ✅ |
| **Test Connection** | ❌ | ✅ | ✅ | ✅ |
| **Discover Databases** | ❌ | ❌ | ✅ | ✅ |
| **Export Configuration** | ❌ | ✅ | ✅ | ✅ |
| **Import Configuration** | ✅ | ✅ | ✅ | ✅ |
| **Manual Sync** (plugin.js) | ❌ | ❌ | ❌ | ✅ |
| **Auto-Sync** (plugin.js) | ❌ | ❌ | ❌ | ✅ |

---

## Configuration Data Structure

### pluginConfig Object

```javascript
const CONFIG_VERSION = '1.0.1'; // Defined at index.html:241

let pluginConfig = {
    version: '1.0.1',              // Config format version
    apiKey: 'ntn_...',              // Notion integration API key
    tasksDatabaseId: '...',    // Tasks database UUID
    projectsDatabaseId: '...', // Projects database UUID (optional)
    connectionState: 'configured',  // Current state (see State Definitions)
    enableLogging: true,            // Debug logging toggle
    autoSyncInterval: 10            // Minutes (0 = disabled)
};
```

### Version History

| Version | Date | Changes |
|---------|------|---------|
| `1.0.0` | Legacy | Used `configured: boolean` |
| `1.0.1` | 2025-10-07 | State machine with `connectionState` enum |

### Backward Compatibility

**Removed in v1.0.1**:
- Old `configured: boolean` field no longer supported
- Imports from v1.0.0 will default to `initial` state

---

## Testing Scenarios

### Scenario 1: Fresh Installation

**Steps**:
1. Open plugin UI → Status: 🔴 "Not Configured"
2. Enter API key → Click "Save Configuration"
3. Status: 🟠 "Not Tested", "Test Connection" enabled
4. Click "Test Connection"
5. Status: 🔵 "Authenticated" (no DBs yet)
6. Click "Discover Databases"
7. Status: 🟢 "Configured", ready to sync!

**Expected States**: `initial` → `not_tested` → `authenticated` → `configured`

---

### Scenario 2: Wrong API Key Recovery

**Steps**:
1. Enter wrong API key → Save
2. Status: 🟠 "Not Tested"
3. Click "Test Connection"
4. ❌ Error: "API key is wrong"
5. Status: 🔴 "Not Configured" (fallback to initial)
6. Fix API key → Save
7. Status: 🟠 "Not Tested"
8. Click "Test Connection"
9. Status: 🔵 "Authenticated" ✓

**Expected States**: `initial` → `not_tested` → `initial` (error) → `not_tested` → `authenticated`

---

### Scenario 3: Wrong Database ID Recovery

**Steps**:
1. Valid API + wrong DB ID → Save
2. Status: 🟠 "Not Tested"
3. Click "Test Connection"
4. ✅ API: Success
5. ❌ DB: "object not found (404)"
6. Status: 🔵 "Authenticated" (smart fallback!)
7. Click "Discover Databases"
8. ✓ Auto-finds correct DB ID
9. Status: 🟢 "Configured"

**Expected States**: `initial` → `not_tested` → `authenticated` (smart fallback) → `configured`

**Key Difference**: Plugin stayed green because API worked! User can immediately use discovery.

---

### Scenario 4: Re-testing Existing Configuration

**Steps**:
1. Already in: 🟢 "Configured"
2. Notion workspace changes (DB deleted)
3. Click "Test Connection"
4. ✅ API: Success
5. ❌ DB: Not found
6. Status: 🔵 "Authenticated" (graceful degradation)
7. User can discover new DB or update ID

**Expected States**: `configured` → `authenticated` (graceful degradation)

---

## Error Messages Reference

### API Authentication Errors

| Error | Status Code | Message | Fallback State |
|-------|-------------|---------|----------------|
| Wrong API key | 401 | "API key is wrong. Please check your Notion integration token." | `initial` 🔴 |
| Notion server error | 500 | "API Error (500): Internal Server Error" | `initial` 🔴 |
| Network error | - | "Network request failed" | `initial` 🔴 |
| Rate limit | 429 | "API Error (429): Rate limited" | `initial` 🔴 |

### Database Errors

| Error | Status Code | Message | Fallback State |
|-------|-------------|---------|----------------|
| Database not found | 404 | "Tasks Database Error (404): object not found" | `authenticated` 🟢 |
| No permission | 403 | "Tasks Database Error (403): Forbidden" | `authenticated` 🔵 |
| Invalid UUID | - | "Invalid Tasks Database ID format. Should be a UUID." | (prevents save) |
| Not shared | 404 | "object not found" (database exists but not shared) | `authenticated` 🔵 |

**Note**: All database errors keep `authenticated` state because API key is valid!

---

## Auto-Save Behavior

### When Configuration is Auto-Saved

The plugin automatically saves configuration at these points:

1. **After Successful Test Connection**
   - Saves with `authenticated` or `configured` state
   - User doesn't need to click "Save" again

2. **After Successful Database Discovery**
   - Saves discovered database IDs
   - Saves with `configured` state

3. **On Error Fallback**
   - Saves new state (`initial` or `authenticated`)
   - Preserves all values (API key, DB IDs)

---

## Debugging State Issues

### Enable Debug Logging

1. In plugin UI: Check "Enable Logging"
2. Open browser console (F12)
3. Perform actions and watch for log messages:

```
[Notion Plugin] Saving configuration...
[Notion Plugin] State transitioned to: not_tested
[Notion Plugin] Testing Notion connection...
[Notion Plugin] Testing API authentication...
[Notion Plugin] API authentication successful!
[Notion Plugin] Testing database access...
[Notion Plugin] Tasks Database: My Tasks Database
[Notion Plugin] State transitioned to: configured
[Notion Plugin] Connection test successful - Configured!
```

### Common Issues

**Issue**: Stuck in `not_tested`, Test button disabled
- **Cause**: API key is empty or invalid format
- **Fix**: Ensure API key starts with `ntn_`

**Issue**: Goes to `initial` after database test
- **Cause**: API authentication failed
- **Check**: API key is correct, Notion.com is accessible

**Issue**: Goes to `authenticated` but expected `configured`
- **Cause**: Database test failed
- **Check**: Database ID is correct, database is shared with integration

**Issue**: "Discover Databases" disabled in `authenticated`
- **Cause**: Bug in button logic
- **Check**: `updateUI()` function, line 316-320

---

## API Reference

### State Constants

```javascript
const ConnectionState = {
    INITIAL: 'initial',
    NOT_TESTED: 'not_tested',
    AUTHENTICATED: 'authenticated',
    CONFIGURED: 'configured'
};
```

**Location**: `index.html:232-238`

### Key Functions

#### `saveConfigWithState(newState)`
Transitions to a new state and persists configuration.

**Parameters**:
- `newState` (string): One of ConnectionState values

**Location**: `index.html:324-329`

---

#### `testConnection()`
Tests API authentication and optionally databases, transitions state based on results.

**State Transitions**:
- Success (API only) → `authenticated`
- Success (API + DB) → `configured`
- Fail (API) → `initial`
- Fail (DB, API ok) → `authenticated`

**Location**: `index.html:452-592`

---

#### `discoverDatabases()`
Auto-discovers Notion databases and tests them, transitions to `configured` on success.

**Requirements**:
- State must be `authenticated` or `configured`

**State Transitions**:
- Success (found tasks DB) → `configured`
- Success (no DB) → stays `authenticated`

**Location**: `index.html:595-628`

---

#### `updateUI()`
Updates button states and status indicator based on current state.

**Location**: `index.html:276-321`

---


## Summary

The state machine provides:

✅ **Clear User Experience**: Always know where you are in setup
✅ **Progressive Configuration**: Start with API, add databases later
✅ **Smart Error Recovery**: Keep progress when possible
✅ **Auto-Save**: Configuration saved at every successful step
✅ **Better Debugging**: State history in logs

The plugin is ready to use when in **`configured`** state 🟢.
