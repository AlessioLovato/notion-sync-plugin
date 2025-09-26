# CLAUDE.md - Notion Sync Plugin

This file provides guidance to Claude Code when working with the Notion Sync Plugin for Super Productivity.

## Project Overview

The Notion Sync Plugin enables bidirectional synchronization between Super Productivity tasks and Notion databases. It provides real-time sync capabilities, conflict resolution, and a comprehensive user interface for configuration and monitoring.

## Architecture

### Core Components

1. **plugin.js**: Main plugin logic with sync engine and API integration
2. **index.html**: User interface for configuration and monitoring
3. **manifest.json**: Plugin metadata and permissions
4. **icon.svg**: Plugin visual identifier

### Key Features

- **Bidirectional Sync**: SP ↔ Notion task synchronization
- **Auto-sync**: Configurable automatic synchronization
- **Conflict Resolution**: Multiple strategies for handling conflicts
- **Rich Data Mapping**: Comprehensive property mapping
- **Error Handling**: Robust error handling with retry logic

## Development Guidelines

### Code Style

- Use modern JavaScript (ES6+) features
- Maintain clear separation between API logic and UI
- Follow Super Productivity plugin patterns
- Use meaningful variable names and comments
- Handle errors gracefully with user feedback

### Plugin Structure

```
notion-sync-plugin/
├── manifest.json       # Plugin metadata
├── plugin.js          # Main plugin logic
├── index.html         # UI interface
├── icon.svg           # Plugin icon
├── README.md          # User documentation
├── TEST_PLAN.md       # Testing procedures
└── CLAUDE.md          # This file
```

### Configuration Management

The plugin uses Super Productivity's data persistence API:

- `PluginAPI.persistDataSynced()`: Save configuration data
- `PluginAPI.loadSyncedData()`: Load configuration data
- Configuration keys:
  - `notionSyncConfig`: Main plugin settings
  - `notionSyncMappings`: Task ID mappings
  - `notionLastSyncTime`: Last successful sync timestamp

### Notion API Integration

#### API Configuration (Currently Hardcoded)

```javascript
const NOTION_CONFIG = {
  apiKey: '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',
  version: '2022-06-28',
  tasksDatabaseId: '2746194e-7199-8183-86ba-cacb567b74e0',
  projectsDatabaseId: '2746194e-7199-8191-9a6e-d6e91211dd89',
  topicsDatabaseId: '2746194e-7199-8125-9e98-fa50ef225336'
};
```

#### API Helper Function

```javascript
async function notionRequest(endpoint, method = 'GET', body = null) {
  // Handles authentication, headers, and error handling
  // Returns parsed JSON response
}
```

### Data Mapping

#### SP Task to Notion Properties

Key mappings:
- `title` → `Name` (Title)
- `notes` → `Notes` (Rich Text)
- `isDone` → `Complete` (Checkbox) and `Status` (Status)
- `timeEstimate` → `Time Estimate` (Number, ms to hours)
- `timeSpent` → `Time Spent` (Number, ms to hours)
- `priority` → `Priority` (Select)
- `plannedAt` → `Scheduling` (Date)
- `projectId` → `Areas` (Relation)
- `tagIds` → `Task Type` (Multi-select)

#### Notion Page to SP Task

Reverse mapping with proper type conversion and null handling.

### Sync Logic

#### Main Sync Function

```javascript
async function performSync() {
  // 1. Test connection
  // 2. Sync SP tasks to Notion
  // 3. Sync Notion tasks to SP
  // 4. Handle conflicts
  // 5. Update mappings
  // 6. Save state
}
```

#### Conflict Resolution

Four strategies implemented:
1. **lastModifiedWins**: Compare timestamps
2. **spWins**: SP changes take precedence
3. **notionWins**: Notion changes take precedence
4. **prompt**: Ask user to choose

### UI Implementation

#### HTML Structure

- Semantic HTML with accessibility considerations
- Responsive design using CSS Grid and Flexbox
- Form validation and user feedback
- Real-time status updates

#### CSS Guidelines

- Use CSS custom properties for theming
- Mobile-first responsive design
- Consistent spacing and typography
- Material Design inspired components
- Dark/light theme considerations

#### JavaScript Patterns

- Event-driven architecture
- Async/await for API calls
- Error boundaries for robust UX
- Progressive enhancement

### Error Handling

#### Network Errors

- Connection timeout handling
- Rate limiting respect
- Retry logic with exponential backoff
- User-friendly error messages

#### Data Validation

- Type checking for all API responses
- Graceful handling of missing properties
- Validation before saving to SP
- Circular reference prevention

#### User Feedback

- Toast notifications for operations
- Progress indicators for long operations
- Clear error messages with actionable advice
- Status indicators for connection state

## Testing Strategy

### Manual Testing

