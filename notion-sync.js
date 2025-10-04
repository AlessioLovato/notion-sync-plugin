// Notion Sync Plugin - Main JavaScript Module
// This file contains all the JavaScript logic for the Notion Sync Plugin

// Global state
let pluginConfig = {
    apiKey: '',
    tasksDatabaseId: '',
    projectsDatabaseId: '',
    configured: false,
    enableLogging: true
};

// UI Elements
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    apiKey: document.getElementById('apiKey'),
    tasksDatabaseId: document.getElementById('tasksDatabaseId'),
    projectsDatabaseId: document.getElementById('projectsDatabaseId'),
    saveConfigBtn: document.getElementById('saveConfigBtn'),
    discoverDbBtn: document.getElementById('discoverDbBtn'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    manualSyncBtn: document.getElementById('manualSyncBtn'),
    exportConfigBtn: document.getElementById('exportConfigBtn'),
    importConfigBtn: document.getElementById('importConfigBtn'),
    importConfigFile: document.getElementById('importConfigFile'),
    enableLogging: document.getElementById('enableLogging'),
    logCard: document.getElementById('logCard'),
    syncLog: document.getElementById('syncLog'),
    clearLogBtn: document.getElementById('clearLogBtn')
};

// Logging function
function log(message, type = 'info') {
    if (!pluginConfig.enableLogging) return; // Skip logging if disabled

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}\n`;
    elements.syncLog.textContent += logEntry;
    elements.syncLog.scrollTop = elements.syncLog.scrollHeight;
    console.log(`[Notion Plugin] ${message}`);
}

// Update UI state
function updateUI() {
    const isConfigured = pluginConfig.apiKey && pluginConfig.tasksDatabaseId && pluginConfig.configured;

    // Update connection status
    if (isConfigured) {
        elements.connectionStatus.textContent = 'Configured';
        elements.connectionStatus.className = 'status-indicator status-connected';
    } else {
        elements.connectionStatus.textContent = 'Not Configured';
        elements.connectionStatus.className = 'status-indicator status-disconnected';
    }

    // Update form values
    elements.apiKey.value = pluginConfig.apiKey || '';
    elements.tasksDatabaseId.value = pluginConfig.tasksDatabaseId || '';
    elements.projectsDatabaseId.value = pluginConfig.projectsDatabaseId || '';
    elements.enableLogging.checked = pluginConfig.enableLogging;

    // Show/hide log card based on logging setting
    elements.logCard.style.display = pluginConfig.enableLogging ? 'block' : 'none';

    // Enable/disable buttons
    elements.discoverDbBtn.disabled = !pluginConfig.apiKey;
    elements.testConnectionBtn.disabled = !(pluginConfig.apiKey && pluginConfig.tasksDatabaseId);
    elements.manualSyncBtn.disabled = !isConfigured;
}

// Load configuration from Plugin API
async function loadConfiguration() {
    try {
        log('Loading configuration from Plugin API...');
        await initializePluginData();
        updateUI();
    } catch (error) {
        log(`Failed to load configuration: ${error.message}`, 'error');
        pluginConfig = {
            apiKey: '',
            tasksDatabaseId: '',
            projectsDatabaseId: '',
            configured: false,
            enableLogging: true
        };
        updateUI();
    }
}

// Save configuration to Plugin API
async function saveConfiguration() {
    try {
        log('Saving configuration...');

        const apiKey = elements.apiKey.value.trim();
        const tasksDatabaseId = elements.tasksDatabaseId.value.trim();
        const projectsDatabaseId = elements.projectsDatabaseId.value.trim();
        const enableLogging = elements.enableLogging.checked;

        if (!apiKey) {
            throw new Error('API Key is required');
        }

        // Validate API key format
        if (!apiKey.startsWith('ntn_')) {
            throw new Error('API Key should start with "ntn_"');
        }

        // Validate database ID format if provided (UUID with or without hyphens)
        const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
        if (tasksDatabaseId && !uuidRegex.test(tasksDatabaseId)) {
            throw new Error('Invalid Tasks Database ID format. Should be a UUID.');
        }
        if (projectsDatabaseId && !uuidRegex.test(projectsDatabaseId)) {
            throw new Error('Invalid Projects Database ID format. Should be a UUID.');
        }

        // Update configuration
        pluginConfig = {
            apiKey: apiKey,
            tasksDatabaseId: tasksDatabaseId || '',
            projectsDatabaseId: projectsDatabaseId || '',
            enableLogging: enableLogging,
            configured: !!(apiKey && tasksDatabaseId) // Only configured if both API key and tasks DB are present
        };

        // Save to Plugin API using optimized persistence
        await updateConfig(pluginConfig);
        log('Configuration saved to Plugin API successfully');

        updateUI();
        log('Configuration saved successfully');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: 'Configuration saved successfully!',
                type: 'SUCCESS'
            });
        }

    } catch (error) {
        log(`Failed to save configuration: ${error.message}`, 'error');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: `Save failed: ${error.message}`,
                type: 'ERROR'
            });
        }
    }
}

// Toggle logging function
async function toggleLogging() {
    pluginConfig.enableLogging = elements.enableLogging.checked;

    // Update UI immediately
    elements.logCard.style.display = pluginConfig.enableLogging ? 'block' : 'none';

    // Save configuration
    try {
        await updateConfig({ enableLogging: pluginConfig.enableLogging });
    } catch (error) {
        log(`Failed to save logging preference: ${error.message}`, 'error');
    }

    // Log the change (will only show if logging is enabled)
    log(`Logging ${pluginConfig.enableLogging ? 'enabled' : 'disabled'}`);
}

// Core connection test function (returns boolean)
async function testNotionConnection() {
    if (!pluginConfig.apiKey || !pluginConfig.tasksDatabaseId) {
        return false;
    }

    try {
        // Test connection by getting database info
        const response = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.tasksDatabaseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${pluginConfig.apiKey}`,
                'Notion-Version': '2022-06-28'
            }
        });

        return response.ok;
    } catch (error) {
        return false;
    }
}

