# 🔄 Notion Sync Plugin for Super Productivity

> ⚠️ **ALPHA VERSION - IN TESTING** ⚠️
>
> This plugin is currently in **alpha testing phase**. While functional, it may contain bugs and the API may change.
> Please **backup your data** before use and report any issues you encounter.
>
> **Not recommended for production workflows yet.**

A powerful bidirectional synchronization plugin that seamlessly connects your Super Productivity tasks with Notion databases, enabling real-time workflow integration between both platforms.

## ✨ Key Features

- **🔄 Bidirectional Sync**: Keep tasks synchronized between Super Productivity and Notion in real-time
- **⚡ Auto-Sync**: Configurable automatic synchronization (5min/10min/15min/30min/1hr/2hr/Never)
- **🎯 Manual Sync**: On-demand synchronization via header button with progress feedback
- **🔧 Smart Discovery**: Automatically discovers Notion databases by analyzing titles and schemas
- **📊 Rich Data Mapping**: Comprehensive property mapping between SP tasks and Notion pages
- **🎨 Intuitive UI**: Clean configuration interface with real-time status indicators
- **🛡️ Robust Error Handling**: Rate limiting, retry logic, and clear user feedback
- **💾 Data Persistence**: Secure local storage with import/export capabilities

## 🚀 Quick Setup

### Prerequisites

- **Super Productivity** v14.0.0 or higher
- **Notion workspace** with database creation permissions
- **Notion integration** with API access

### Installation Steps