Use the comprehensive TEST_PLAN.md for manual testing procedures covering:
- Plugin installation and setup
- Configuration management
- Bidirectional sync functionality
- Data mapping and conversion
- Conflict resolution
- Error handling
- Performance testing

### Test Data

Create varied test scenarios:
- Simple tasks (title only)
- Complex tasks (all properties)
- Unicode and special characters
- Large datasets (100+ tasks)
- Edge cases (empty values, very long strings)

### Debugging

Enable debug mode for detailed logging:
```javascript
if (pluginConfig.debugMode) {
  console.log('Debug info:', data);
}
```

## Common Development Tasks

### Adding New Property Mappings

1. Update `spTaskToNotionProperties()` function
2. Update `notionPageToSpTask()` function
3. Add UI configuration if needed
4. Update documentation
5. Add test cases

### Implementing New Conflict Resolution Strategy

1. Add option to `conflictResolution` select
2. Implement logic in sync functions
3. Add user documentation
4. Test with conflicting data

### Performance Optimization

1. Batch API requests when possible
2. Implement proper rate limiting
3. Use efficient data structures
4. Monitor memory usage
5. Optimize UI updates

### Error Handling Enhancement

1. Identify new error scenarios
2. Implement specific handling
3. Provide actionable user messages
4. Log for debugging
5. Test recovery scenarios

## Database Schema Requirements

### Required Notion Database Properties

The plugin expects specific property names and types in the Notion database. When making changes:

1. **Required Properties**:
   - `Name` (Title)
   - `SP Task ID` (Rich Text)
   - `Complete` (Checkbox)

2. **Optional Properties**:
   - `Notes` (Rich Text)
   - `Status` (Status)
   - `Priority` (Select with: Urgent, High, Medium, Low)
   - `Scheduling` (Date)
   - `Time Estimate` (Number)
   - `Time Spent` (Number)
   - `Task Type` (Multi-select)
   - `Areas` (Relation to Areas database)
   - `Projects` (Relation to Projects database)

### Schema Validation

The plugin should validate database schema on connection:
```javascript
async function validateDatabaseSchema(databaseId) {
  // Check required properties exist
  // Validate property types
  // Return validation results
}
```

## Security Considerations

### API Key Management

- Currently hardcoded for development
- Future: User-provided keys stored securely
- Never log or expose API keys
- Validate key format before use

### Data Privacy

- All data remains between user's SP and Notion
- No third-party data transmission
- Local storage for configuration
- Respect user's data deletion requests

### Input Validation

- Sanitize all user inputs
- Validate API responses
- Prevent injection attacks
- Handle malformed data gracefully

## Future Enhancements

### Planned Features

1. **User-Configurable API Keys**: Remove hardcoded credentials
2. **Multiple Database Support**: Sync with multiple Notion databases
3. **Advanced Conflict Resolution**: More sophisticated merge strategies
4. **Subtask Support**: Handle nested task relationships
5. **Batch Operations**: Optimize performance for large datasets
6. **Real-time Sync**: WebSocket or webhook integration
7. **Sync Analytics**: Detailed performance metrics
8. **Mobile Optimization**: Better mobile device support

### Technical Debt

1. **Error Handling**: More specific error types and recovery
2. **Testing**: Automated test suite
3. **Performance**: Benchmark and optimize
4. **Documentation**: API documentation
5. **Security**: Security audit and improvements

## Troubleshooting Guide

### Common Issues

1. **Plugin Not Loading**
   - Check manifest.json syntax
   - Verify minSupVersion compatibility
   - Check console for errors

2. **Sync Failures**
   - Verify API key and permissions
   - Check database schema
   - Review network connectivity

3. **Performance Issues**
   - Reduce sync frequency
   - Clear old mappings
   - Disable debug mode

4. **Data Inconsistencies**
   - Check conflict resolution settings
   - Verify property mappings
   - Review sync logs

### Debug Commands

```javascript
// Check plugin state
console.log('Plugin config:', pluginConfig);
console.log('Sync mappings:', [...syncMappings.entries()]);

// Test Notion connection
testNotionConnection().then(console.log);

// Manual sync with debug
pluginConfig.debugMode = true;
performSync();
```

## Version History

- **v1.0.0**: Initial implementation with core bidirectional sync
- Future versions will be documented here

## Contributing

When contributing to this plugin:

1. Follow the existing code patterns
2. Add appropriate error handling
3. Update tests and documentation
4. Consider performance implications
5. Test thoroughly with the test plan

## Resources

- [Super Productivity Plugin API](https://github.com/johannesjo/super-productivity/blob/master/docs/plugin-development.md)
- [Notion API Documentation](https://developers.notion.com/)
- [Plugin Testing Guidelines](./TEST_PLAN.md)
- [User Documentation](./README.md)

---

**Note**: This file should be updated when making significant changes to the plugin architecture or adding new features.