# Plugin Architecture Documentation

This document provides a comprehensive overview of the Notion Sync Plugin's architecture, code organization, and design patterns.

## Architecture Overview

The plugin follows a **separation of concerns** architecture with distinct layers for UI, business logic, and data persistence. It integrates deeply with Super Productivity's plugin API while maintaining independence and modularity.

## File Structure

```
notion-sync-plugin/
├── manifest.json              # Plugin metadata and configuration
├── plugin.js                 # Main plugin logic and background operations
├── index.html                # User interface and configuration management
├── icon.svg                  # Plugin visual identifier
├── README.md                 # User documentation
├── CLAUDE.md                 # Developer guidance for AI assistance
└── docs/                     # Technical documentation
    ├── notion-database-structure.md
    ├── sync-workflow.md
    ├── plugin-architecture.md  # This file
    ├── configuration-guide.md
    └── troubleshooting.md
```

## Core Components

### 1. Plugin Entry Point (plugin.js)

**Purpose**: Main plugin logic handling all background operations and API integration

#### Key Responsibilities
- Plugin initialization and lifecycle management
- Auto-sync engine with configurable timers
- Manual sync header button registration
- Real-time task hooks (complete, update, delete)
- Bidirectional sync operations
- Configuration monitoring and persistence
- Error handling and user notifications

#### Architecture Patterns
```javascript
// Singleton pattern for plugin state
let pluginConfig = null;
let autoSyncTimer = null;
let lastSyncTime = 0;

// Configuration with defensive defaults
const DEFAULT_CONFIG = {
    apiKey: '',
    tasksDatabaseId: '',
    projectsDatabaseId: '',
    configured: false,
    enableLogging: true,
    autoSyncInterval: 0
};
```

#### Key Functions
- `initializePlugin()`: Main initialization entry point
- `performBidirectionalSync()`: Core sync engine
- `startAutoSync()` / `stopAutoSync()`: Timer management
- `registerManualSyncButton()`: Header button integration
- `registerTaskHooks()`: Real-time event handling

### 2. User Interface (index.html)

**Purpose**: Configuration interface and user interaction layer

#### Key Responsibilities
- Plugin configuration form with validation
- Real-time connection status indicators
- Auto-discovery of Notion databases
- Configuration import/export functionality
- Debug logging controls
- User feedback and error display

#### Architecture Patterns
```javascript
// Global state management
let pluginConfig = {
    apiKey: '',
    tasksDatabaseId: '',
    projectsDatabaseId: '',
    configured: false,
    enableLogging: true,
    autoSyncInterval: 0
};

// UI element references
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    apiKey: document.getElementById('apiKey'),
    // ... other form elements
};
```

#### UI Components
- **Configuration Form**: Input validation and saving
- **Status Indicators**: Real-time connection state
- **Discovery Tools**: Automatic database detection
- **Import/Export**: Configuration backup and restore
- **Logging Controls**: Debug mode toggle

### 3. Plugin Manifest (manifest.json)

**Purpose**: Plugin metadata and permission declarations

```json
{
  "id": "notion-sync-plugin",
  "name": "Notion Sync Plugin",
  "version": "1.0.0",
  "manifestVersion": 1,
  "minSupVersion": "14.0.0",
  "permissions": [
    "getTasks", "updateTask", "addTask",
    "getAllProjects", "addProject", "updateProject",
    "getAllTags", "addTag", "updateTag",
    "showSnack", "notify", "openDialog",
    "persistDataSynced", "loadSyncedData"
  ],
  "hooks": [
    "taskComplete", "taskUpdate", "taskDelete",
    "currentTaskChange"
  ]
}
```

## Design Patterns

### 1. Event-Driven Architecture

The plugin uses hooks and events to respond to changes in real-time:

```javascript
// Task completion hook
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, async (task) => {
    if (!pluginConfig.configured) return;
    await handleTaskCompletion(task);
});

// Configuration change monitoring
function startConfigurationMonitoring() {
    configMonitorTimer = setInterval(async () => {
        const currentConfig = await loadPluginData();
        if (configurationChanged(currentConfig)) {
            updateAutoSyncSettings();
        }
    }, 120000); // Check every 2 minutes
}
```

### 2. Data Persistence with Read-Modify-Write

Prevents data corruption through atomic operations:

```javascript
async function updateConfig(configUpdates) {
    // Read current data
    const currentData = await loadPluginData();

    // Modify specific section
    const updatedData = {
        ...currentData,
        config: { ...currentData.config, ...configUpdates },
        metadata: {
            ...currentData.metadata,
            lastModified: new Date().toISOString()
        }
    };

    // Write back atomically
    await PluginAPI.persistDataSynced(JSON.stringify(updatedData));
}
```

### 3. Rate Limiting and Debouncing

Protects against API abuse and improves performance:

```javascript
// Rate limiting for sync operations
const MIN_SYNC_INTERVAL = 5000; // 5 seconds

async function performAutoSync() {
    const now = Date.now();
    if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
        console.log('[Notion Sync] Rate limited, skipping sync');
        return;
    }

    lastSyncTime = now;
    // Proceed with sync...
}

// Debouncing for task updates
let updateTimeout;
PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, async (task) => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => syncSingleTask(task), 2000);
});
```

