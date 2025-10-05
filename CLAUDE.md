# CLAUDE.md - Notion Sync Plugin

This file provides guidance to Claude Code when working with the Notion Sync Plugin for Super Productivity.

## Project Overview

The Notion Sync Plugin enables bidirectional synchronization between Super Productivity tasks and Notion databases. It's currently in **alpha testing phase** with a focus on stability, user experience, and comprehensive error handling.

## Architecture Overview

### Core Components

1. **plugin.js**: Main plugin entry point handling all background operations
   - Plugin initialization and configuration management
   - Auto-sync engine with configurable intervals (5min-2hr)
   - Manual sync header button registration
   - Task hooks (complete, update, delete) for real-time sync
   - App lifecycle hooks (finish day, window focus)
   - Comprehensive sync operations and API integration
   - Configuration monitoring with state tracking

2. **index.html**: User interface for configuration and monitoring
   - Clean, responsive configuration form
   - Real-time connection status indicators
   - Auto-discovery of Notion databases
   - Configuration import/export functionality
   - Logging controls and debug interface

3. **manifest.json**: Plugin metadata defining permissions and hooks
   - Required permissions for task/project/tag operations
   - Hooks for real-time sync triggers
   - Super Productivity v14.0.0+ compatibility

### Key Features Implementation

#### Auto-Sync Engine
- Configurable intervals: Never, 5min, 10min, 15min, 30min, 1hr, 2hr
- Rate limiting with 5-second minimum between syncs
- Configuration monitoring to start/stop based on settings
- Graceful handling of network issues and API limits

#### Manual Sync System
- Header button using `PluginAPI.registerHeaderButton()`
- Immediate sync with progress feedback via `PluginAPI.showSnack()`
- Rate limiting to prevent rapid-fire requests
- Comprehensive error handling and user notifications

#### Data Persistence
- Uses Super Productivity's `persistDataSynced`/`loadSyncedData` API
- Structured data with versioning and metadata
- Read-modify-write pattern to prevent data corruption
- Automatic configuration synchronization between UI and background

#### Database Discovery
- Automatic discovery of Notion databases by title patterns
- Schema validation to ensure compatibility
- Support for tasks and projects databases
- User feedback about discovery results

## Development Guidelines

### Code Style and Patterns

1. **Modern JavaScript**: Use ES6+ features (async/await, arrow functions, destructuring)
2. **Error Handling**: Always wrap API calls in try-catch with user feedback
3. **Logging**: Use consistent logging patterns with debug mode support
4. **Rate Limiting**: Respect API limits with built-in delays and checks
5. **User Feedback**: Provide clear status updates via `PluginAPI.showSnack()`

### Plugin API Integration

#### Configuration Management
```javascript
// Always load fresh data first
const currentData = await PluginAPI.loadSyncedData();
const parsedData = JSON.parse(currentData);

// Update specific sections
const updatedData = {
    ...parsedData,
    config: { ...parsedData.config, ...configUpdates }
};

// Save back
await PluginAPI.persistDataSynced(JSON.stringify(updatedData));
```

#### Header Button Registration
```javascript
PluginAPI.registerHeaderButton({
    label: 'Sync Notion',
    icon: 'sync',
    onClick: async () => {
        await performManualSync();
    }
});
```

#### Hook Registration
```javascript
// Task completion hook for real-time sync
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, async (task) => {
    if (pluginConfig.configured) {
        await handleTaskCompletion(task);
    }
});
```

### Auto-Sync Implementation

#### Timer Management
```javascript
function startAutoSync() {
    if (!pluginConfig.configured || pluginConfig.autoSyncInterval <= 0) {
        return; // Don't start if not configured or disabled
    }

    stopAutoSync(); // Clear existing timer

    let intervalMs = pluginConfig.autoSyncInterval * 60 * 1000;
    if (intervalMs < 60000) intervalMs = 60000; // 1-minute minimum

    autoSyncTimer = setInterval(async () => {
        if (pluginConfig.configured && pluginConfig.autoSyncInterval > 0) {
            await performAutoSync();
        }
    }, intervalMs);
}
```