// Test connection to Notion (UI function)
async function testConnection() {
    try {
        elements.testConnectionBtn.disabled = true;
        elements.testConnectionBtn.textContent = 'Testing...';

        log('Testing Notion connection...');

        if (!pluginConfig.apiKey || !pluginConfig.tasksDatabaseId) {
            throw new Error('API Key and Database ID are required');
        }

        // Test connection by getting database info
        const response = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.tasksDatabaseId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${pluginConfig.apiKey}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API Error (${response.status}): ${errorData}`);
        }

        const dbData = await response.json();

        // Update configuration state
        pluginConfig.configured = true;
        saveConfiguration();

        elements.connectionStatus.textContent = 'Connected';
        elements.connectionStatus.className = 'status-indicator status-connected';

        log('Connection test successful!');
        log(`Database: ${dbData.title?.[0]?.plain_text || 'Unknown'}`);

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: 'Connection test successful!',
                type: 'SUCCESS'
            });
        }

        // Update UI state after successful connection
        updateUI();

    } catch (error) {
        elements.connectionStatus.textContent = 'Connection Failed';
        elements.connectionStatus.className = 'status-indicator status-disconnected';

        log(`Connection test failed: ${error.message}`, 'error');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: `Connection failed: ${error.message}`,
                type: 'ERROR'
            });
        }
    } finally {
        elements.testConnectionBtn.disabled = false;
        elements.testConnectionBtn.textContent = 'Test Connection';
    }
}

// Manual database discovery (UI function)
async function discoverDatabases() {
    try {
        elements.discoverDbBtn.disabled = true;
        elements.discoverDbBtn.textContent = 'Discovering...';

        log('Starting manual database discovery...');

        if (!pluginConfig.apiKey) {
            throw new Error('API Key is required');
        }

        // Save current API key first
        pluginConfig.apiKey = elements.apiKey.value.trim();

        // Trigger database discovery
        await initializeDatabaseIds();

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: 'Database discovery completed! Check the log for results.',
                type: 'SUCCESS'
            });
        }

    } catch (error) {
        log(`Database discovery failed: ${error.message}`, 'error');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: `Discovery failed: ${error.message}`,
                type: 'ERROR'
            });
        }
    } finally {
        elements.discoverDbBtn.disabled = !pluginConfig.apiKey;
        elements.discoverDbBtn.textContent = 'Discover Databases';
    }
}

// ===== DATABASE DISCOVERY FUNCTIONS =====

// Search for databases by title
async function searchNotionDatabases(apiKey) {
    try {
        log('Searching for Notion databases...');

        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    value: 'database',
                    property: 'object'
                },
                page_size: 100
            })
        });

        if (!response.ok) {
            throw new Error(`Search API error: ${response.status}`);
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        log(`Database search failed: ${error.message}`, 'error');
        return [];
    }
}

// Automatically discover database IDs by searching for common names
async function discoverDatabaseIds(apiKey) {
    log('=== Auto-discovering Database IDs ===');

    const databases = await searchNotionDatabases(apiKey);
    const discoveries = {};

    log(`Found ${databases.length} databases. Searching for tasks and projects databases...`);

    // Search patterns for different database types
    const searchPatterns = {
        tasks: ['task', 'todo', 'to-do', 'activity', 'action', 'item'],
        projects: ['project', 'projects']
    };

    for (const db of databases) {
        const title = db.title?.[0]?.plain_text?.toLowerCase() || '';
        const dbId = db.id;

        log(`Checking database: "${title}" (${dbId})`);

        // Check for tasks database
        if (!discoveries.tasks && searchPatterns.tasks.some(pattern => title.includes(pattern))) {
            // Verify it has expected fields
            const hasRequiredFields = await verifyTasksDatabase(apiKey, dbId);
            if (hasRequiredFields) {
                discoveries.tasks = dbId;
                log(`✅ Found Tasks database: "${title}" (${dbId})`);
            }
        }

        // Check for projects database
        if (!discoveries.projects && searchPatterns.projects.some(pattern => title.includes(pattern))) {
            // Verify it has expected fields
            const hasRequiredFields = await verifyProjectsDatabase(apiKey, dbId);
            if (hasRequiredFields) {
                discoveries.projects = dbId;
                log(`✅ Found Projects database: "${title}" (${dbId})`);
            }
        }
    }

    return discoveries;
}

// Verify that a database has the expected structure for tasks
async function verifyTasksDatabase(apiKey, databaseId) {
    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!response.ok) return false;

        const db = await response.json();
        const props = db.properties || {};

        // Check for required fields
        const hasName = props['Name']?.type === 'title';
        const hasSpTaskId = props['SP Task ID']?.type === 'rich_text';
        const hasStatus = props['Status']?.type === 'status';

        return hasName && hasSpTaskId && hasStatus;
    } catch (error) {
        return false;
    }
}

// Verify that a database has the expected structure for projects
async function verifyProjectsDatabase(apiKey, databaseId) {
    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!response.ok) return false;

        const db = await response.json();
        const props = db.properties || {};

        // Check for required fields (simpler than tasks database)
        const hasName = props['Name']?.type === 'title';

        return hasName;
    } catch (error) {
        return false;
    }
}

// Initialize database IDs (auto-discover if missing)
async function initializeDatabaseIds() {
    if (!pluginConfig.apiKey) {
        log('No API key available for database discovery');
        return;
    }

    let needsDiscovery = false;
    let needsSave = false;
    let discoveryResults = [];

    // Check if Tasks Database ID is missing
    if (!pluginConfig.tasksDatabaseId) {
        log('Tasks Database ID not configured, will attempt auto-discovery');
        needsDiscovery = true;
    }

    // Check if Projects Database ID is missing
    if (!pluginConfig.projectsDatabaseId) {
        log('Projects Database ID not configured, will attempt auto-discovery');
        needsDiscovery = true;
    }

    if (needsDiscovery) {
        const discoveries = await discoverDatabaseIds(pluginConfig.apiKey);

        if (discoveries.tasks && !pluginConfig.tasksDatabaseId) {
            pluginConfig.tasksDatabaseId = discoveries.tasks;
            elements.tasksDatabaseId.value = discoveries.tasks;
            log(`✅ Auto-discovered Tasks Database ID: ${discoveries.tasks}`);
            discoveryResults.push('Tasks database found');
            needsSave = true;
        } else if (!discoveries.tasks && !pluginConfig.tasksDatabaseId) {
            log('⚠️ Tasks database not found - please enter manually');
            discoveryResults.push('Tasks database NOT found - please enter manually');
        }

        if (discoveries.projects && !pluginConfig.projectsDatabaseId) {
            pluginConfig.projectsDatabaseId = discoveries.projects;
            elements.projectsDatabaseId.value = discoveries.projects;
            log(`✅ Auto-discovered Projects Database ID: ${discoveries.projects}`);
            discoveryResults.push('Projects database found');
            needsSave = true;
        } else if (!discoveries.projects && !pluginConfig.projectsDatabaseId) {
            log('⚠️ Projects database not found - please enter manually');
            discoveryResults.push('Projects database NOT found - please enter manually');
        }

        // Update configuration to mark as configured if tasks DB is available
        pluginConfig.configured = !!(pluginConfig.apiKey && pluginConfig.tasksDatabaseId);

        if (needsSave) {
            // Save configuration automatically after discovery
            try {
                await updateConfig(pluginConfig);
                log('Configuration auto-saved after database discovery');
            } catch (error) {
                log(`Failed to auto-save configuration: ${error.message}`, 'error');
            }
            updateUI();
        }

        // Show user feedback about discovery results
        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            const message = discoveryResults.join('. ');
            const hasSuccess = discoveryResults.some(r => r.includes('found') && !r.includes('NOT'));
            const hasFailure = discoveryResults.some(r => r.includes('NOT found'));

            PluginAPI.showSnack({
                msg: `Database discovery: ${message}`,
                type: hasFailure ? (hasSuccess ? 'WARNING' : 'ERROR') : 'SUCCESS'
            });
        }

        // Log final status for user
        if (!pluginConfig.tasksDatabaseId) {
            log('❌ Tasks Database ID still missing - plugin cannot function without it');
        }
        if (!pluginConfig.projectsDatabaseId) {
            log('⚠️ Projects Database ID missing - project sync will be disabled');
        }
    } else {
        log('All database IDs already configured');
    }
}

// ===== END DATABASE DISCOVERY FUNCTIONS =====


// Sync mappings stored in Plugin API (optimized)
async function saveSyncMappings() {
    try {
        const mappingsData = {};
        for (const [spTaskId, notionPageId] of syncMappings.entries()) {
            mappingsData[spTaskId] = notionPageId;
        }
        await updateTaskMappings(mappingsData);
    } catch (error) {
        log(`Failed to save sync mappings: ${error.message}`, 'error');
    }
}

async function loadSyncMappings() {
    // Mappings will be loaded as part of loadConfiguration()
    // This function is kept for compatibility but does nothing now
}

// ===== STRUCTURED DATA PERSISTENCE MANAGER =====

/**
 * Notion Sync Plugin Data Structure
 * This defines the complete data model for our plugin
 */
const PLUGIN_DATA_VERSION = '1.0.0';

function createDefaultPluginData() {
    return {
        version: PLUGIN_DATA_VERSION,
        config: {
            apiKey: '',
            tasksDatabaseId: '',
            projectsDatabaseId: '',
            configured: false,
            enableLogging: true
        },
        mappings: {
            tasks: {}, // spTaskId -> notionPageId
            projects: {} // spProjectId -> notionProjectId (for future use)
        },
        metadata: {
            lastSyncTime: null,
            totalSyncs: 0,
            lastModified: new Date().toISOString()
        }
    };
}

/**
 * Load current plugin data with read-modify-write pattern
 * Always loads fresh data from the API to avoid conflicts
 */
async function loadPluginData() {
    try {
        if (typeof PluginAPI === 'undefined' || !PluginAPI.loadSyncedData) {
            log('Plugin API not available, using defaults');
            return createDefaultPluginData();
        }

        const savedData = await PluginAPI.loadSyncedData();
        if (!savedData) {
            log('No saved data found, creating defaults');
            return createDefaultPluginData();
        }

        const parsed = JSON.parse(savedData);

        // Handle versioned data format
        if (parsed.version === PLUGIN_DATA_VERSION) {
            log(`Loaded plugin data v${parsed.version}`);
            return parsed;
        }

        // Handle migration from old formats
        return migrateOldData(parsed);

    } catch (error) {
        log(`Failed to load plugin data: ${error.message}`, 'error');
        return createDefaultPluginData();
    }
}

/**
 * Save plugin data with read-modify-write pattern
 * Always loads current data first, then updates specific sections
 */
async function savePluginData(updates = {}) {
    try {
        if (typeof PluginAPI === 'undefined' || !PluginAPI.persistDataSynced) {
            log('Plugin API not available, cannot save data', 'warning');
            return false;
        }

        // Always load fresh data first (read)
        const currentData = await loadPluginData();

        // Apply updates (modify)
        const updatedData = {
            ...currentData,
            ...updates,
            metadata: {
                ...currentData.metadata,
                lastModified: new Date().toISOString(),
                ...(updates.metadata || {})
            }
        };

        // Save back (write)
        await PluginAPI.persistDataSynced(JSON.stringify(updatedData));
        log('Plugin data saved successfully');
        return true;

    } catch (error) {
        log(`Failed to save plugin data: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Update only the configuration section
 */
async function updateConfig(configUpdates) {
    const currentData = await loadPluginData();
    return await savePluginData({
        config: {
            ...currentData.config,
            ...configUpdates
        }
    });
}

/**
 * Update only the task mappings section
 */
async function updateTaskMappings(taskMappingUpdates) {
    const currentData = await loadPluginData();
    return await savePluginData({
        mappings: {
            ...currentData.mappings,
            tasks: {
                ...currentData.mappings.tasks,
                ...taskMappingUpdates
            }
        }
    });
}

/**
 * Migrate data from old formats to new structure
 */
function migrateOldData(oldData) {
    log('Migrating data to new format...');

    const newData = createDefaultPluginData();

    // Handle old format (just config)
    if (oldData.apiKey) {
        newData.config = {
            ...newData.config,
            ...oldData
        };
        log('Migrated old config format');
    }
    // Handle intermediate format (config + mappings)
    else if (oldData.config && oldData.mappings) {
        newData.config = { ...newData.config, ...oldData.config };
        newData.mappings.tasks = oldData.mappings || {};
        log('Migrated intermediate format');
    }

    return newData;
}

/**
 * Initialize plugin data and sync with global state
 */
async function initializePluginData() {
    const data = await loadPluginData();

    // Update global variables
    pluginConfig = data.config;

    // Update sync mappings
    syncMappings.clear();
    for (const [spTaskId, notionPageId] of Object.entries(data.mappings.tasks)) {
        syncMappings.set(spTaskId, notionPageId);
    }

    log(`Initialized plugin data - ${Object.keys(data.mappings.tasks).length} task mappings loaded`);
    return true;
}

/**
 * Update sync metadata (last sync time, total syncs, etc.)
 */
async function updateSyncMetadata(metadataUpdates) {
    const currentData = await loadPluginData();
    return await savePluginData({
        metadata: {
            ...currentData.metadata,
            ...metadataUpdates,
            lastModified: new Date().toISOString()
        }
    });
}

// Initialize sync mappings
const syncMappings = new Map();

// New simplified bidirectional sync function
async function performBidirectionalSync() {
    if (!pluginConfig.apiKey || !pluginConfig.tasksDatabaseId || !pluginConfig.configured) {
        throw new Error('Plugin not configured properly');
    }

    if (typeof PluginAPI === 'undefined') {
        throw new Error('PluginAPI not available');
    }

    log('=== Starting New Sync Architecture ===');

    // PHASE 0: Project/Tag Sync (must happen before task sync)
    log('=== Phase 0: Syncing Projects and Tags ===');
    try {
        const projectStats = await syncProjectsWithProjects();
        log(`Project sync: ${projectStats.created} created, ${projectStats.synced} synced`);

        const tagStats = await syncTagsWithTaskTypes();
        log(`Tag sync: ${tagStats.created} SP tags created, ${tagStats.synced} synced, ${tagStats.schemaUpdated} task type options added`);
    } catch (error) {
        log(`Project/Tag sync failed: ${error.message}`, 'error');
        // Continue with task sync even if project/tag sync fails
    }

    // PHASE 1: Data Collection
    const spTasks = await PluginAPI.getTasks();
    const archivedTasks = await PluginAPI.getArchivedTasks();
    const allSpTasks = [...spTasks, ...archivedTasks];
    log(`Phase 1: Found ${spTasks.length} active SP tasks, ${archivedTasks.length} archived`);

    // Get all Notion tasks
    const notionTasks = await getAllNotionTasks();
    log(`Phase 1: Found ${notionTasks.length} Notion tasks`);

    // Create lookup maps
    const spTasksById = new Map();
    allSpTasks.forEach(task => spTasksById.set(task.id, task));

    const notionTasksBySPId = new Map();
    notionTasks.forEach(page => {
        const spTaskId = page.properties['SP Task ID']?.rich_text?.[0]?.text?.content;
        if (spTaskId) {
            notionTasksBySPId.set(spTaskId, page);
        }
    });

    let stats = {
        spToNotionCreates: 0,
        notionToSpCreates: 0,
        spToNotionUpdates: 0,
        notionToSpUpdates: 0
    };

    // PHASE 2: Create Missing Tasks
    log('=== Phase 2: Creating Missing Tasks ===');

    // 2A: Create SP tasks for Notion pages without valid SP Task ID
    for (const notionPage of notionTasks) {
        const spTaskId = notionPage.properties['SP Task ID']?.rich_text?.[0]?.text?.content;
        const notionTitle = notionPage.properties['Name']?.title?.[0]?.text?.content || 'Untitled';

        log(`🔍 Processing Notion task: "${notionTitle}" (SP ID: ${spTaskId})`);

        if (!spTaskId || !spTasksById.has(spTaskId)) {
            // Check if we should create this task (avoid duplicates by title)
            const existingActiveTask = spTasks.find(t => t.title === notionTitle);
            const existingArchivedTask = archivedTasks.find(t => t.title === notionTitle);

            log(`   📋 Duplicate check: Active=${!!existingActiveTask}, Archived=${!!existingArchivedTask}`);

            if (existingActiveTask) {
                // Link existing active SP task to Notion page
                await updateNotionTask(notionPage.id, {
                    'SP Task ID': { rich_text: [{ text: { content: existingActiveTask.id } }] }
                });
                log(`   🔗 Linked existing active SP task: ${existingActiveTask.title}`);
            } else if (existingArchivedTask) {
                // Restore archived task: create new active task based on archived one
                const restoredTaskData = {
                    title: existingArchivedTask.title,
                    notes: existingArchivedTask.notes || '',
                    isDone: false, // Restore as active task
                    timeEstimate: existingArchivedTask.timeEstimate || 0,
                    timeSpent: existingArchivedTask.timeSpent || 0,
                    dueWithTime: existingArchivedTask.dueWithTime,
                    dueDay: existingArchivedTask.dueDay
                };

                log(`   📥 Restoring archived task: ${existingArchivedTask.title}`);
                const newTaskId = await PluginAPI.addTask(restoredTaskData);

                // Link new task to Notion page
                await updateNotionTask(notionPage.id, {
                    'SP Task ID': { rich_text: [{ text: { content: newTaskId } }] }
                });

                stats.notionToSpCreates++;
                log(`   ✅ Restored SP task from archive: ${existingArchivedTask.title} (ID: ${newTaskId})`);

                // Update lookup map to prevent duplicate creation in Phase 2B
                notionTasksBySPId.set(newTaskId, notionPage);
            } else {
                // Create completely new task
                log(`   ➕ Creating new SP task: ${notionTitle}`);
                const newSpTask = await createSpTaskFromNotion(notionPage);
                stats.notionToSpCreates++;
                log(`   ✅ Created SP task: ${newSpTask.title} (ID: ${newSpTask.id})`);

                // Update lookup map to prevent duplicate creation in Phase 2B
                notionTasksBySPId.set(newSpTask.id, notionPage);
            }
        } else {
            log(`   ⏭️ Skipping: Already has valid SP Task ID`);
        }
    }

    // 2B: Create Notion tasks for SP tasks not in Notion (only active tasks)
    log('=== Phase 2B: Creating Notion tasks for SP tasks ===');
    for (const spTask of spTasks) { // Only active tasks
        log(`🔍 Processing SP task: "${spTask.title}" (ID: ${spTask.id})`);
        if (!notionTasksBySPId.has(spTask.id)) {
            log(`   ➕ Creating Notion task for SP task: ${spTask.title}`);
            await createNotionTaskFromSp(spTask);
            stats.spToNotionCreates++;
            log(`   ✅ Created Notion task: ${spTask.title}`);
        } else {
            log(`   ⏭️ Skipping: SP task already has Notion page`);
        }
    }

    // PHASE 3: Update Existing Tasks (only active tasks)
    log('=== Phase 3: Updating Existing Active Tasks ===');

    // Update only active SP tasks with their Notion counterparts
    for (const spTask of spTasks) { // Only active SP tasks
        const notionPage = notionTasksBySPId.get(spTask.id);
        if (notionPage) {
            const updated = await updateTaskPair(spTask, notionPage);
            if (updated.spUpdated) stats.notionToSpUpdates++;
            if (updated.notionUpdated) stats.spToNotionUpdates++;
        }
    }

    // PHASE 4: Handle SP Task Archival (mark corresponding Notion tasks as archived)
    log('=== Phase 4: Syncing Archived Tasks ===');

    for (const archivedTask of archivedTasks) {
        // Find Notion page for this archived SP task
        const searchResponse = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.tasksDatabaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pluginConfig.apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    property: 'SP Task ID',
                    rich_text: { equals: archivedTask.id }
                }
            })
        });

        const searchData = await searchResponse.json();

        if (searchData.results && searchData.results.length > 0) {
            const notionPage = searchData.results[0];
            const currentlyArchived = notionPage.properties['Archived']?.checkbox === true;

            if (!currentlyArchived) {
                // Archive the Notion task to match SP archival
                await updateNotionTask(notionPage.id, {
                    'Archived': { checkbox: true },
                    'Status': { status: { name: 'Done' } }
                });
                log(`Archived Notion task: ${archivedTask.title}`);
                stats.spToNotionUpdates++;
            }
        }
    }

    // Save both mappings and update sync metadata
    await saveSyncMappings();
    await updateSyncMetadata({
        lastSyncTime: new Date().toISOString(),
        totalSyncs: (await loadPluginData()).metadata.totalSyncs + 1
    });

    log('=== Sync Complete ===');
    return stats;
}

