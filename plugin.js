// Notion Sync Plugin - Main Entry Point
// This file handles all plugin initialization, hooks, and background operations

console.log('[Notion Sync] Plugin initializing...');

// Import our main sync logic
// Note: We'll access the sync functions from the iframe's window
let syncFunctions = null;
let pluginConfig = null;

// Configuration with defaults
const DEFAULT_CONFIG = {
    apiKey: '',
    tasksDatabaseId: '',
    projectsDatabaseId: '',
    configured: false,
    enableLogging: true,
    autoSyncInterval: 0 // minutes
};

// Auto-sync timer
let autoSyncTimer = null;
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 5000; // 5 seconds minimum between syncs
const PLUGIN_DATA_VERSION = '1.0.0';

// ===== INITIALIZATION =====

async function initializePlugin() {
    try {
        console.log('[Notion Sync] Loading plugin configuration...');

        // Load configuration
        const configurationLoaded = await loadConfiguration();

        if (!configurationLoaded) {
            PluginAPI.showSnack({
                msg: 'Notion Sync Plugin not loaded. Please configure the plugin in settings.',
                type: 'INFO',
                ico: 'info'
            });
        } else {
            PluginAPI.showSnack({
                msg: 'Notion Sync Plugin loaded successfully.',
                type: 'SUCCESS',
                ico: 'check_circle'
            });
        }

        // Register manual sync header button
        registerManualSyncButton();

        // Register hooks for task events
        registerTaskHooks();

        // Register app lifecycle hooks
        registerAppHooks();

        // Start auto-sync if enabled
        if (pluginConfig.autoSyncInterval > 0 && pluginConfig.configured) {
            console.log('[Notion Sync] Starting initial auto-sync...');
            startAutoSync();
        } else {
            console.log('[Notion Sync] Auto-sync not started - interval:', pluginConfig.autoSyncInterval, 'configured:', pluginConfig.configured);
        }

        // Start monitoring for configuration changes
        startConfigurationMonitoring();

        console.log('[Notion Sync] Plugin initialized successfully');

    } catch (error) {
        console.error('[Notion Sync] Plugin initialization failed:', error);
        PluginAPI.showSnack({
            msg: `Notion Sync initialization failed: ${error.message}`,
            type: 'ERROR'
        });
    }
}

// ===== MANUAL SYNC BUTTON =====

function registerManualSyncButton() {
    PluginAPI.registerHeaderButton({
        label: 'Sync Notion',
        icon: 'sync',
        onClick: async () => {
            console.log('[Notion Sync] Manual sync button clicked');
            await performManualSync();
        }
    });
    console.log('[Notion Sync] Manual sync header button registered');
}

// ===== CONFIGURATION MANAGEMENT =====

async function loadConfiguration() {
    try {
        const configData = await PluginAPI.loadSyncedData();
        const parsedConfig = configData ? JSON.parse(configData) : null;
        if (parsedConfig && parsedConfig.config) {
            pluginConfig = parsedConfig.config;
            log('Configuration loaded successfully');
            return true;
        } else {
            log('No configuration found, creating default persistent data...');
            const defaultData = createDefaultPluginData();
            pluginConfig = defaultData.config;

            // Save default data to persistent storage immediately
            await PluginAPI.persistDataSynced(JSON.stringify(defaultData));
            log('Default persistent data created and saved');
            return false;
        }
    } catch (error) {
        log(`Failed to load configuration: ${error.message}`, 'error');
        const defaultData = createDefaultPluginData();
        pluginConfig = defaultData.config;

        // Try to save default data even on error
        try {
            await PluginAPI.persistDataSynced(JSON.stringify(defaultData));
            log('Default persistent data created after error');
        } catch (saveError) {
            log(`Failed to save default data: ${saveError.message}`, 'error');
        }
        return false;
    }
}

function createDefaultPluginData() {
    return {
        version: PLUGIN_DATA_VERSION,
        config: {
            apiKey: '',
            tasksDatabaseId: '',
            projectsDatabaseId: '',
            configured: false,
            enableLogging: false,
            autoSyncInterval: 0 // minutes
        },
        metadata: {
            lastSyncTime: null,
            totalSyncs: 0,
            lastModified: new Date().toISOString()
        }
    };
}