### 4. Error Boundary Pattern

Comprehensive error handling with graceful degradation:

```javascript
async function performSyncWithErrorHandling() {
    try {
        const results = await performBidirectionalSync();
        showSuccessNotification(results);
    } catch (error) {
        console.error('[Notion Sync] Sync failed:', error);

        // User notification
        PluginAPI.showSnack({
            msg: `Sync failed: ${error.message}`,
            type: 'ERROR'
        });

        // Don't crash - continue operation
        return null;
    }
}
```

### 5. Configuration Monitoring Pattern

Real-time configuration change detection:

```javascript
let lastConfigState = null;

function startConfigurationMonitoring() {
    setInterval(async () => {
        const currentConfig = await loadConfiguration();

        if (configurationChanged(lastConfigState, currentConfig)) {
            console.log('[Notion Sync] Configuration changed');

            // Update auto-sync settings
            if (currentConfig.autoSyncInterval !== lastConfigState?.autoSyncInterval) {
                stopAutoSync();
                if (currentConfig.autoSyncInterval > 0) {
                    startAutoSync();
                }
            }

            lastConfigState = { ...currentConfig };
        }
    }, 120000);
}
```

## Data Flow Architecture

### 1. Configuration Flow
```
User Input (index.html)
    ↓
Form Validation
    ↓
Persistent Data API (PluginAPI.persistDataSynced)
    ↓
Configuration Monitoring (plugin.js)
    ↓
Auto-sync State Updates
```

### 2. Sync Flow
```
Trigger (Manual/Auto/Hook)
    ↓
Configuration Validation
    ↓
API Connection Test
    ↓
Load SP Data (tasks/projects/tags)
    ↓
Load Notion Data (pages/databases)
    ↓
Bidirectional Comparison
    ↓
Data Transformation
    ↓
API Updates (SP ↔ Notion)
    ↓
Mapping Updates
    ↓
User Feedback
```

### 3. Error Flow
```
Error Detection
    ↓
Error Classification (Network/API/Data/Config)
    ↓
Retry Logic (if applicable)
    ↓
User Notification
    ↓
Graceful Degradation
    ↓
Logging (if enabled)
```

## API Integration Patterns

### 1. Super Productivity Plugin API

#### Configuration Persistence
```javascript
// Load configuration
const savedData = await PluginAPI.loadSyncedData();
const config = savedData ? JSON.parse(savedData) : defaultConfig;

// Save configuration
await PluginAPI.persistDataSynced(JSON.stringify(updatedData));
```

#### Task Management
```javascript
// Get all tasks
const allTasks = await PluginAPI.getTasks();
const archivedTasks = await PluginAPI.getArchivedTasks();

// Create/update tasks
await PluginAPI.addTask(newTask);
await PluginAPI.updateTask(taskId, updates);
```

#### User Feedback
```javascript
// Show notifications
PluginAPI.showSnack({
    msg: 'Operation completed',
    type: 'SUCCESS',  // SUCCESS, ERROR, WARNING, INFO
    ico: 'check_circle'
});
```

#### Header Integration
```javascript
// Register header button
PluginAPI.registerHeaderButton({
    label: 'Sync Notion',
    icon: 'sync',
    onClick: async () => {
        await performManualSync();
    }
});
```

### 2. Notion API Integration

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
        const errorText = await response.text();
        throw new Error(`Notion API error (${response.status}): ${errorText}`);
    }

    return response.json();
}
```

#### Database Operations
```javascript
// Query database
const pages = await notionRequest(`databases/${databaseId}/query`, 'POST', {
    page_size: 100,
    start_cursor: cursor
});

// Create page
const newPage = await notionRequest('pages', 'POST', {
    parent: { database_id: databaseId },
    properties: notionProperties
});

// Update page
await notionRequest(`pages/${pageId}`, 'PATCH', {
    properties: updatedProperties
});
```

## State Management

### 1. Plugin State
```javascript
// Global plugin state
let pluginConfig = null;        // Current configuration
let autoSyncTimer = null;       // Auto-sync timer reference
let lastSyncTime = 0;          // Last sync timestamp
let syncMappings = new Map();   // Task ID mappings
let configMonitorTimer = null;  // Config monitoring timer
```

### 2. Configuration State
```javascript
// Persistent configuration structure
const configData = {
    version: '1.0.0',
    config: {
        apiKey: '',
        tasksDatabaseId: '',
        projectsDatabaseId: '',
        configured: false,
        enableLogging: true,
        autoSyncInterval: 0
    },
    mappings: {
        tasks: {},      // SP task ID → Notion page ID
        projects: {},   // SP project ID → Notion page ID
        tags: {}        // SP tag ID → Notion option
    },
    metadata: {
        lastSyncTime: 0,
        lastModified: '',
        syncCount: 0
    }
};
```

### 3. UI State
```javascript
// UI state management
function updateUI() {
    const isConfigured = pluginConfig.configured;

    // Update status indicators
    elements.connectionStatus.textContent = isConfigured ? 'Connected' : 'Not Configured';
    elements.connectionStatus.className = `status-indicator ${isConfigured ? 'status-connected' : 'status-disconnected'}`;

    // Update form values
    elements.apiKey.value = pluginConfig.apiKey || '';
    elements.tasksDatabaseId.value = pluginConfig.tasksDatabaseId || '';

    // Enable/disable controls
    elements.testConnectionBtn.disabled = !isConfigured;
}
```

## Performance Optimization

### 1. Lazy Loading
```javascript
// Load sync functions only when needed
let syncFunctions = null;