// ===== PROJECT/TAG SYNC FUNCTIONS =====

// Get all SP projects
async function getAllSpProjects() {
    if (typeof PluginAPI === 'undefined') {
        throw new Error('PluginAPI not available');
    }
    return await PluginAPI.getAllProjects();
}

// Get all SP tags
async function getAllSpTags() {
    if (typeof PluginAPI === 'undefined') {
        throw new Error('PluginAPI not available');
    }
    return await PluginAPI.getAllTags();
}

// Get all Notion projects
async function getAllNotionProjects() {
    if (!pluginConfig.projectsDatabaseId) {
        log('No Projects database ID configured, skipping projects sync');
        return [];
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.projectsDatabaseId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Notion Projects API error: ${data.message || 'Unknown error'}`);
    }

    return data.results || [];
}

// Create Notion project from SP project
async function createNotionProjectFromSpProject(spProject) {
    if (!pluginConfig.projectsDatabaseId) {
        throw new Error('Projects database ID not configured');
    }

    const properties = {
        'Name': { title: [{ text: { content: spProject.title || 'Untitled Project' } }] },
        'Description': { rich_text: [{ text: { content: `Synced from SP Project: ${spProject.title}` } }] }
    };

    log(`   📤 Creating Notion project for SP project: ${spProject.title}`);
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            parent: { database_id: pluginConfig.projectsDatabaseId },
            properties
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create Notion project: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    log(`   ✅ Created Notion project: ${spProject.title} (ID: ${result.id})`);
    return result;
}

// Create SP project from Notion project
async function createSpProjectFromNotionProject(notionProject) {
    const projectData = {
        title: notionProject.properties['Name']?.title?.[0]?.text?.content || 'Untitled Project'
    };

    log(`   📥 Creating SP project from Notion project: ${projectData.title}`);
    const projectId = await PluginAPI.addProject(projectData);
    log(`   ✅ Created SP project: ${projectData.title} (ID: ${projectId})`);
    return { ...projectData, id: projectId };
}

// Sync projects with projects
async function syncProjectsWithProjects() {
    if (!pluginConfig.projectsDatabaseId) {
        log('Projects database not configured, skipping project sync');
        return { created: 0, synced: 0 };
    }

    log('=== Syncing SP Projects ↔ Notion Projects ===');

    const spProjects = await getAllSpProjects();
    const notionProjects = await getAllNotionProjects();

    log(`Found ${spProjects.length} SP projects and ${notionProjects.length} Notion projects`);

    let created = 0;
    let synced = 0;

    // Create missing Notion projects for SP projects
    for (const spProject of spProjects) {
        const existingProject = notionProjects.find(project =>
            project.properties['Name']?.title?.[0]?.text?.content === spProject.title
        );

        if (!existingProject) {
            await createNotionProjectFromSpProject(spProject);
            created++;
        } else {
            log(`   ⏭️ Notion project already exists for SP project: ${spProject.title}`);
            synced++;
        }
    }

    // Create missing SP projects for Notion projects
    for (const notionProject of notionProjects) {
        const projectTitle = notionProject.properties['Name']?.title?.[0]?.text?.content;
        if (!projectTitle) continue;

        const existingProject = spProjects.find(project => project.title === projectTitle);

        if (!existingProject) {
            await createSpProjectFromNotionProject(notionProject);
            created++;
        } else {
            log(`   ⏭️ SP project already exists for Notion project: ${projectTitle}`);
            synced++;
        }
    }

    log(`Project sync complete: ${created} created, ${synced} already synced`);
    return { created, synced };
}

// Get available task types from Tasks database schema
async function getNotionTaskTypes() {
    // Get the database schema to see available Task Type options
    const response = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.tasksDatabaseId}`, {
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28'
        }
    });

    const dbSchema = await response.json();
    const taskTypeProperty = dbSchema.properties['Task Type'];

    if (taskTypeProperty && taskTypeProperty.multi_select) {
        return taskTypeProperty.multi_select.options.map(option => option.name);
    }

    return [];
}