// ===== TASK HOOKS =====

function registerTaskHooks() {
    // Hook for task completion
    PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, async (payload) => {
        if (!pluginConfig.configured || !pluginConfig.enableLogging) return;

        console.log('[Notion Sync] Task completed:', payload.taskId);

        // Trigger a targeted sync for this specific task
        await syncSingleTask(payload.task, 'completed');
    });

    // Hook for task updates
    PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, async (payload) => {
        if (!pluginConfig.configured) return;

        console.log('[Notion Sync] Task updated:', payload.taskId);

        // Only sync if significant changes occurred
        const significantChanges = ['title', 'notes', 'isDone', 'timeEstimate', 'timeSpent', 'projectId', 'tagIds'];
        const hasSignificantChanges = significantChanges.some(field =>
            payload.changes.hasOwnProperty(field)
        );

        if (hasSignificantChanges) {
            await syncSingleTask(payload.task, 'updated');
        }
    });

    // Hook for task deletion
    PluginAPI.registerHook(PluginAPI.Hooks.TASK_DELETE, async (payload) => {
        if (!pluginConfig.configured) return;

        console.log('[Notion Sync] Task deleted:', payload.taskId);

        // Archive corresponding Notion task
        await handleTaskDeletion(payload.taskId);
    });

    console.log('[Notion Sync] Task hooks registered');
}

async function syncSingleTask(task, action) {
    if (!pluginConfig.configured) return;

    try {
        console.log(`[Notion Sync] Syncing single task (${action}):`, task.title);

        const syncFunctions = await getSyncFunctions();
        if (syncFunctions) {
            // This would call a targeted sync function for a single task
            // await syncFunctions.syncSingleTaskToNotion(task);
        }

    } catch (error) {
        console.error('[Notion Sync] Failed to sync single task:', error);
    }
}

async function handleTaskDeletion(taskId) {
    if (!pluginConfig.configured) return;

    try {
        console.log('[Notion Sync] Handling task deletion:', taskId);

        const syncFunctions = await getSyncFunctions();
        if (syncFunctions) {
            // This would call a function to archive the corresponding Notion task
            // await syncFunctions.archiveNotionTaskBySpId(taskId);
        }

    } catch (error) {
        console.error('[Notion Sync] Failed to handle task deletion:', error);
    }
}

// ===== APP LIFECYCLE HOOKS =====

function registerAppHooks() {
    // Hook for when the day is finished
    PluginAPI.registerHook(PluginAPI.Hooks.FINISH_DAY, async (payload) => {
        if (!pluginConfig.configured) return;

        console.log('[Notion Sync] Day finished, performing sync...');

        try {
            await performAutoSync();
        } catch (error) {
            console.error('[Notion Sync] End-of-day sync failed:', error);
        }
    });

    // Hook for window focus changes (to sync when app regains focus)
    if (PluginAPI.onWindowFocusChange) {
        PluginAPI.onWindowFocusChange(async (isFocused) => {
            if (isFocused && pluginConfig.configured && pluginConfig.autoSyncInterval > 0) {
                // Only sync on focus if auto-sync is enabled and enough time has passed
                const timeSinceLastSync = Date.now() - lastSyncTime;
                const autoSyncIntervalMs = pluginConfig.autoSyncInterval * 60 * 1000;

                if (timeSinceLastSync > autoSyncIntervalMs) {
                    console.log('[Notion Sync] App regained focus after long absence, performing auto-sync...');
                    setTimeout(() => performAutoSync(), 2000); // Delay to let app settle
                } else {
                    console.log('[Notion Sync] App regained focus but sync was recent, skipping');
                }
            }
        });
    }

    console.log('[Notion Sync] App lifecycle hooks registered');
}

// ===== AUTO-SYNC FUNCTIONALITY =====

