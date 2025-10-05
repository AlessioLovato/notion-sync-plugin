# Sync Workflow Documentation

This document explains how the bidirectional synchronization between Super Productivity and Notion works, including the sync process, conflict resolution, and data flow.

## Overview

The Notion Sync Plugin implements a comprehensive bidirectional synchronization system that keeps tasks synchronized between Super Productivity (SP) and Notion databases in real-time.

## Sync Architecture

### Sync Types

#### 1. Manual Sync
- **Trigger**: User clicks "Sync Notion" header button or "Manual Sync" in plugin UI
- **Behavior**: Immediate full bidirectional sync
- **Rate Limiting**: 5-second minimum between manual syncs
- **User Feedback**: Progress notifications via snackbar

#### 2. Auto-Sync
- **Trigger**: Timer-based at configurable intervals (5min-2hr)
- **Behavior**: Background bidirectional sync
- **Rate Limiting**: Respects configured interval and 5-second minimum
- **Monitoring**: Can be enabled/disabled and monitored via configuration

#### 3. Real-time Hooks
- **Triggers**: Task completion, updates, deletions, day finish, window focus
- **Behavior**: Targeted sync for specific events
- **Performance**: Optimized for single-task operations
- **Reliability**: Falls back to full sync if targeted sync fails

## Sync Process Flow

### Phase 0: Prerequisites
```
1. Validate configuration (API key, database IDs)
2. Test Notion API connectivity
3. Load current SP tasks, projects, and tags
4. Load existing sync mappings
```

### Phase 1: Project and Tag Sync
```
1. Sync SP Projects → Notion Projects database
   - Create missing projects in Notion
   - Update existing project properties
   - Track project ID mappings

2. Sync SP Tags → Notion Task Type multi-select options
   - Add new tags as Task Type options
   - Update existing tag properties
   - Maintain tag ID mappings
```

### Phase 2: SP Tasks → Notion Pages
```
1. Get all current SP tasks (active + archived)
2. For each SP task:
   a. Check if task exists in Notion (via SP Task ID mapping)
   b. If exists: compare lastModified timestamps
   c. If newer in SP or missing in Notion: sync SP → Notion
   d. Convert SP task properties to Notion page properties
   e. Create or update Notion page
   f. Store/update sync mapping
```

### Phase 3: Notion Pages → SP Tasks
```
1. Query Notion database for all pages
2. For each Notion page:
   a. Check if task exists in SP (via SP Task ID property)
   b. If exists: compare lastModified timestamps
   c. If newer in Notion or missing in SP: sync Notion → SP
   d. Convert Notion page properties to SP task properties
   e. Create or update SP task
   f. Store/update sync mapping
```

### Phase 4: Cleanup and Statistics
```
1. Update last sync timestamp
2. Clean up stale mappings
3. Calculate and log sync statistics
4. Return results to user interface
```

## Data Transformation

### SP Task → Notion Page Properties

#### Basic Properties
```javascript
// Title mapping
task.title → Notion "Name" (Title property)

// Description mapping
task.notes → Notion "Notes" (Rich Text property)

// Completion mapping
task.isDone → Notion "Complete" (Checkbox property)
task.isDone → Notion "Status" (Status property: Complete/Not started)
```

#### Time Properties
```javascript
// Time tracking (milliseconds → hours conversion)
task.timeEstimate → Notion "Time Estimate" (Number property)
// Example: 7200000 ms → 2.0 hours

task.timeSpent → Notion "Time Spent" (Number property)
// Example: 5400000 ms → 1.5 hours

// Scheduling
task.plannedAt → Notion "Scheduling" (Date property)
// Example: timestamp → ISO date string
```

#### Relationships
```javascript
// Project assignment
task.projectId → Notion "Projects" (Relation property)
// Requires project sync to establish ID mappings

// Tag assignments
task.tagIds → Notion "Task Type" (Multi-select property)
// Requires tag sync to create multi-select options
```

#### Sync Metadata
```javascript
// Essential for bidirectional sync
task.id → Notion "SP Task ID" (Rich Text property)
// Never modify this manually - breaks sync mapping
```

### Notion Page → SP Task Properties

#### Reverse Conversion
```javascript
// All mappings work in reverse with proper type conversion
Notion "Name" → task.title (string)
Notion "Notes" → task.notes (string)
Notion "Complete" → task.isDone (boolean)

// Time conversion (hours → milliseconds)
Notion "Time Estimate" → task.timeEstimate
// Example: 2.5 hours → 9000000 ms

// Priority conversion
Notion "Priority": "High" → task.priority = 2

// Date conversion
Notion "Scheduling" → task.plannedAt (timestamp)
```

#### Null Handling
```javascript
// Graceful handling of missing/null values
if (!notionProperty || notionProperty.length === 0) {
    spTask.property = null; // or appropriate default
}
```

## Conflict Resolution

### Conflict Detection
Conflicts occur when the same task is modified in both SP and Notion between sync operations.

#### Detection Method
```javascript
// Compare last modified timestamps
const spLastModified = task.lastModified;
const notionLastModified = new Date(notionPage.last_edited_time);

if (spLastModified > notionLastModified) {
    // SP is newer
} else if (notionLastModified > spLastModified) {
    // Notion is newer
} else {
    // Same timestamp - no conflict
}
```

### Resolution Strategies