// Add new option to Notion multi-select field
async function addTaskTypeOption(tagTitle) {
    try {
        // Get current database schema
        const response = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.tasksDatabaseId}`, {
            headers: {
                'Authorization': `Bearer ${pluginConfig.apiKey}`,
                'Notion-Version': '2022-06-28'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get database schema: ${response.status}`);
        }

        const database = await response.json();
        const taskTypeProperty = database.properties['Task Type'];

        if (!taskTypeProperty || taskTypeProperty.type !== 'multi_select') {
            throw new Error('Task Type property not found or not multi_select');
        }

        // Add new option to existing options
        const currentOptions = taskTypeProperty.multi_select.options || [];

        // Check if option already exists
        if (currentOptions.some(option => option.name === tagTitle)) {
            log(`   ⏭️ Task type option already exists: ${tagTitle}`);
            return true;
        }

        const newOptions = [
            ...currentOptions,
            {
                name: tagTitle,
                color: 'default' // You can randomize colors if desired
            }
        ];

        // Update database schema
        const updateResponse = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.tasksDatabaseId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${pluginConfig.apiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    'Task Type': {
                        multi_select: {
                            options: newOptions
                        }
                    }
                }
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.text();
            throw new Error(`Failed to update database schema: ${errorData}`);
        }

        log(`   ✅ Added new Task Type option: ${tagTitle}`);
        return true;

    } catch (error) {
        log(`   ❌ Failed to add Task Type option '${tagTitle}': ${error.message}`, 'error');
        return false;
    }
}

// Sync tags with task types
async function syncTagsWithTaskTypes() {
    log('=== Syncing Tags ↔ Task Types ===');

    const spTags = await getAllSpTags();
    const availableTaskTypes = await getNotionTaskTypes();

    log(`Found ${spTags.length} SP tags and ${availableTaskTypes.length} available task types`);

    let created = 0;
    let synced = 0;
    let schemaUpdated = 0;

    // Add missing task type options for SP tags
    for (const spTag of spTags) {
        if (availableTaskTypes.includes(spTag.title)) {
            log(`   ⏭️ Task type already exists for tag: ${spTag.title}`);
            synced++;
        } else {
            log(`   🔄 Adding new Task Type option for tag: ${spTag.title}`);
            const success = await addTaskTypeOption(spTag.title);
            if (success) {
                schemaUpdated++;
            }
        }
    }

    // Refresh available task types after schema updates
    const updatedTaskTypes = await getNotionTaskTypes();

    // Create missing SP tags for existing task types
    for (const taskType of updatedTaskTypes) {
        const existingTag = spTags.find(tag => tag.title === taskType);
        if (!existingTag) {
            try {
                const tagData = { title: taskType };
                log(`   📥 Creating SP tag from task type: ${taskType}`);
                const tagId = await PluginAPI.addTag(tagData);
                log(`   ✅ Created SP tag: ${taskType} (ID: ${tagId})`);
                created++;
            } catch (error) {
                log(`   ❌ Failed to create tag ${taskType}: ${error.message}`, 'error');
            }
        } else {
            log(`   ⏭️ Tag already exists for task type: ${taskType}`);
        }
    }

    log(`Tag/Task Type sync complete: ${created} SP tags created, ${synced} already synced, ${schemaUpdated} new task type options added`);
    return { created, synced, schemaUpdated };
}

// ===== PROJECT/TAG MAPPING HELPERS =====