1. **Create Notion Integration**
   - Visit [notion.so/my-integrations](https://notion.so/my-integrations)
   - Click "New integration"
   - Give it a name (e.g., "Super Productivity Sync")
   - Copy the **API key** (starts with `ntn_`)

2. **Setup Notion Database**
   - Create a new database in Notion for your tasks
   - Share the database with your integration (Edit permissions required)
   - Copy the **database ID** from the URL

3. **Install Plugin**
   - Download/copy the plugin folder to your Super Productivity plugins directory
   - Go to **Settings → Plugins**
   - Enable "Notion Sync Plugin"

4. **Configure Plugin**
   - Click the plugin icon in the side panel
   - Enter your **Notion API key** and **Tasks Database ID**
   - Set **auto-sync interval** (default: 10 minutes)
   - Click **"Test Connection"** to verify setup
   - Click **"Save Configuration"**

### First Sync

1. Use the **"Sync Notion"** header button for immediate sync
2. Existing tasks will be synchronized between both platforms
3. Auto-sync will continue running based on your configured interval

## ⚙️ Configuration Options

### Connection Settings

| Setting | Required | Description |
|---------|----------|-------------|
| **API Key** | Yes | Your Notion integration API key (starts with `ntn_`) |
| **Tasks Database ID** | Yes | The UUID of your Notion tasks database |
| **Projects Database ID** | No | Optional database for syncing SP projects |

### Sync Settings

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| **Auto-Sync Interval** | Never/5min/10min/15min/30min/1hr/2hr | Never | Automatic sync frequency |
| **Enable Logging** | Yes/No | Yes | Enable detailed console logging |

### Manual Controls

- **Test Connection**: Verify API credentials and database access
- **Discover Databases**: Auto-find databases by analyzing titles and schemas
- **Export/Import Configuration**: Backup and restore plugin settings
- **Manual Sync**: Trigger immediate sync via header button

## 📋 Required Notion Database Schema

Your Notion database must have these properties for full functionality:

### Required Properties

- **Name** (Title) - Task title
- **SP Task ID** (Rich Text) - Super Productivity task identifier
- **Complete** (Checkbox) - Task completion status
- **Status** (Status) - Alternative completion tracking
- **Scheduling** (Date) - Planned date/time
- **Time Estimate** (Number) - Estimated hours
- **Time Spent** (Number) - Actual hours spent
- **Task Type** (Multi-select) - Task categories/tags


> 💡 **Auto-Discovery**: The plugin can automatically find databases that match common naming patterns (tasks, todo, projects, etc.) and verify they have the required schema.

## 🗺️ Data Mapping

### Super Productivity → Notion

| SP Property | Notion Property | Type | Notes |
|-------------|-----------------|------|-------|
| `title` | Name | Title | Task title |
| `notes` | Notes | Rich Text | Task description |
| `isDone` | Complete | Checkbox | Primary completion status |
| `isDone` | Status | Status | Alternative completion indicator |
| `priority` | Priority | Select | URGENT/HIGH/MEDIUM/LOW |
| `timeEstimate` | Time Estimate | Number | Converted from ms to hours |
| `timeSpent` | Time Spent | Number | Converted from ms to hours |
| `plannedAt` | Scheduling | Date | Planned date/time |
| `projectId` | Projects | Relation | Project assignment |
| `tagIds` | Task Type | Multi-select | Tag assignments |
| `id` | SP Task ID | Rich Text | Sync mapping identifier |

### Notion → Super Productivity

The reverse mapping automatically converts Notion page properties back to SP task format with proper type validation and null handling.

## 🔧 Plugin Architecture

### File Structure

```
notion-sync-plugin/
├── manifest.json          # Plugin metadata and permissions
├── plugin.js             # Main plugin logic and background operations
├── index.html            # UI interface and configuration
├── icon.svg              # Plugin icon
├── README.md             # This documentation
└── docs/                 # Additional documentation
    ├── notion-database-structure.md
    ├── sync-workflow.md
    ├── plugin-architecture.md
    ├── configuration-guide.md
    └── troubleshooting.md
```

### Core Components

1. **plugin.js**: Background sync engine, hooks, and API integration
2. **index.html**: User interface for configuration and monitoring
3. **Persistent Data API**: Secure storage using Super Productivity's data persistence
4. **Auto-sync Engine**: Configurable timer-based sync with rate limiting
5. **Manual Sync**: Header button for immediate synchronization

### Key Features Implementation

- **Header Button**: `PluginAPI.registerHeaderButton()` for manual sync
- **Auto-sync Timer**: Configurable intervals with rate limiting (5-second minimum)
- **Configuration Monitoring**: Automatic detection of config changes
- **Error Handling**: Comprehensive error catching with user feedback

## 🛠️ Troubleshooting

### Common Issues

**Connection Failed**
- Verify API key is correct and starts with `ntn_`
- Ensure database is shared with your integration (Edit permissions)
- Check database ID format (should be a UUID)
- Test network connectivity

**Sync Not Working**
- Check if auto-sync interval is set to "Never"
- Verify required properties exist in Notion database
- Review browser console for error messages
- Try manual sync first to isolate issues

**Missing Data**
- Ensure all optional properties exist in Notion database
- Check property types match expected format (Title, Rich Text, etc.)
- Verify database has correct permissions

**Performance Issues**
- Reduce auto-sync frequency
- Check for large numbers of tasks (1000+ may be slow)
- Disable logging in production use
- Monitor network connection stability

### Debug Mode

Enable detailed logging by checking "Enable Logging" in the plugin configuration. This will show:
- API requests and responses
- Data mapping operations
- Sync statistics and timing
- Error details and stack traces

## 🚀 Roadmap

### Planned Features

- **🔄 Subtask Support**: Sync nested tasks and subtasks
- **📁 Multiple Databases**: Support for multiple Notion databases
- **⚡ Real-time Sync**: WebSocket/webhook integration for instant updates

### Known Limitations

- Large datasets (1000+ tasks) may sync slowly
- Complex nested data structures not fully supported
- Manual conflict resolution required for simultaneous edits
- Network connectivity issues may cause sync delays

## 📞 Support

### Getting Help

1. **Check Documentation**: Review this README and docs/ folder
2. **Enable Debug Logging**: Turn on logging to see detailed operation info
3. **Test Components**: Use "Test Connection" and manual sync to isolate issues
4. **Report Issues**: Create detailed bug reports with steps to reproduce

### Bug Reports Should Include

- Super Productivity version
- Plugin version
- Operating system
- Browser (if web version)
- Steps to reproduce
- Error messages from console
- Configuration (without API key)

---

**⚠️ Alpha Notice**: This plugin is under active development. Features may change, and bugs are expected. Please backup your data and use with caution in production workflows.

**📧 Feedback**: Issues and feedback are welcome! Please test thoroughly and report any problems you encounter.