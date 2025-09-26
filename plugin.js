// Notion Sync Plugin - Bidirectional sync between Super Productivity and Notion
console.log('Notion Sync Plugin initializing...', PluginAPI);

// Plugin state
let pluginConfig = null;
let syncInProgress = false;
let syncMappings = new Map(); // Map SP task IDs to Notion page IDs
let lastSyncTime = null;
let autoSyncTimer = null;

// Notion API configuration - user configurable
const NOTION_API_VERSION = '2022-06-28';

// Default plugin configuration
const DEFAULT_CONFIG = {
  apiKey: '',
  tasksDatabaseId: '',
  projectsDatabaseId: '',
  topicsDatabaseId: '',
  autoSyncEnabled: false, // Disabled - manual sync only
  autoSyncInterval: 300000, // 5 minutes in milliseconds
  conflictResolution: 'lastModifiedWins', // 'lastModifiedWins', 'spWins', 'notionWins', 'prompt'
  syncTags: true,
  syncProjects: true,
  debugMode: false,
  configured: false
};

// Load plugin configuration on startup
async function loadPluginConfig() {
  try {
    // Use localStorage to match the UI configuration
    const savedConfig = localStorage.getItem('notion-sync-config');
    pluginConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;

    // Load sync mappings
    const savedMappings = localStorage.getItem('notion-sync-mappings');
    if (savedMappings) {
      const mappingsData = JSON.parse(savedMappings);
      syncMappings = new Map(Object.entries(mappingsData));
    }

    // Load last sync time
    const savedLastSync = localStorage.getItem('notion-last-sync-time');
    if (savedLastSync) {
      lastSyncTime = new Date(JSON.parse(savedLastSync));
    }

    console.log('Notion Sync Plugin configuration loaded:', pluginConfig);

    // Auto-sync disabled - manual sync only
    // if (pluginConfig.autoSyncEnabled) {
    //   startAutoSync();
    // }

    // Ensure autosync is disabled
    pluginConfig.autoSyncEnabled = false;
    stopAutoSync();

  } catch (error) {
    console.error('Failed to load plugin configuration:', error);
    pluginConfig = DEFAULT_CONFIG;
  }
}

// Save plugin configuration
async function savePluginConfig() {
  try {
    await PluginAPI.persistDataSynced('notionSyncConfig', JSON.stringify(pluginConfig));
    await PluginAPI.persistDataSynced('notionSyncMappings', JSON.stringify([...syncMappings]));
    await PluginAPI.persistDataSynced('notionLastSyncTime', JSON.stringify(lastSyncTime));
  } catch (error) {
    console.error('Failed to save plugin configuration:', error);
  }
}

// Detailed logging system
let detailedLog = [];
const MAX_LOG_ENTRIES = 1000;

function logDetailed(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data ? JSON.stringify(data, null, 2) : null
  };

  detailedLog.push(logEntry);

  // Keep log size manageable
  if (detailedLog.length > MAX_LOG_ENTRIES) {
    detailedLog = detailedLog.slice(-MAX_LOG_ENTRIES);
  }

  // Console output
  const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (data) {
    console.log(consoleMessage, data);
  } else {
    console.log(consoleMessage);
  }

  // Also log to plugin config for debugging
  if (pluginConfig?.debugMode) {
    console.log('Debug data:', data);
  }
}

