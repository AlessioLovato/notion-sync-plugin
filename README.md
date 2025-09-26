# 📋 Notion Sync Plugin for Super Productivity

A powerful bidirectional synchronization plugin that connects your Super Productivity tasks with Notion databases, enabling seamless workflow integration between both platforms.

## ✨ Features

- **🔄 Bidirectional Sync**: Keep tasks synchronized between Super Productivity and Notion in real-time
- **⚡ Auto-Sync**: Configurable automatic synchronization with customizable intervals
- **🎯 Manual Sync**: On-demand synchronization with progress feedback
- **🔧 Conflict Resolution**: Multiple strategies for handling sync conflicts
- **📊 Rich Data Mapping**: Comprehensive property mapping between SP and Notion
- **🎨 User-Friendly UI**: Intuitive configuration interface with real-time status updates
- **📈 Sync Statistics**: Detailed insights into sync operations and task mappings
- **🛡️ Error Handling**: Robust error handling with retry logic and clear feedback

## 🚀 Quick Start

### Prerequisites

- Super Productivity version 14.0.0 or higher
- Notion workspace with a tasks database
- Notion integration with API access

### Installation

1. **Create Notion Integration**
   - Go to [notion.so/my-integrations](https://notion.so/my-integrations)
   - Create a new integration
   - Copy the API key (starts with `ntn_`)

2. **Setup Notion Database**
   - Create or use existing tasks database in Notion
   - Share database with your integration (Edit permissions)
   - Copy the database ID from the URL

3. **Install Plugin**
   - Load the plugin folder in Super Productivity
   - Go to Settings → Plugins
   - Enable "Notion Sync Plugin"

4. **Configure Plugin**
   - Click the sync icon in the side panel
   - Enter your Notion API key and database ID
   - Test connection and save configuration

### First Sync

1. Click "Manual Sync" to perform initial synchronization
2. Existing tasks will be synced between both platforms
3. Enable auto-sync for continuous synchronization

## 📖 Configuration Guide

### Connection Settings

| Setting | Description |
|---------|-------------|
| **API Key** | Your Notion integration API key |
| **Database ID** | The ID of your Notion tasks database |

### Sync Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **Auto Sync** | Enabled/Disabled | Automatic synchronization |
| **Sync Interval** | 1-60 minutes | How often to sync automatically |
| **Conflict Resolution** | Last Modified/SP Wins/Notion Wins/Prompt | How to handle conflicts |
| **Sync Tags** | Enabled/Disabled | Map SP tags to Notion Task Type |
| **Sync Projects** | Enabled/Disabled | Map SP projects to Notion Areas |
| **Debug Mode** | Enabled/Disabled | Enable detailed logging |

### Conflict Resolution Strategies

- **Last Modified Wins**: Newer changes overwrite older ones (default)
- **Super Productivity Wins**: SP changes always take precedence
- **Notion Wins**: Notion changes always take precedence
- **Prompt User**: Ask user to choose on conflicts

## 🗺️ Data Mapping

### Super Productivity → Notion

| SP Property | Notion Property | Type | Notes |
|-------------|-----------------|------|-------|
| Title | Name | Title | Task title |
| Notes | Notes | Rich Text | Task description |
| isDone | Complete | Checkbox | Completion status |
| isDone | Status | Status | Alternative completion indicator |
| Priority | Priority | Select | URGENT/HIGH/MEDIUM/LOW |
| timeEstimate | Time Estimate | Number | Converted from ms to hours |
| timeSpent | Time Spent | Number | Converted from ms to hours |
| plannedAt | Scheduling | Date | Planned date/time |
| projectId | Areas | Relation | Project assignment |
| tagIds | Task Type | Multi-select | Tag assignments |
| id | SP Task ID | Rich Text | Internal mapping |

### Notion → Super Productivity

| Notion Property | SP Property | Type | Notes |
|----------------|-------------|------|-------|
| Name | title | String | Task title |
| Notes | notes | String | Task description |
| Complete | isDone | Boolean | Primary completion status |
| Status | isDone | Boolean | Alternative completion status |
| Priority | priority | Enum | Converted to SP priority levels |
| Time Estimate | timeEstimate | Number | Converted from hours to ms |
| Time Spent | timeSpent | Number | Converted from hours to ms |
| Scheduling | plannedAt | Number | Timestamp |
| Areas | projectId | String | Project assignment |
| Task Type | tagIds | Array | Tag assignments |

## 🛠️ Required Notion Database Schema

Your Notion database must have the following properties:

### Required Properties

- **Name** (Title) - Task title
- **SP Task ID** (Rich Text) - Super Productivity task identifier
- **Complete** (Checkbox) - Task completion status

### Optional Properties

- **Notes** (Rich Text) - Task description
- **Status** (Status) - Alternative completion indicator
- **Priority** (Select) - Task priority (Urgent, High, Medium, Low)
- **Scheduling** (Date) - Planned date/time
- **Time Estimate** (Number) - Estimated hours
- **Time Spent** (Number) - Actual hours spent
- **Task Type** (Multi-select) - Task categories/tags
- **Areas** (Relation) - Project/area assignment
- **Projects** (Relation) - Project assignment

## 🎛️ User Interface Guide

### Main Dashboard

- **Connection Status**: Shows connection state to Notion
- **Sync Statistics**: Displays mapped tasks, last sync time, and auto-sync status
- **Manual Sync Button**: Trigger immediate synchronization
- **Test Connection**: Verify Notion API connection

### Configuration Panel

- **API Settings**: Configure Notion integration details
- **Sync Preferences**: Set auto-sync and conflict resolution
- **Feature Toggles**: Enable/disable specific sync features

### Advanced Options

- **Clear Mappings**: Remove all task mapping relationships
- **Export/Import Mappings**: Backup and restore task mappings
- **Reset Configuration**: Restore default settings

### Sync Log

- **Real-time Logging**: View sync operations as they happen
- **Error Messages**: Detailed information about sync issues
- **Debug Information**: Additional details when debug mode enabled

## 🔧 Troubleshooting

### Common Issues

#### Connection Problems

**Symptom**: "Connection Failed" status
**Solutions**:
- Verify API key is correct and active
- Ensure database is shared with integration
- Check network connectivity
- Confirm database ID format

#### Sync Failures

**Symptom**: Tasks not syncing or errors during sync
**Solutions**:
- Check database permissions (Edit access required)
- Verify all required properties exist in Notion database
- Review sync log for specific error messages
- Test with a simple task first

#### Missing Data

**Symptom**: Some task properties not syncing
**Solutions**:
- Ensure all optional properties exist in Notion database
- Check property types match expected format
- Verify feature toggles are enabled (tags, projects)
- Review data mapping compatibility

#### Performance Issues

**Symptom**: Slow sync or UI responsiveness
**Solutions**:
- Reduce auto-sync frequency
- Clear unnecessary task mappings
- Disable debug mode
- Sync smaller batches of tasks

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid API key" | Incorrect or expired key | Generate new integration key |
| "Database not found" | Wrong ID or no access | Check ID and share database |
| "Rate limit exceeded" | Too many API calls | Wait and reduce sync frequency |
| "Property not found" | Missing database property | Add required property to database |
| "Conflict detected" | Simultaneous changes | Choose conflict resolution |

### Debug Mode

Enable debug mode for detailed logging:

1. Open plugin configuration
2. Check "Enable debug logging"
3. Save configuration
4. Review sync log for detailed information

## 🔒 Security & Privacy

- **API Keys**: Stored locally, never transmitted to third parties
- **Data Handling**: All sync operations are direct between your devices and Notion
- **Permissions**: Plugin only requests necessary Super Productivity permissions
- **Local Storage**: Configuration and mappings stored in Super Productivity's secure storage

## 🚀 Performance Guidelines

### Optimal Setup

- **Database Size**: Works efficiently with up to 1000+ tasks
- **Sync Frequency**: 5-15 minutes for most use cases
- **Property Usage**: Use only required properties for better performance
- **Network**: Stable internet connection recommended

### Performance Tips

1. Start with manual sync to establish initial mappings
2. Use auto-sync intervals appropriate for your workflow
3. Regularly clean up completed/archived tasks
4. Monitor sync log for performance warnings
5. Disable debug mode in production use

## 🛣️ Roadmap

### Planned Features

- **🔄 Subtask Sync**: Support for nested tasks and subtasks
- **📁 Multiple Databases**: Sync with multiple Notion databases
- **🏷️ Advanced Tag Mapping**: Custom tag mapping rules
- **📊 Sync Analytics**: Detailed sync performance metrics
- **🔐 Enhanced Security**: OAuth integration support
- **📱 Mobile Optimization**: Better mobile device support

### Version History

- **v1.0.0**: Initial release with core bidirectional sync
- Future versions will be documented here

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup

1. Clone the repository
2. Follow Super Productivity plugin development guidelines
3. Use the test plan for verification
4. Reference the CLAUDE.md for AI-assisted development

## 📄 License

This plugin is released under the MIT License. See LICENSE file for details.

## 🆘 Support

### Getting Help

1. **Documentation**: Check this README and TEST_PLAN.md
2. **Issues**: Report bugs via GitHub issues
3. **Discussions**: Join community discussions
4. **Email**: Contact plugin maintainers

### Reporting Bugs

When reporting bugs, please include:

- Super Productivity version
- Plugin version
- Operating system
- Steps to reproduce
- Error messages or logs
- Screenshots if applicable

### Feature Requests

Feature requests are welcome! Please:

- Check existing requests first
- Describe the use case clearly
- Explain the expected behavior
- Consider implementation complexity

## 🙏 Acknowledgments

- Super Productivity team for the excellent plugin API
- Notion team for the comprehensive API
- Community contributors and testers
- Open source libraries used in development

---

**📧 Contact**: For questions or support, please open an issue on GitHub.

**🌟 Star**: If you find this plugin useful, please star the repository!

**🔄 Updates**: Watch the repository for updates and new features.