#### 1. Last Modified Wins (Default)
```javascript
// Newer changes overwrite older ones
if (spLastModified > notionLastModified) {
    syncDirection = 'SP_TO_NOTION';
} else {
    syncDirection = 'NOTION_TO_SP';
}
```

#### 2. Super Productivity Wins
```javascript
// SP changes always take precedence
syncDirection = 'SP_TO_NOTION';
```

#### 3. Notion Wins
```javascript
// Notion changes always take precedence
syncDirection = 'NOTION_TO_SP';
```

#### 4. Prompt User (Planned)
```javascript
// Ask user to choose (future implementation)
const userChoice = await showConflictDialog(spTask, notionPage);
syncDirection = userChoice;
```

## Sync Mappings

### Purpose
Sync mappings maintain the relationship between SP tasks and Notion pages across sync operations.

### Structure
```javascript
const syncMappings = new Map();
// Key: SP task ID (string)
// Value: Notion page ID (string)

syncMappings.set('sp-task-uuid', 'notion-page-uuid');
```

### Persistence
```javascript
// Stored in Super Productivity's persistent data
const mappingsData = {
    taskMappings: Object.fromEntries(syncMappings),
    lastSyncTime: Date.now(),
    version: '1.0.0'
};

await PluginAPI.persistDataSynced(JSON.stringify(mappingsData));
```

### Cleanup
```javascript
// Remove mappings for deleted tasks
for (const [spId, notionId] of syncMappings) {
    const spTaskExists = spTasks.some(task => task.id === spId);
    const notionPageExists = notionPages.some(page => page.id === notionId);

    if (!spTaskExists || !notionPageExists) {
        syncMappings.delete(spId);
    }
}
```

## Error Handling

### Network Errors
```javascript
// Retry logic with exponential backoff
async function retryWithBackoff(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;

            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

### API Rate Limiting
```javascript
// Respect Notion API rate limits
if (error.status === 429) {
    const retryAfter = error.headers['Retry-After'] || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    // Retry operation
}
```

### Data Validation Errors
```javascript
// Handle invalid or corrupted data
try {
    const spTask = convertNotionPageToSpTask(notionPage);
    await PluginAPI.addTask(spTask);
} catch (validationError) {
    console.error('Invalid task data:', validationError);
    // Skip this task and continue with others
    continue;
}
```

### Sync Failure Recovery
```javascript
// Graceful degradation on sync failures
try {
    await performFullSync();
} catch (error) {
    // Log error but don't crash the plugin
    console.error('Sync failed:', error);

    // Show user notification
    PluginAPI.showSnack({
        msg: `Sync failed: ${error.message}`,
        type: 'ERROR'
    });

    // Continue with normal operation
}
```

## Performance Optimization

### Batch Operations
```javascript
// Process multiple tasks efficiently
const batchSize = 10;
for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    await Promise.all(batch.map(task => syncTask(task)));
}
```

### Incremental Sync
```javascript
// Only sync changed tasks since last sync
const lastSyncTime = await getLastSyncTime();
const changedTasks = spTasks.filter(task =>
    task.lastModified > lastSyncTime
);
```

### Efficient API Usage
```javascript
// Use Notion's pagination efficiently
let cursor = null;
const allPages = [];

do {
    const response = await notionRequest('databases/{id}/query', 'POST', {
        start_cursor: cursor,
        page_size: 100
    });

    allPages.push(...response.results);
    cursor = response.next_cursor;
} while (cursor);
```

## Monitoring and Logging

### Sync Statistics
```javascript
const syncResults = {
    spToNotionCreates: 0,
    spToNotionUpdates: 0,
    notionToSpCreates: 0,
    notionToSpUpdates: 0,
    conflicts: 0,
    errors: 0,
    duration: 0
};
```

### Debug Logging
```javascript
function log(message, level = 'info', context = null) {
    if (!pluginConfig.enableLogging) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Notion Sync] ${message}`, context || '');
}
```

## Real-time Sync Hooks

### Task Completion Hook
```javascript
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, async (task) => {
    if (!pluginConfig.configured) return;

    try {
        // Sync this specific task to Notion immediately
        await syncSingleTaskToNotion(task);
        log(`Task completion synced: ${task.title}`);
    } catch (error) {
        log(`Failed to sync completed task: ${error.message}`, 'error');
    }
});
```

### Task Update Hook
```javascript
PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, async (task) => {
    if (!pluginConfig.configured) return;

    // Debounce rapid updates
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(async () => {
        try {
            await syncSingleTaskToNotion(task);
            log(`Task update synced: ${task.title}`);
        } catch (error) {
            log(`Failed to sync task update: ${error.message}`, 'error');
        }
    }, 2000); // Wait 2 seconds for additional updates
});
```

### Window Focus Hook
```javascript
if (PluginAPI.onWindowFocusChange) {
    PluginAPI.onWindowFocusChange(async (isFocused) => {
        if (isFocused && pluginConfig.configured) {
            const timeSinceLastSync = Date.now() - lastSyncTime;
            const autoSyncInterval = pluginConfig.autoSyncInterval * 60 * 1000;

            // Sync if it's been longer than the auto-sync interval
            if (timeSinceLastSync > autoSyncInterval) {
                setTimeout(() => performAutoSync(), 2000);
            }
        }
    });
}
```

For specific troubleshooting scenarios, see `troubleshooting.md`.