#### Rate Limiting
```javascript
async function performAutoSync() {
    // Multiple validation layers
    if (!pluginConfig.configured) return;
    if (pluginConfig.autoSyncInterval <= 0) return;

    // Prevent too frequent syncs
    const now = Date.now();
    if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
        console.log('[Notion Sync] Rate limited, skipping auto-sync');
        return;
    }

    // Proceed with sync...
}
```

### Notion API Integration

#### Request Helper Pattern
```javascript
async function notionRequest(endpoint, method = 'GET', body = null) {
    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
        method,
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
        throw new Error(`Notion API error: ${response.status}`);
    }

    return response.json();
}
```

#### Database Schema Validation
```javascript
async function verifyTasksDatabase(apiKey, databaseId) {
    try {
        const db = await notionRequest(`databases/${databaseId}`);
        const props = db.properties || {};

        // Check required properties
        const hasName = props['Name']?.type === 'title';
        const hasSpTaskId = props['SP Task ID']?.type === 'rich_text';
        const hasComplete = props['Complete']?.type === 'checkbox';

        return hasName && hasSpTaskId && hasComplete;
    } catch (error) {
        return false;
    }
}
```

### Data Mapping Patterns

#### SP Task to Notion Properties
```javascript
function spTaskToNotionProperties(task) {
    const properties = {};

    // Required mappings
    if (task.title) {
        properties['Name'] = {
            title: [{ text: { content: task.title } }]
        };
    }

    // Optional mappings with null checks
    if (task.notes) {
        properties['Notes'] = {
            rich_text: [{ text: { content: task.notes } }]
        };
    }

    // Boolean mappings
    properties['Complete'] = {
        checkbox: task.isDone || false
    };

    // Time conversions (ms to hours)
    if (task.timeEstimate) {
        properties['Time Estimate'] = {
            number: Math.round(task.timeEstimate / 3600000 * 100) / 100
        };
    }

    return properties;
}
```

### Error Handling Patterns

#### Comprehensive Error Catching
```javascript
async function performSync() {
    try {
        // Sync operations...

        PluginAPI.showSnack({
            msg: 'Sync completed successfully!',
            type: 'SUCCESS',
            ico: 'check_circle'
        });

    } catch (error) {
        console.error('[Notion Sync] Sync failed:', error);

        PluginAPI.showSnack({
            msg: `Sync failed: ${error.message}`,
            type: 'ERROR'
        });

        // Don't throw - handle gracefully
    }
}
```

#### Network Error Handling
```javascript
async function handleNetworkError(error, operation) {
    if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.log('[Notion Sync] Rate limited, will retry later');
        return { retry: true, delay: 60000 }; // Wait 1 minute
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
        console.log('[Notion Sync] Network error, check connection');
        return { retry: true, delay: 30000 }; // Wait 30 seconds
    }

    // Other errors - don't retry
    return { retry: false };
}
```

### UI Implementation Guidelines

#### Responsive Design
- Use CSS Grid and Flexbox for layout
- Mobile-first approach with proper viewport handling
- Consistent spacing using CSS custom properties
- Material Design inspired components

#### Form Validation
```javascript
// Client-side validation before API calls
function validateConfiguration() {
    const apiKey = elements.apiKey.value.trim();
    const tasksDatabaseId = elements.tasksDatabaseId.value.trim();

    if (!apiKey.startsWith('ntn_')) {
        throw new Error('API Key should start with "ntn_"');
    }

    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    if (tasksDatabaseId && !uuidRegex.test(tasksDatabaseId)) {
        throw new Error('Invalid Database ID format. Should be a UUID.');
    }
}
```

#### Status Updates
```javascript
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');

    if (isConnected) {
        statusElement.textContent = 'Connected';
        statusElement.className = 'status-indicator status-connected';
    } else {
        statusElement.textContent = 'Not Connected';
        statusElement.className = 'status-indicator status-disconnected';
    }
}
```

## Testing and Debugging