async function getSyncFunctions() {
    if (!syncFunctions) {
        // Dynamic import or initialization
        syncFunctions = await initializeSyncFunctions();
    }
    return syncFunctions;
}
```

### 2. Batching Operations
```javascript
// Batch API requests
async function batchUpdateTasks(tasks) {
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(task => updateTask(task))
        );
        results.push(...batchResults);
    }

    return results;
}
```

### 3. Caching Strategy
```javascript
// Cache frequently accessed data
const cache = new Map();

async function getCachedData(key, fetchFunction, ttl = 300000) {
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
    }

    const data = await fetchFunction();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
}
```

## Security Considerations

### 1. API Key Protection
```javascript
// Never log API keys
function sanitizeForLogging(data) {
    if (typeof data === 'object') {
        const sanitized = { ...data };
        if (sanitized.apiKey) {
            sanitized.apiKey = '[REDACTED]';
        }
        return sanitized;
    }
    return data;
}

// Validate API key format
function validateApiKey(key) {
    return typeof key === 'string' && key.startsWith('ntn_');
}
```

### 2. Input Validation
```javascript
// Sanitize user inputs
function sanitizeInput(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
}

// Validate UUID format
function validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
```

### 3. Permission Handling
```javascript
// Check permissions before operations
function hasPermission(permission) {
    return PluginAPI.permissions && PluginAPI.permissions.includes(permission);
}

async function safeTaskOperation(operation, ...args) {
    if (!hasPermission('updateTask')) {
        throw new Error('Insufficient permissions for task operations');
    }

    return await operation(...args);
}
```

## Testing Strategy

### 1. Unit Testing Approach
```javascript
// Testable function structure
function createNotionProperties(task) {
    const properties = {};

    if (task.title) {
        properties.Name = { title: [{ text: { content: task.title } }] };
    }

    return properties;
}

// Test
function testCreateNotionProperties() {
    const task = { title: 'Test Task' };
    const props = createNotionProperties(task);

    console.assert(props.Name.title[0].text.content === 'Test Task');
}
```

### 2. Integration Testing
```javascript
// Test full sync workflow
async function testFullSyncWorkflow() {
    // Setup test data
    const testTask = await PluginAPI.addTask({
        title: 'Test Sync Task',
        notes: 'Testing bidirectional sync'
    });

    // Perform sync
    const results = await performBidirectionalSync();

    // Verify results
    console.assert(results.spToNotionCreates === 1);

    // Cleanup
    await PluginAPI.removeTask(testTask.id);
}
```

### 3. Error Testing
```javascript
// Test error handling
async function testErrorHandling() {
    // Test with invalid API key
    const originalKey = pluginConfig.apiKey;
    pluginConfig.apiKey = 'invalid-key';

    try {
        await performBidirectionalSync();
        console.error('Should have thrown error');
    } catch (error) {
        console.assert(error.message.includes('API error'));
    } finally {
        pluginConfig.apiKey = originalKey;
    }
}
```

## Deployment Considerations

### 1. Version Management
```javascript
// Version compatibility check
function checkCompatibility() {
    const currentVersion = PluginAPI.version;
    const minRequired = '14.0.0';

    if (compareVersions(currentVersion, minRequired) < 0) {
        throw new Error(`Requires Super Productivity ${minRequired} or higher`);
    }
}
```

### 2. Migration Handling
```javascript
// Handle data migrations
async function migrateData(oldVersion, newVersion) {
    const data = await loadPluginData();

    if (oldVersion < '1.1.0') {
        // Migrate old format to new format
        data.config = migrateConfigFormat(data.config);
    }

    data.version = newVersion;
    await savePluginData(data);
}
```

### 3. Rollback Strategy
```javascript
// Backup before major operations
async function backupConfiguration() {
    const data = await loadPluginData();
    const backup = {
        ...data,
        backupDate: new Date().toISOString()
    };

    localStorage.setItem('notion-sync-backup', JSON.stringify(backup));
}
```

## Future Architecture Improvements

### 1. Modular Structure
- Split large functions into focused modules
- Implement dependency injection for better testing
- Create service layer for API interactions

### 2. TypeScript Migration
- Add type safety for better development experience
- Define interfaces for data structures
- Improve IDE support and error detection

### 3. Event System Enhancement
- Implement custom event system for internal communication
- Add event queuing for offline scenarios
- Create event replay for debugging

### 4. Performance Monitoring
- Add performance metrics collection
- Implement timing and memory usage tracking
- Create performance dashboard for optimization

This architecture provides a solid foundation for the plugin while maintaining flexibility for future enhancements and scalability.