// Get SP project ID from Notion projects relation
async function getSpProjectIdFromNotionProjects(projectsRelation) {
    // If no project relation in Notion, map to SP "Inbox" project
    if (!projectsRelation || !projectsRelation.length) {
        const spProjects = await getAllSpProjects();
        const inboxProject = spProjects.find(project => project.title === 'Inbox');
        if (inboxProject) {
            log(`   📁 No Notion project relation, mapping to SP Inbox project: ${inboxProject.id}`);
            return inboxProject.id;
        } else {
            log(`   📁 No Notion project relation and no SP Inbox project found`);
            return null;
        }
    }

    try {
        const spProjects = await getAllSpProjects();
        const notionProjects = await getAllNotionProjects();

        // Get the first project ID from the relation
        const projectId = projectsRelation[0].id;
        const notionProject = notionProjects.find(project => project.id === projectId);

        if (notionProject) {
            const projectTitle = notionProject.properties['Name']?.title?.[0]?.text?.content;
            const spProject = spProjects.find(project => project.title === projectTitle);
            return spProject ? spProject.id : null;
        }
    } catch (error) {
        log(`Error mapping Notion project to SP project: ${error.message}`, 'error');
    }

    return null;
}

// Get SP tag IDs from Notion task types
async function getSpTagIdsFromNotionTaskTypes(taskTypes) {
    if (!taskTypes || !taskTypes.length) return [];

    try {
        const spTags = await getAllSpTags();
        const tagIds = [];

        for (const taskType of taskTypes) {
            const tagName = taskType.name;
            const spTag = spTags.find(tag => tag.title === tagName);
            if (spTag) {
                tagIds.push(spTag.id);
            }
        }

        return tagIds;
    } catch (error) {
        log(`Error mapping Notion task types to SP tags: ${error.message}`, 'error');
        return [];
    }
}

// Get Notion project ID from SP project
async function getNotionProjectIdFromSpProject(projectId) {
    if (!projectId) {
        log(`   📁 No project ID provided for mapping`);
        return null;
    }

    try {
        const spProjects = await getAllSpProjects();
        const notionProjects = await getAllNotionProjects();

        log(`   📁 Looking for SP project with ID: ${projectId}`);
        const spProject = spProjects.find(project => project.id === projectId);

        if (!spProject) {
            log(`   ❌ SP project not found with ID: ${projectId}`, 'error');
            return null;
        }

        log(`   📁 Found SP project: "${spProject.title}", searching for matching Notion project...`);
        const notionProject = notionProjects.find(project =>
            project.properties['Name']?.title?.[0]?.text?.content === spProject.title
        );

        if (notionProject) {
            log(`   ✅ Found matching Notion project: "${spProject.title}" → ${notionProject.id}`);

            // Validate the project ID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(notionProject.id)) {
                log(`   ❌ Invalid project ID format: ${notionProject.id}`, 'error');
                return null;
            }

            return notionProject.id;
        } else {
            log(`   ❌ No matching Notion project found for project: "${spProject.title}"`, 'error');
            log(`   Available projects: ${notionProjects.map(p => p.properties['Name']?.title?.[0]?.text?.content || 'Untitled').join(', ')}`);
            return null;
        }
    } catch (error) {
        log(`Error mapping SP project to Notion project: ${error.message}`, 'error');
        return null;
    }
}

// Get Notion task types from SP tag IDs
async function getNotionTaskTypesFromSpTags(tagIds) {
    if (!tagIds || !tagIds.length) return [];

    try {
        const spTags = await getAllSpTags();
        const availableTaskTypes = await getNotionTaskTypes();
        const taskTypes = [];

        for (const tagId of tagIds) {
            const spTag = spTags.find(tag => tag.id === tagId);
            if (spTag && availableTaskTypes.includes(spTag.title)) {
                taskTypes.push({ name: spTag.title });
            }
        }

        return taskTypes;
    } catch (error) {
        log(`Error mapping SP tags to Notion task types: ${error.message}`, 'error');
        return [];
    }
}

// ===== END PROJECT/TAG SYNC FUNCTIONS =====

// Get all Notion tasks (filter out archived tasks at API level)
async function getAllNotionTasks() {
    const response = await fetch(`https://api.notion.com/v1/databases/${pluginConfig.tasksDatabaseId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filter: {
                and: [
                    {
                        property: 'Archived',
                        checkbox: {
                            equals: false
                        }
                    }
                ]
            }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Notion API error: ${data.message || 'Unknown error'}`);
    }

    // Also filter out page-level archived items as additional safety
    return data.results.filter(page => !page.archived);
}

// Create SP task from Notion page
async function createSpTaskFromNotion(notionPage) {
    // Map project from Notion Projects relation
    const projectsRelation = notionPage.properties['Projects']?.relation;
    const projectId = await getSpProjectIdFromNotionProjects(projectsRelation);

    // Map tags from Notion Task Type multi-select
    const taskTypes = notionPage.properties['Task Type']?.multi_select;
    const tagIds = await getSpTagIdsFromNotionTaskTypes(taskTypes);

    log(`   🏷️ Mapped ${tagIds.length} tags from task types: ${taskTypes?.map(t => t.name).join(', ') || 'none'}`);
    log(`   📁 Mapped project ID: ${projectId || 'none'}`);

    // Create basic task data (only fields supported by PluginCreateTaskData)
    const taskData = {
        title: notionPage.properties['Name']?.title?.[0]?.text?.content || 'Untitled',
        notes: notionPage.properties['Notes']?.rich_text?.[0]?.text?.content || '',
        isDone: getCompletionStatusFromNotion(notionPage),
        timeEstimate: (notionPage.properties['Time Estimate']?.number || 0) * 3600000, // hours to ms
        projectId: projectId || undefined, // Use undefined for tasks without a project
        tagIds: tagIds,
        parentId: null
    };

    log(`   📊 Creating SP task with basic data: ${JSON.stringify(taskData, null, 2)}`);
    const newTaskId = await PluginAPI.addTask(taskData);
    log(`   ✅ Successfully created SP task with ID: ${newTaskId}`);

    // Now handle scheduling via updateTask (since PluginCreateTaskData doesn't support dueDay/dueWithTime)
    const schedulingData = notionPage.properties['Scheduling']?.date;
    if (schedulingData?.start) {
        const start = schedulingData.start;
        const end = schedulingData.end;
        const schedulingUpdates = {};

        log(`   📅 Processing scheduling data: ${JSON.stringify(schedulingData)}`);

        // Use the same conversion logic as the update function
        if (!start.includes('T') && !end) {
            // Case 1a: Date-only without end
            schedulingUpdates.dueDay = start;
            log(`   📅 Setting dueDay: ${start}`);
        } else if (!start.includes('T') && end && !end.includes('T')) {
            // Case 1b: Date-only range (start to end)
            schedulingUpdates.dueDay = start;
            // Calculate duration in days and convert to milliseconds
            const startDate = new Date(start);
            const endDate = new Date(end);
            const daysDuration = (endDate - startDate) / (1000 * 60 * 60 * 24);
            if (daysDuration > 0) {
                schedulingUpdates.timeEstimate = daysDuration * 24 * 3600000; // Convert to milliseconds
                log(`   ⏱️ Setting duration: ${daysDuration} days`);
            }
            log(`   📅 Setting dueDay: ${start} (range end: ${end})`);
        } else if (start.includes('T')) {
            // Case 2&3: DateTime - set both dueWithTime AND dueDay
            schedulingUpdates.dueWithTime = new Date(start).getTime();
            schedulingUpdates.dueDay = start.split('T')[0]; // Extract date part

            log(`   📅 Setting dueWithTime: ${schedulingUpdates.dueWithTime} (${new Date(start).toLocaleString()})`);
            log(`   📅 Setting dueDay: ${schedulingUpdates.dueDay}`);

            // If has end time, calculate timeEstimate (only if not already set from Time Estimate field)
            if (end && end.includes('T')) {
                const duration = new Date(end).getTime() - new Date(start).getTime();
                if (duration > 0 && taskData.timeEstimate === 0) {
                    schedulingUpdates.timeEstimate = duration;
                    log(`   ⏱️ Setting timeEstimate from duration: ${(duration / 3600000).toFixed(2)}h`);
                }
            }
        }

        // Apply scheduling updates
        if (Object.keys(schedulingUpdates).length > 0) {
            await updateSpTask(newTaskId, schedulingUpdates);
            log(`   ✅ Applied scheduling updates: ${Object.keys(schedulingUpdates).join(', ')}`);
        }
    }

    // Update Notion page with SP Task ID
    log(`   🔄 Updating Notion page with SP Task ID: ${newTaskId}`);
    await updateNotionTask(notionPage.id, {
        'SP Task ID': { rich_text: [{ text: { content: newTaskId } }] }
    });
    log(`   ✅ Successfully linked Notion page to SP task`);

    return { ...taskData, id: newTaskId };
}