### Debug Mode
Enable comprehensive logging by setting `enableLogging: true` in configuration:
```javascript
function log(message, type = 'info') {
    if (pluginConfig.enableLogging) {
        console.log(`[Notion Sync] ${message}`);
    }
}
```

### Common Debug Scenarios
1. **Configuration Issues**: Check persistent data structure and API availability
2. **Sync Failures**: Enable logging and check network requests
3. **Timer Issues**: Monitor auto-sync interval settings and rate limiting
4. **Data Mapping**: Verify property types and null handling

### Performance Monitoring
```javascript
async function performSyncWithTiming() {
    const startTime = Date.now();

    try {
        const results = await performBidirectionalSync();
        const duration = Date.now() - startTime;

        console.log(`[Notion Sync] Sync completed in ${duration}ms`);
        console.log(`[Notion Sync] Results:`, results);

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Notion Sync] Sync failed after ${duration}ms:`, error);
    }
}
```

## Security Considerations

### API Key Handling
- Never log API keys in console output
- Store keys securely using Super Productivity's persistence API
- Validate key format before making API calls
- Provide clear error messages without exposing keys

### Data Privacy
- All data remains between user's SP instance and their Notion workspace
- No third-party data transmission or storage
- Respect user's data deletion requests
- Use HTTPS for all API communication

### Input Validation
```javascript
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    // Basic sanitization
    return input.trim().slice(0, 1000); // Limit length
}

function validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
```

## Future Development

### Planned Enhancements
1. **Subtask Support**: Handle nested task relationships
2. **Multiple Databases**: Support for multiple Notion databases
3. **Advanced Conflict Resolution**: More sophisticated merge strategies
4. **Real-time Sync**: WebSocket/webhook integration
5. **Performance Optimization**: Batch operations and caching

### Architecture Improvements
1. **Modular Structure**: Split large functions into focused modules
2. **Type Safety**: Consider TypeScript migration for better type checking
3. **Test Coverage**: Add automated testing for critical functions
4. **Documentation**: API documentation for sync functions

### Plugin API Evolution
- Monitor Super Productivity plugin API updates
- Adopt new hooks and permissions as they become available
- Maintain backward compatibility with older SP versions
- Consider performance improvements in data persistence

## Troubleshooting Common Development Issues

### PluginAPI Timing
```javascript
// Always wait for PluginAPI to be available
function waitForPluginAPI() {
    return new Promise((resolve) => {
        if (typeof PluginAPI !== 'undefined') {
            resolve();
            return;
        }

        const checkInterval = setInterval(() => {
            if (typeof PluginAPI !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkInterval);
            resolve(); // Resolve anyway after timeout
        }, 10000);
    });
}
```

### Configuration Persistence
```javascript
// Always use read-modify-write pattern
async function updateConfigSafely(updates) {
    const currentData = await PluginAPI.loadSyncedData();
    const parsedData = currentData ? JSON.parse(currentData) : createDefaultData();

    const updatedData = {
        ...parsedData,
        config: { ...parsedData.config, ...updates },
        metadata: {
            ...parsedData.metadata,
            lastModified: new Date().toISOString()
        }
    };

    await PluginAPI.persistDataSynced(JSON.stringify(updatedData));
}
```

### Rate Limiting Management
```javascript
// Implement exponential backoff for API errors
async function retryWithBackoff(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;

            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            console.log(`[Notion Sync] Retry ${attempt} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

## Documentation Standards

### Code Comments
- Document complex business logic and data transformations
- Explain non-obvious API interactions
- Provide examples for reusable functions
- Keep comments up-to-date with code changes

### Logging Standards
```javascript
// Consistent logging format
function log(message, level = 'info', context = null) {
    if (!pluginConfig.enableLogging) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (context) {
        console.log(logMessage, context);
    } else {
        console.log(logMessage);
    }
}
```

### User Documentation
- Keep README.md updated with new features
- Provide clear setup instructions
- Include troubleshooting guides
- Document breaking changes and migration paths

---

**Important**: This plugin is in alpha development. Focus on stability, error handling, and user experience. All changes should be thoroughly tested and documented.