function startAutoSync() {
    if (!pluginConfig.configured || pluginConfig.autoSyncInterval <= 0) {
        console.log('[Notion Sync] Cannot start auto-sync: not configured or interval is 0');
        return;
    }

    stopAutoSync(); // Clear any existing timer

    let intervalMs = pluginConfig.autoSyncInterval * 60 * 1000; // Convert minutes to milliseconds

    // Safety check: minimum 1 minute interval
    if (intervalMs < 60000) {
        console.log('[Notion Sync] Auto-sync interval too small, using minimum 1 minute');
        intervalMs = 60000; // 1 minute minimum
    }

    autoSyncTimer = setInterval(async () => {
        if (pluginConfig.configured && pluginConfig.autoSyncInterval > 0) {
            // Use performAutoSync with proper auto-sync logging
            await performAutoSync();
        }
    }, intervalMs);

    console.log(`[Notion Sync] Auto-sync started with ${pluginConfig.autoSyncInterval} minute interval (${intervalMs}ms)`);
}

function stopAutoSync() {
    if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
        autoSyncTimer = null;
        console.log('[Notion Sync] Auto-sync stopped and timer cleared');
    } else {
        console.log('[Notion Sync] stopAutoSync called but no timer was active');
    }
}


// ===== SYNC OPERATIONS =====

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

    // Save update sync metadata
    await updateSyncMetadata({
        lastSyncTime: new Date().toISOString(),
        totalSyncs: (await loadPluginData()).metadata.totalSyncs + 1
    });

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
    // If no project relation in Notion, return null (no project assignment)
    if (!projectsRelation || !projectsRelation.length) {
        log(`   📁 No Notion project relation, leaving task without project assignment`);
        return null;
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
        updates.projectId = mappedProjectId || null; // Use null for tasks without a project
        log(`   📁 Project updated: ${spTask.projectId} → ${mappedProjectId || 'null (no project)'}`);
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

// ===== CONFIGURATION MONITORING =====

// Monitor configuration changes to start/stop auto-sync
let configMonitorTimer = null;
let lastConfigState = null;

function startConfigurationMonitoring() {
    if (configMonitorTimer) return; // Already running

    console.log('[Notion Sync] Starting configuration monitoring...');

    configMonitorTimer = setInterval(async () => {
        try {
            const currentData = await loadPluginData();
            if (!currentData) return;

            const currentConfig = currentData.config;

            // Check if this is the first run or config has ACTUALLY changed
            const hasRealChange = !lastConfigState ||
                lastConfigState.configured !== currentConfig.configured ||
                lastConfigState.autoSyncInterval !== currentConfig.autoSyncInterval;

            if (hasRealChange) {
                    console.log('[Notion Sync] Configuration changed, updating auto-sync...');
                    console.log(`[Notion Sync] Old autoSyncInterval: ${lastConfigState?.autoSyncInterval}, New: ${currentConfig.autoSyncInterval}`);
                    console.log(`[Notion Sync] Old configured: ${lastConfigState?.configured}, New: ${currentConfig.configured}`);

                    // Update plugin config
                    pluginConfig = currentConfig;

                    // Stop current auto-sync
                    stopAutoSync();

                    // Start auto-sync if conditions are met
                    if (currentConfig.autoSyncInterval > 0 && currentConfig.configured) {
                        startAutoSync();
                    }
                // Update last known state
                lastConfigState = { ...currentConfig };
            }
        } catch (error) {
            console.error('[Notion Sync] Error monitoring configuration:', error);
        }
    }, 120000); // Check every 2 minutes
}

function stopConfigurationMonitoring() {
    if (configMonitorTimer) {
        clearInterval(configMonitorTimer);
        configMonitorTimer = null;
        console.log('[Notion Sync] Configuration monitoring stopped');
    }
}

// ===== CLEANUP =====

// Register cleanup for when the plugin is disabled or app closes
function cleanup() {
    stopAutoSync();
    stopConfigurationMonitoring();
    console.log('[Notion Sync] Plugin cleanup completed');
}

// Hook into app shutdown if available
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
}


// ===== PLUGIN DATA MANAGEMENT =====

/**
 * Load current plugin data with read-modify-write pattern
 * Always loads fresh data from the API to avoid conflicts
 */