// Create Notion task from SP task
async function createNotionTaskFromSp(spTask) {
    const properties = {
        'Name': { title: [{ text: { content: spTask.title || 'Untitled Task' } }] },
        'SP Task ID': { rich_text: [{ text: { content: spTask.id } }] },
        'Archived': { checkbox: false }, // New tasks are never archived
        'Status': { status: { name: getNotionStatusFromSp(spTask) } }
    };

    // Add optional properties
    if (spTask.notes) {
        properties['Notes'] = { rich_text: [{ text: { content: spTask.notes } }] };
    }

    if (spTask.timeEstimate) {
        properties['Time Estimate'] = { number: Math.round(spTask.timeEstimate / 3600000 * 100) / 100 };
    }

    if (spTask.timeSpent) {
        properties['Time Spent'] = { number: Math.round(spTask.timeSpent / 3600000 * 100) / 100 };
    }

    // Map project to Notion Projects relation
    if (spTask.projectId && spTask.projectId !== 'Inbox') {
        const projectId = await getNotionProjectIdFromSpProject(spTask.projectId);
        if (projectId) {
            properties['Projects'] = { relation: [{ id: projectId }] };
            log(`   📁 Mapped SP project to Notion project: ${projectId}`);
        }
    } else if (spTask.projectId === 'Inbox') {
        log(`   📁 Task is in Inbox, not setting any project relation in Notion`);
    }

    // Map tags to Notion Task Type multi-select
    if (spTask.tagIds && spTask.tagIds.length > 0) {
        const taskTypes = await getNotionTaskTypesFromSpTags(spTask.tagIds);
        if (taskTypes.length > 0) {
            properties['Task Type'] = { multi_select: taskTypes };
            log(`   🏷️ Mapped ${taskTypes.length} SP tags to task types: ${taskTypes.map(t => t.name).join(', ')}`);
        }
    }

    // Handle scheduling using new system
    const schedulingData = convertSpSchedulingToNotion(spTask);
    if (schedulingData) {
        properties['Scheduling'] = { date: schedulingData };
    }

    return await createNotionTask(properties);
}

// Update task pair (SP ↔ Notion) - Clean bidirectional sync with proper timestamp comparison
async function updateTaskPair(spTask, notionPage) {
    let spUpdated = false;
    let notionUpdated = false;

    // Get timestamps for comparison
    const notionTimestamp = new Date(notionPage.last_edited_time).getTime(); // ISO → Unix ms
    const spTimestamp = spTask.modified || spTask.created || 0; // SP Unix timestamp in ms

    log(`🕐 Comparing timestamps for "${spTask.title}":`);
    log(`   SP modified: ${new Date(spTimestamp).toISOString()} (${spTimestamp})`);
    log(`   Notion last_edited_time: ${notionPage.last_edited_time} (${notionTimestamp})`);

    // Determine which side was modified more recently
    if (notionTimestamp > spTimestamp) {
        // Notion was modified more recently → Update SP from Notion
        log(`⬅️ Notion → SP: ${spTask.title} (Notion newer)`);
        spUpdated = await updateSpFromNotion(spTask, notionPage);
    } else if (spTimestamp > notionTimestamp) {
        // SP was modified more recently → Update Notion from SP
        log(`➡️ SP → Notion: ${spTask.title} (SP newer)`);
        notionUpdated = await updateNotionFromSp(spTask, notionPage);
    } else {
        // Timestamps are equal → no update needed
        log(`⏸️ No update needed: ${spTask.title} (timestamps equal)`);
    }

    return { spUpdated, notionUpdated };
}

// Update SP task from Notion (when Notion was modified more recently)
async function updateSpFromNotion(spTask, notionPage) {
    const updates = {};

    // Get Notion data
    const notionStatus = notionPage.properties['Status']?.status?.name;
    const notionTitle = notionPage.properties['Name']?.title?.[0]?.text?.content || spTask.title;
    const notionNotes = notionPage.properties['Notes']?.rich_text?.[0]?.text?.content || '';

    // Determine completion status from Notion
    let notionComplete = false;
    if (notionStatus === 'Done') {
        notionComplete = true;
    } else if (notionStatus === 'Aborted') {
        notionComplete = true; // Aborted tasks are considered completed in SP
    } else if (notionStatus === 'In progress') {
        // In progress tasks should be active (not completed) in SP
        notionComplete = false;
    } else if (notionStatus === 'Not started') {
        // Not started tasks should be active (not completed) in SP
        notionComplete = false;
    }

    // Update fields if different
    if (spTask.title !== notionTitle) {
        updates.title = notionTitle;
    }

    if ((spTask.notes || '') !== notionNotes) {
        updates.notes = notionNotes;
    }

    if (spTask.isDone !== notionComplete) {
        updates.isDone = notionComplete;
        if (notionStatus === 'In progress' && spTask.isDone) {
            log(`   Setting SP task as active (Notion: In progress)`);
        }
    }

    // Handle scheduling sync: Notion → SP
    const notionScheduling = notionPage.properties['Scheduling']?.date;
    if (notionScheduling) {
        const schedulingUpdates = convertNotionSchedulingToSp(notionScheduling, spTask);
        Object.assign(updates, schedulingUpdates);
    } else {
        // Clear SP scheduling if Notion has no scheduling
        if (spTask.dueWithTime || spTask.dueDay) {
            updates.dueWithTime = undefined;
            updates.dueDay = undefined;
        }
    }

    // Special case: If Notion shows "Not started" but SP has time spent > 0,
    // we should update Notion status to "In progress" on the next SP→Notion sync
    if (notionStatus === 'Not started' && (spTask.timeSpent || 0) > 0) {
        log(`   ⚠️ Notion shows "Not started" but SP has time spent (${(spTask.timeSpent / 3600000).toFixed(2)}h). Will update Notion to "In progress" on next sync.`);
    }

    // Handle project mapping: Notion Projects → SP Project
    const projectsRelation = notionPage.properties['Projects']?.relation;
    const mappedProjectId = await getSpProjectIdFromNotionProjects(projectsRelation);
    if (spTask.projectId !== mappedProjectId) {
        updates.projectId = mappedProjectId || 'Inbox'; // Use 'Inbox' for tasks without a project
        log(`   📁 Project updated: ${spTask.projectId} → ${mappedProjectId || 'Inbox'}`);
    }

    // Handle tag mapping: Notion Task Type → SP Tags
    const taskTypes = notionPage.properties['Task Type']?.multi_select;
    const mappedTagIds = await getSpTagIdsFromNotionTaskTypes(taskTypes);
    if (JSON.stringify(spTask.tagIds || []) !== JSON.stringify(mappedTagIds)) {
        updates.tagIds = mappedTagIds;
        log(`   🏷️ Tags updated: [${(spTask.tagIds || []).join(', ')}] → [${mappedTagIds.join(', ')}]`);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
        await updateSpTask(spTask.id, updates);
        log(`✓ Updated SP: ${spTask.title} (${Object.keys(updates).join(', ')})`);
        return true;
    }

    return false;
}