// Export log to file
function exportLogToFile() {
  try {
    const logContent = detailedLog.map(entry => {
      let line = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
      if (entry.data) {
        line += `\nData: ${entry.data}`;
      }
      return line;
    }).join('\n\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notion-sync-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logDetailed('info', 'Log exported to file successfully');
    return true;
  } catch (error) {
    logDetailed('error', 'Failed to export log to file', error);
    return false;
  }
}

// Check if plugin is properly configured
function isConfigured() {
  return pluginConfig &&
         pluginConfig.apiKey &&
         pluginConfig.tasksDatabaseId &&
         pluginConfig.configured;
}

// Notion API helper functions
async function notionRequest(endpoint, method = 'GET', body = null) {
  if (!isConfigured()) {
    throw new Error('Plugin not configured. Please set API key and database ID first.');
  }

  const url = `https://api.notion.com/v1/${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${pluginConfig.apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  logDetailed('debug', `Making Notion API request to ${endpoint}`, { method, body });

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      logDetailed('error', `Notion API error: ${response.status} ${response.statusText}`, responseData);
      throw new Error(`Notion API error: ${response.status} ${response.statusText} - ${responseData.message || 'Unknown error'}`);
    }

    logDetailed('debug', `Notion API response received`, { status: response.status, dataKeys: Object.keys(responseData) });
    return responseData;
  } catch (error) {
    logDetailed('error', 'Notion API request failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Test Notion connection
async function testNotionConnection() {
  try {
    logDetailed('info', 'Testing Notion connection...');

    if (!pluginConfig.apiKey) {
      throw new Error('API key is required');
    }

    if (!pluginConfig.tasksDatabaseId) {
      throw new Error('Tasks Database ID is required');
    }

    logDetailed('debug', 'Configuration check passed', {
      hasApiKey: !!pluginConfig.apiKey,
      apiKeyPrefix: pluginConfig.apiKey ? pluginConfig.apiKey.substring(0, 10) + '...' : 'none',
      tasksDatabaseId: pluginConfig.tasksDatabaseId
    });

    const response = await notionRequest(`databases/${pluginConfig.tasksDatabaseId}`);

    logDetailed('info', 'Connection test successful', {
      databaseTitle: response.title?.[0]?.text?.content,
      databaseId: response.id,
      propertiesCount: Object.keys(response.properties || {}).length
    });

    return { success: true, data: response };
  } catch (error) {
    logDetailed('error', 'Connection test failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

// Convert SP task to Notion properties
function spTaskToNotionProperties(task, projects, tags) {
  const properties = {
    'Name': {
      title: [{ text: { content: task.title || 'Untitled Task' } }]
    },
    'SP Task ID': {
      rich_text: [{ text: { content: task.id } }]
    },
    'Complete': {
      checkbox: task.isDone || false
    }
  };

  // Add notes if present
  if (task.notes) {
    properties['Notes'] = {
      rich_text: [{ text: { content: task.notes } }]
    };
  }

  // Add time estimate (convert from milliseconds to hours)
  if (task.timeEstimate) {
    properties['Time Estimate'] = {
      number: Math.round(task.timeEstimate / 3600000 * 100) / 100 // Round to 2 decimal places
    };
  }

  // Add time spent (convert from milliseconds to hours)
  if (task.timeSpent) {
    properties['Time Spent'] = {
      number: Math.round(task.timeSpent / 3600000 * 100) / 100
    };
  }

  // Add priority
  if (task.priority) {
    const priorityMap = {
      'URGENT': 'Urgent',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'LOW': 'Low'
    };
    properties['Priority'] = {
      select: { name: priorityMap[task.priority] || 'Medium' }
    };
  }

  // Add scheduling date
  if (task.plannedAt || task.remindAt) {
    const date = new Date(task.plannedAt || task.remindAt);
    properties['Scheduling'] = {
      date: { start: date.toISOString() }
    };
  }

  // Add project relation
  if (task.projectId && projects) {
    const project = projects.find(p => p.id === task.projectId);
    if (project) {
      // This would need the actual Notion page ID for the project
      // For now, we'll skip this or handle it differently
    }
  }

  // Add tag relations (map to Task Type)
  if (task.tagIds && task.tagIds.length > 0 && tags) {
    const taskTags = task.tagIds.map(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag ? tag.title : null;
    }).filter(Boolean);

    if (taskTags.length > 0) {
      properties['Task Type'] = {
        multi_select: taskTags.map(tagName => ({ name: tagName }))
      };
    }
  }

  return properties;
}

// Convert Notion page to SP task
function notionPageToSpTask(page) {
  const props = page.properties;

  const task = {
    title: props.Name?.title?.[0]?.text?.content || 'Untitled',
    notes: props.Notes?.rich_text?.[0]?.text?.content || '',
    isDone: props.Complete?.checkbox || false,
    createdAt: new Date(page.created_time).getTime(),
    id: props['SP Task ID']?.rich_text?.[0]?.text?.content || null
  };

  // Convert time estimate (hours to milliseconds)
  if (props['Time Estimate']?.number) {
    task.timeEstimate = props['Time Estimate'].number * 3600000;
  }

  // Convert time spent (hours to milliseconds)
  if (props['Time Spent']?.number) {
    task.timeSpent = props['Time Spent'].number * 3600000;
  }

  // Convert priority
  if (props.Priority?.select?.name) {
    const priorityMap = {
      'Urgent': 'URGENT',
      'High': 'HIGH',
      'Medium': 'MEDIUM',
      'Low': 'LOW'
    };
    task.priority = priorityMap[props.Priority.select.name] || 'MEDIUM';
  }

  // Convert scheduling date
  if (props.Scheduling?.date?.start) {
    const scheduledDate = new Date(props.Scheduling.date.start);
    task.plannedAt = scheduledDate.getTime();
  }

  return task;
}

// Sync tasks from SP to Notion
async function syncTasksToNotion() {
  try {
    const tasks = await PluginAPI.getTasks();
    const projects = await PluginAPI.getAllProjects();
    const tags = await PluginAPI.getAllTags();

    for (const task of tasks) {
      const notionPageId = syncMappings.get(task.id);
      const properties = spTaskToNotionProperties(task, projects, tags);

      if (notionPageId) {
        // Update existing Notion page
        await notionRequest(`pages/${notionPageId}`, 'PATCH', { properties });
        if (pluginConfig.debugMode) {
          console.log(`Updated Notion page for task: ${task.title}`);
        }
      } else {
        // Create new Notion page
        const newPage = await notionRequest('pages', 'POST', {
          parent: { database_id: pluginConfig.tasksDatabaseId },
          properties
        });
        syncMappings.set(task.id, newPage.id);
        if (pluginConfig.debugMode) {
          console.log(`Created Notion page for task: ${task.title}`);
        }
      }
    }
  } catch (error) {
    console.error('Error syncing tasks to Notion:', error);
    throw error;
  }
}

// Sync tasks from Notion to SP
async function syncTasksFromNotion() {
  try {
    const response = await notionRequest(`databases/${pluginConfig.tasksDatabaseId}/query`, 'POST', {
      filter: {
        property: 'SP Task ID',
        rich_text: {
          is_not_empty: true
        }
      }
    });

    for (const page of response.results) {
      const spTask = notionPageToSpTask(page);

      if (spTask.id) {
        // Update existing SP task
        await PluginAPI.updateTask(spTask.id, spTask);
        if (pluginConfig.debugMode) {
          console.log(`Updated SP task: ${spTask.title}`);
        }
      }
    }

    // Handle new Notion pages without SP Task ID
    const newPagesResponse = await notionRequest(`databases/${pluginConfig.tasksDatabaseId}/query`, 'POST', {
      filter: {
        property: 'SP Task ID',
        rich_text: {
          is_empty: true
        }
      }
    });

    for (const page of newPagesResponse.results) {
      const spTask = notionPageToSpTask(page);
      delete spTask.id; // Remove the null ID

      // Create new SP task
      const newTaskId = await PluginAPI.addTask(spTask);
      syncMappings.set(newTaskId, page.id);

      // Update Notion page with SP Task ID
      await notionRequest(`pages/${page.id}`, 'PATCH', {
        properties: {
          'SP Task ID': {
            rich_text: [{ text: { content: newTaskId } }]
          }
        }
      });

      if (pluginConfig.debugMode) {
        console.log(`Created SP task from Notion: ${spTask.title}`);
      }
    }
  } catch (error) {
    console.error('Error syncing tasks from Notion:', error);
    throw error;
  }
}

// Main sync function
async function performSync() {
  if (syncInProgress) {
    logDetailed('warn', 'Sync already in progress, skipping');
    return;
  }

  if (!isConfigured()) {
    const errorMsg = 'Plugin not configured. Please configure API key and database ID first.';
    logDetailed('error', errorMsg);
    PluginAPI.showSnack({
      msg: errorMsg,
      type: 'ERROR',
      ico: 'error'
    });
    return;
  }

  syncInProgress = true;

  try {
    logDetailed('info', 'Starting bidirectional sync...');

    // Test connection first
    const connectionTest = await testNotionConnection();
    if (!connectionTest.success) {
      throw new Error(`Connection test failed: ${connectionTest.error}`);
    }

    // Perform bidirectional sync
    logDetailed('info', 'Syncing SP tasks to Notion...');
    await syncTasksToNotion();

    logDetailed('info', 'Syncing Notion tasks to SP...');
    await syncTasksFromNotion();

    lastSyncTime = new Date();
    await savePluginConfig();

    logDetailed('info', 'Sync completed successfully');
    PluginAPI.showSnack({
      msg: 'Notion sync completed successfully',
      type: 'SUCCESS',
      ico: 'sync'
    });

  } catch (error) {
    logDetailed('error', 'Sync failed', { error: error.message, stack: error.stack });
    PluginAPI.showSnack({
      msg: `Sync failed: ${error.message}`,
      type: 'ERROR',
      ico: 'error'
    });
  } finally {
    syncInProgress = false;
  }
}

// Auto-sync functionality
function startAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
  }

  if (pluginConfig.autoSyncEnabled && pluginConfig.autoSyncInterval > 0 && isConfigured()) {
    autoSyncTimer = setInterval(performSync, pluginConfig.autoSyncInterval);
    logDetailed('info', `Auto-sync started with interval: ${pluginConfig.autoSyncInterval}ms`);
  } else {
    logDetailed('info', 'Auto-sync not started - plugin not configured or auto-sync disabled');
  }
}

function stopAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
    console.log('Auto-sync stopped');
  }
}

// Hook handlers for immediate sync on completion
PluginAPI.registerHook(PluginAPI.Hooks.TASK_COMPLETE, (payload) => {
  // Always sync on task completion to prevent conflicts
  console.log('Task completed, triggering immediate sync:', payload.taskId);
  setTimeout(() => syncSingleTaskCompletion(payload.task), 500); // Quick sync for completion
});

PluginAPI.registerHook(PluginAPI.Hooks.TASK_UPDATE, (payload) => {
  if (pluginConfig.autoSyncEnabled) {
    console.log('Task updated, triggering sync:', payload.taskId);
    setTimeout(performSync, 1000);
  }
});

// Quick sync for task completion to update Notion immediately with Status='Done'
async function syncSingleTaskCompletion(task) {
  try {
    if (!pluginConfig.apiKey || !pluginConfig.tasksDatabaseId) {
      return;
    }

    console.log('Syncing task completion to Notion:', task.title);

    // Find the corresponding Notion page
    const searchResponse = await notionRequest(`databases/${pluginConfig.tasksDatabaseId}/query`, 'POST', {
      filter: {
        property: 'SP Task ID',
        rich_text: { equals: task.id }
      }
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      const pageId = searchResponse.results[0].id;

      // Update with completion status and Status='Done' (but not archived yet)
      const properties = {
        'Status': { status: { name: 'Done' } }
        // Note: Archived checkbox will be set to true later when SP actually archives the task
      };

      // Update Notion with the completion status
      await notionRequest(`pages/${pageId}`, 'PATCH', { properties });

      console.log('Successfully synced task completion to Notion with Status=Done:', task.title);

      PluginAPI.showSnack({
        msg: `✓ Completed: ${task.title}`,
        type: 'SUCCESS'
      });
    } else {
      console.log('No Notion page found for completed task:', task.title);
    }
  } catch (error) {
    console.error('Failed to sync task completion:', error);
  }
}

// Register UI elements
PluginAPI.registerSidePanelButton({
  label: 'Notion Sync',
  icon: 'sync',
  onClick: () => {
    PluginAPI.showIndexHtmlAsView();
  }
});

// Expose functions to UI immediately
if (typeof window !== 'undefined') {
  window.testNotionConnection = testNotionConnection;
  window.exportLogToFile = exportLogToFile;
  window.performSync = performSync;

  // Signal that functions are ready
  window.notionSyncFunctionsReady = true;
}

// Initialize plugin
loadPluginConfig().then(() => {
  logDetailed('info', 'Notion Sync Plugin initialized successfully');

  if (isConfigured()) {
    PluginAPI.showSnack({
      msg: 'Notion Sync Plugin ready!',
      type: 'INFO',
      ico: 'sync'
    });
  } else {
    PluginAPI.showSnack({
      msg: 'Notion Sync Plugin loaded. Please configure API credentials.',
      type: 'INFO',
      ico: 'settings'
    });
  }
});

// Cleanup on plugin disable/reload
window.addEventListener('beforeunload', () => {
  stopAutoSync();
});