async function loadPluginData() {
    try {
        if (typeof PluginAPI === 'undefined' || !PluginAPI.loadSyncedData) {
            console.log('[Notion Sync] Plugin API not available, using defaults');
            return null;
        }

        const savedData = await PluginAPI.loadSyncedData();
        if (!savedData) {
            console.log('[Notion Sync] No saved data found, creating defaults');
            return createDefaultPluginData();
        }

        return JSON.parse(savedData);

    } catch (error) {
        console.log(`[Notion Sync] Failed to load plugin data: ${error.message}`);
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
            console.log('[Notion Sync] Plugin API not available for saving');
            return false;
        }

        // Load current data
        const currentData = await loadPluginData();

        // Merge updates
        const updatedData = {
            ...currentData,
            ...updates,
            metadata: {
                ...currentData.metadata,
                ...updates.metadata,
                lastModified: new Date().toISOString()
            }
        };

        // Save back
        await PluginAPI.persistDataSynced(JSON.stringify(updatedData));
        console.log('[Notion Sync] Plugin data saved successfully');
        return true;

    } catch (error) {
        console.log(`[Notion Sync] Failed to save plugin data: ${error.message}`);
        return false;
    }
}

// Auto-sync function called from timer
async function performAutoSync() {
    if (!pluginConfig.configured) {
        console.log('[Notion Sync] Not configured, skipping auto-sync');
        return;
    }

    // Critical: Don't auto-sync if interval is 0 (disabled)
    if (pluginConfig.autoSyncInterval <= 0) {
        console.log('[Notion Sync] Auto-sync disabled (interval = 0), skipping');
        return;
    }

    // Prevent too frequent syncs
    const now = Date.now();
    if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
        const remainingTime = Math.ceil((MIN_SYNC_INTERVAL - (now - lastSyncTime)) / 1000);
        console.log(`[Notion Sync] Auto-sync rate limited, wait ${remainingTime} seconds`);
        return;
    }

    try {
        console.log('[Notion Sync] Starting auto-sync...');

        const results = await performBidirectionalSync();
        lastSyncTime = now;

        const totalChanges = results.spToNotionCreates + results.spToNotionUpdates +
                           results.notionToSpCreates + results.notionToSpUpdates;

        console.log(`[Notion Sync] Auto-sync completed: ${totalChanges} changes processed`);

    } catch (error) {
        console.error('[Notion Sync] Auto-sync failed:', error);
        // Don't show UI notification for auto-sync failures to avoid spam
    }
}

// Manual sync function called from header button and UI trigger
async function performManualSync() {
    if (!pluginConfig.configured) {
        console.log('[Notion Sync] Not configured, skipping sync');
        PluginAPI.showSnack({
            msg: 'Notion Sync is not configured. Please set up the plugin first.',
            type: 'WARNING',
            ico: 'warning'
        });
        return;
    }

    // Prevent too frequent syncs
    const now = Date.now();
    if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
        const remainingTime = Math.ceil((MIN_SYNC_INTERVAL - (now - lastSyncTime)) / 1000);
        console.log(`[Notion Sync] Rate limited, wait ${remainingTime} seconds`);

        PluginAPI.showSnack({
            msg: `Please wait ${remainingTime} seconds before syncing again`,
            type: 'WARNING'
        });
        return;
    }

    try {
        console.log('[Notion Sync] Starting manual sync...');

        PluginAPI.showSnack({
            msg: 'Starting Notion sync...',
            type: 'INFO',
            ico: 'sync'
        });

        const results = await performBidirectionalSync();
        lastSyncTime = now;

        const totalChanges = results.spToNotionCreates + results.spToNotionUpdates +
                           results.notionToSpCreates + results.notionToSpUpdates;

        PluginAPI.showSnack({
            msg: `Sync completed! ${totalChanges} changes processed`,
            type: 'SUCCESS',
            ico: 'check_circle'
        });

        console.log('[Notion Sync] Manual sync completed:', results);

    } catch (error) {
        console.error('[Notion Sync] Manual sync failed:', error);
        PluginAPI.showSnack({
            msg: `Sync failed: ${error.message}`,
            type: 'ERROR'
        });
    }
}

function log(message, type = 'info') {
    if (pluginConfig && pluginConfig.enableLogging) {
        console.log(`[Notion Sync] ${message}`);
    }
}

// ===== STARTUP =====

// Initialize the plugin
initializePlugin().catch(error => {
    console.error('[Notion Sync] Fatal initialization error:', error);
});

console.log('[Notion Sync] Plugin script loaded');