// Update Notion task from SP (when SP was modified more recently)
async function updateNotionFromSp(spTask, notionPage) {
    const properties = {};

    // Get current Notion values
    const currentTitle = notionPage.properties['Name']?.title?.[0]?.text?.content || '';
    const currentNotes = notionPage.properties['Notes']?.rich_text?.[0]?.text?.content || '';
    const currentStatus = notionPage.properties['Status']?.status?.name;

    // Update title if different
    if (spTask.title !== currentTitle) {
        properties['Name'] = { title: [{ text: { content: spTask.title } }] };
    }

    // Update notes if different
    const spNotes = spTask.notes || '';
    if (spNotes !== currentNotes) {
        properties['Notes'] = { rich_text: [{ text: { content: spNotes } }] };
    }

    // Update status based on SP state
    let expectedStatus = getNotionStatusFromSp(spTask);

    // Special override: If Notion shows "Not started" but SP has time spent > 0,
    // force status to "In progress" regardless of other SP state
    if (currentStatus === 'Not started' && (spTask.timeSpent || 0) > 0 && !spTask.isDone) {
        expectedStatus = 'In progress';
        log(`   🔄 Overriding status: "Not started" → "In progress" (SP has ${(spTask.timeSpent / 3600000).toFixed(2)}h time spent)`);
    }

    if (expectedStatus !== currentStatus) {
        properties['Status'] = { status: { name: expectedStatus } };
    }

    // Handle scheduling sync: SP → Notion
    const currentScheduling = notionPage.properties['Scheduling']?.date;
    const newScheduling = convertSpSchedulingToNotion(spTask);

    if (!schedulingEquals(currentScheduling, newScheduling)) {
        properties['Scheduling'] = { date: newScheduling };
    }

    // Handle project mapping: SP Project → Notion Projects
    const currentProjects = notionPage.properties['Projects']?.relation || [];
    let expectedProjectId = null;

    if (spTask.projectId && spTask.projectId !== 'Inbox') {
        expectedProjectId = await getNotionProjectIdFromSpProject(spTask.projectId);
    }

    const currentProjectIds = currentProjects.map(p => p.id);
    const expectedProjectIds = expectedProjectId ? [expectedProjectId] : [];

    if (JSON.stringify(currentProjectIds.sort()) !== JSON.stringify(expectedProjectIds.sort())) {
        if (expectedProjectIds.length > 0) {
            properties['Projects'] = { relation: [{ id: expectedProjectId }] };
            log(`   📁 Projects updated: [${currentProjectIds.join(', ')}] → [${expectedProjectIds.join(', ')}]`);
        } else {
            properties['Projects'] = { relation: [] };
            log(`   📁 Projects cleared: [${currentProjectIds.join(', ')}] → [] (task moved to Inbox)`);
        }
    }

    // Handle tag mapping: SP Tags → Notion Task Type
    const currentTaskTypes = notionPage.properties['Task Type']?.multi_select || [];
    const expectedTaskTypes = await getNotionTaskTypesFromSpTags(spTask.tagIds || []);

    const currentTypeNames = currentTaskTypes.map(t => t.name).sort();
    const expectedTypeNames = expectedTaskTypes.map(t => t.name).sort();

    if (JSON.stringify(currentTypeNames) !== JSON.stringify(expectedTypeNames)) {
        properties['Task Type'] = { multi_select: expectedTaskTypes };
        log(`   🏷️ Task types updated: [${currentTypeNames.join(', ')}] → [${expectedTypeNames.join(', ')}]`);
    }

    // Apply updates if any
    if (Object.keys(properties).length > 0) {
        await updateNotionTask(notionPage.id, properties);
        log(`✓ Updated Notion: ${spTask.title} (${Object.keys(properties).join(', ')})`);
        return true;
    }

    return false;
}

// Convert Notion scheduling to SP format (only return differences)
function convertNotionSchedulingToSp(notionScheduling, spTask) {
    const updates = {};

    if (!notionScheduling || !notionScheduling.start) {
        return updates;
    }

    const start = notionScheduling.start;
    const end = notionScheduling.end;

    // Case 1a: Date-only start without end (e.g., "2025-09-27")
    if (!start.includes('T') && !end) {
        if (spTask.dueDay !== start) {
            updates.dueDay = start;
        }
        if (spTask.dueWithTime !== undefined) {
            updates.dueWithTime = undefined;
        }
        // Clear timeEstimate since there's no duration
        if (spTask.timeEstimate > 0) {
            updates.timeEstimate = 0;
            log(`   ⏱️ Clearing timeEstimate (date-only, no end)`);
        }
        if (Object.keys(updates).length > 0) {
            log(`   📅 Date-only scheduling: ${start}`);
        }
    }
    // Case 1b: Date-only start with date-only end (e.g., "2025-09-27" to "2025-09-29")
    else if (!start.includes('T') && end && !end.includes('T')) {
        // For date ranges, use the start date as dueDay
        if (spTask.dueDay !== start) {
            updates.dueDay = start;
        }
        if (spTask.dueWithTime !== undefined) {
            updates.dueWithTime = undefined;
        }
        // Calculate duration in days and convert to hours for timeEstimate
        const startDate = new Date(start);
        const endDate = new Date(end);
        const daysDuration = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const hoursDuration = daysDuration * 24 * 3600000; // Convert to milliseconds

        if (daysDuration > 0 && spTask.timeEstimate !== hoursDuration) {
            updates.timeEstimate = hoursDuration;
        }

        if (Object.keys(updates).length > 0) {
            log(`   📅 Date range scheduling: ${start} → ${end} (${daysDuration} days)`);
        }
    }
    // Case 2: DateTime without end (e.g., "2025-09-27T01:00:00.000+02:00")
    else if (start.includes('T') && !end) {
        const startTime = new Date(start).getTime();
        const dateOnly = start.split('T')[0]; // Extract date part

        if (spTask.dueWithTime !== startTime) {
            updates.dueWithTime = startTime;
        }
        // Also set dueDay to the date part
        if (spTask.dueDay !== dateOnly) {
            updates.dueDay = dateOnly;
        }
        // Clear timeEstimate if SP had one (since Notion no longer has duration)
        if (spTask.timeEstimate > 0) {
            updates.timeEstimate = 0;
            log(`   ⏱️ Clearing timeEstimate (no end time in Notion)`);
        }
        if (Object.keys(updates).length > 0) {
            log(`   🕐 DateTime scheduling: ${start} → ${startTime} (dueDay: ${dateOnly})`);
        }
    }
    // Case 3: DateTime with start+end (calculate duration)
    else if (start.includes('T') && end) {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const duration = endTime - startTime;
        const dateOnly = start.split('T')[0]; // Extract date part

        if (spTask.dueWithTime !== startTime) {
            updates.dueWithTime = startTime;
        }
        // Also set dueDay to the date part
        if (spTask.dueDay !== dateOnly) {
            updates.dueDay = dateOnly;
        }
        if (duration > 0 && spTask.timeEstimate !== duration) {
            updates.timeEstimate = duration;
        }

        if (Object.keys(updates).length > 0) {
            if (duration > 0) {
                log(`   ⏱️ DateTime with duration: ${start} → ${end} (${(duration / 3600000).toFixed(2)}h, dueDay: ${dateOnly})`);
            } else {
                log(`   🕐 DateTime scheduling: ${start} (dueDay: ${dateOnly})`);
            }
        }
    }

    return updates;
}

// Helper function to format date with timezone offset
function formatDateWithTimezone(date) {
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
    const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');

    // Get ISO string and replace Z with timezone offset
    return date.toISOString().replace('Z', `${sign}${hours}:${minutes}`);
}

// Convert SP scheduling to Notion format
function convertSpSchedulingToNotion(spTask) {
    // Get system timezone
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Case 1a: SP has dueDay (date-only) without timeEstimate
    if (spTask.dueDay && !spTask.dueWithTime && (!spTask.timeEstimate || spTask.timeEstimate <= 0)) {
        return {
            start: spTask.dueDay, // "2025-09-27"
            end: null,
            time_zone: null // No timezone for date-only entries
        };
    }
    // Case 1b: SP has dueDay (date-only) with timeEstimate (duration)
    else if (spTask.dueDay && !spTask.dueWithTime && spTask.timeEstimate > 0) {
        const startDate = new Date(spTask.dueDay);
        const durationInMs = spTask.timeEstimate;
        const durationInHours = durationInMs / (1000 * 60 * 60);

        let endDateString;

        if (durationInHours < 24) {
            // Duration less than 24h - same day
            endDateString = spTask.dueDay;
            log(`   📅 Date with short duration: ${spTask.dueDay} + ${durationInHours.toFixed(2)}h → same day`);
        } else {
            // Duration 24h or more - calculate end date
            const durationInDays = Math.ceil(durationInHours / 24);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + durationInDays);
            endDateString = endDate.toISOString().split('T')[0];
            log(`   📅 Date with long duration: ${spTask.dueDay} + ${durationInHours.toFixed(2)}h → ${spTask.dueDay} to ${endDateString}`);
        }

        return {
            start: spTask.dueDay,
            end: endDateString,
            time_zone: null // No timezone for date-only entries
        };
    }
    // Case 2: SP has dueWithTime without timeEstimate
    else if (spTask.dueWithTime && (!spTask.timeEstimate || spTask.timeEstimate <= 0)) {
        const localDate = new Date(spTask.dueWithTime);
        log(`   🕐 Converting SP time: ${localDate.toLocaleString()} (${spTask.dueWithTime})`);
        log(`   🕐 SP timestamp represents: ${localDate.toString()}`);

        // CRITICAL: SP timestamps are in local time, but toISOString() converts to UTC
        // We need to adjust for the timezone offset to get the correct UTC time for Notion
        const timezoneOffsetMs = localDate.getTimezoneOffset() * 60000;
        const correctedUtcTime = spTask.dueWithTime - timezoneOffsetMs;
        const correctedDate = new Date(correctedUtcTime);
        const utcISO = correctedDate.toISOString();

        log(`   🔧 Timezone offset: ${localDate.getTimezoneOffset()} minutes`);
        log(`   🔧 Corrected UTC time: ${correctedDate.toString()}`);
        log(`   📤 Sending to Notion: ${utcISO} with timezone ${systemTimezone}`);

        return {
            start: utcISO,
            end: null,
            time_zone: systemTimezone
        };
    }
    // Case 3: SP has dueWithTime + timeEstimate
    else if (spTask.dueWithTime && spTask.timeEstimate > 0) {
        const startDate = new Date(spTask.dueWithTime);
        const endDate = new Date(spTask.dueWithTime + spTask.timeEstimate);

        log(`   🕐 Converting SP time range: ${startDate.toLocaleString()} → ${endDate.toLocaleString()}`);

        // Apply same timezone correction to both start and end
        const timezoneOffsetMs = startDate.getTimezoneOffset() * 60000;
        const correctedStartTime = spTask.dueWithTime - timezoneOffsetMs;
        const correctedEndTime = (spTask.dueWithTime + spTask.timeEstimate) - timezoneOffsetMs;

        const correctedStartDate = new Date(correctedStartTime);
        const correctedEndDate = new Date(correctedEndTime);

        const startUTC = correctedStartDate.toISOString();
        const endUTC = correctedEndDate.toISOString();

        log(`   🔧 Corrected times: ${correctedStartDate.toString()} → ${correctedEndDate.toString()}`);
        log(`   📤 Sending to Notion: ${startUTC} → ${endUTC} with timezone ${systemTimezone}`);

        return {
            start: startUTC,
            end: endUTC,
            time_zone: systemTimezone
        };
    }
    // Case 4: No scheduling
    else {
        return null;
    }
}

// Compare scheduling objects for equality
function schedulingEquals(current, newScheduling) {
    if (!current && !newScheduling) return true;
    if (!current || !newScheduling) return false;

    return current.start === newScheduling.start &&
        current.end === newScheduling.end;
}


// Helper functions for Status field mapping
function getNotionStatusFromSp(spTask) {
    if (spTask.isDone) return 'Done';
    if (spTask.timeSpent > 0) return 'In progress';
    return 'Not started';
}

function getCompletionStatusFromNotion(notionPage) {
    const status = notionPage.properties['Status']?.status?.name;

    // Task is complete if Status is 'Done' or 'Aborted'
    return status === 'Done' || status === 'Aborted';
}

function getArchivedStatusFromNotion(notionPage) {
    return notionPage.properties['Archived']?.checkbox === true;
}

// Reusable update functions
async function updateSpTask(taskId, updates) {
    await PluginAPI.updateTask(taskId, updates);
}


async function createNotionTask(properties) {
    log(`   📤 Creating Notion task with properties: ${JSON.stringify(properties, null, 2)}`);

    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            parent: { database_id: pluginConfig.tasksDatabaseId },
            properties
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        log(`   ❌ Notion API error response: ${errorData}`, 'error');
        throw new Error(`Failed to create Notion task (${response.status}): ${errorData}`);
    }

    return await response.json();
}

async function updateNotionTask(pageId, properties) {
    log(`   📤 Updating Notion page ${pageId} with properties: ${JSON.stringify(properties, null, 2)}`);

    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties })
    });

    if (!response.ok) {
        const errorText = await response.text();
        log(`   ❌ Notion API error ${response.status}: ${errorText}`, 'error');
        throw new Error(`Failed to update Notion task: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

async function archiveNotionTask(pageId) {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${pluginConfig.apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: true })
    });

    if (!response.ok) {
        throw new Error(`Failed to archive Notion task: ${response.statusText}`);
    }

    return await response.json();
}

// Manual sync function (calls the common sync function)
async function performManualSync() {
    try {
        elements.manualSyncBtn.disabled = true;
        elements.manualSyncBtn.textContent = 'Syncing...';

        log('Starting manual bidirectional sync...');

        const results = await performBidirectionalSync();

        log(`Manual sync completed. SP→Notion: ${results.spToNotionUpdates} updated, ${results.spToNotionCreates} created. Notion→SP: ${results.notionToSpUpdates} updated, ${results.notionToSpCreates} created. ${results.archivals} archived.`);

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: `Sync completed! SP→Notion: ${results.spToNotionUpdates + results.spToNotionCreates}, Notion→SP: ${results.notionToSpUpdates + results.notionToSpCreates}, Archived: ${results.archivals}`,
                type: 'SUCCESS'
            });
        }

    } catch (error) {
        log(`Manual sync failed: ${error.message}`, 'error');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: `Sync failed: ${error.message}`,
                type: 'ERROR'
            });
        }
    } finally {
        elements.manualSyncBtn.disabled = false;
        elements.manualSyncBtn.textContent = 'Manual Sync';
    }
}

// Export configuration to file
async function exportConfiguration() {
    try {
        if (!pluginConfig.configured) {
            throw new Error('No configuration to export. Please save configuration first.');
        }

        const exportData = {
            version: "1.0.0",
            exportDate: new Date().toISOString(),
            configuration: {
                apiKey: pluginConfig.apiKey, // Export real API key
                tasksDatabaseId: pluginConfig.tasksDatabaseId,
                configured: pluginConfig.configured
            }
        };

        const configStr = JSON.stringify(exportData, null, 2);

        // Try to use File System Access API for better file dialog
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `notion-sync-config-${new Date().toISOString().split('T')[0]}.json`,
                    types: [{
                        description: 'JSON files',
                        accept: { 'application/json': ['.json'] },
                    }],
                });

                const writable = await fileHandle.createWritable();
                await writable.write(configStr);
                await writable.close();

                log('Configuration exported to chosen location');
            } catch (err) {
                if (err.name === 'AbortError') {
                    log('Export cancelled by user');
                    return;
                } else {
                    throw err;
                }
            }
        } else {
            // Fallback to browser download
            const blob = new Blob([configStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `notion-sync-config-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            log('Configuration exported to downloads folder');
        }

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: 'Configuration exported successfully',
                type: 'SUCCESS'
            });
        }

    } catch (error) {
        log(`Failed to export configuration: ${error.message}`, 'error');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: `Export failed: ${error.message}`,
                type: 'ERROR'
            });
        }
    }
}

// Import configuration from file
function importConfiguration() {
    elements.importConfigFile.click();
}

// Handle configuration file import
elements.importConfigFile.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate import format
        if (!importData.configuration) {
            throw new Error('Invalid configuration file format.');
        }

        const importConfig = importData.configuration;

        // Import all configuration fields
        elements.apiKey.value = importConfig.apiKey || '';
        elements.tasksDatabaseId.value = importConfig.tasksDatabaseId || '';
        elements.projectsDatabaseId.value = importConfig.projectsDatabaseId || '';

        log(`Configuration imported from ${file.name}`);
        log('Please verify the configuration and save if needed');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: 'Configuration imported successfully.',
                type: 'SUCCESS'
            });
        }

    } catch (error) {
        log(`Failed to import configuration: ${error.message}`, 'error');

        if (typeof PluginAPI !== 'undefined' && PluginAPI.showSnack) {
            PluginAPI.showSnack({
                msg: `Import failed: ${error.message}`,
                type: 'ERROR'
            });
        }
    }

    event.target.value = '';
});

// Clear log
function clearLog() {
    elements.syncLog.textContent = 'Log cleared.\n';
    log('Log cleared');
}

// Event listeners
elements.saveConfigBtn.addEventListener('click', saveConfiguration);
elements.discoverDbBtn.addEventListener('click', discoverDatabases);
elements.testConnectionBtn.addEventListener('click', testConnection);
elements.manualSyncBtn.addEventListener('click', performManualSync);
elements.exportConfigBtn.addEventListener('click', exportConfiguration);
elements.importConfigBtn.addEventListener('click', importConfiguration);
elements.enableLogging.addEventListener('change', toggleLogging);
elements.clearLogBtn.addEventListener('click', clearLog);

// Initialize
async function initialize() {
    log('Notion Sync Plugin UI initialized');
    await loadConfiguration();

    // Try to auto-discover missing database IDs if API key is available
    if (pluginConfig.apiKey) {
        await initializeDatabaseIds();
    }

    // Auto-connect if configuration exists
    if (pluginConfig.apiKey && pluginConfig.tasksDatabaseId) {
        log('Configuration found, attempting auto-connect...');
        await autoConnect();
    }
}

// Auto-connect function
async function autoConnect() {
    try {
        const isConnected = await testNotionConnection();
        if (isConnected) {
            pluginConfig.configured = true;
            saveConfiguration();
            updateUI();
            log('Auto-connect successful');
        } else {
            log('Auto-connect failed: Invalid credentials or database', 'error');
        }
    } catch (error) {
        log(`Auto-connect failed: ${error.message}`, 'error');
    }
}

initialize();