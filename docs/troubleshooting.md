# Troubleshooting Guide

This comprehensive troubleshooting guide helps you diagnose and resolve common issues with the Notion Sync Plugin.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

- [ ] Plugin is enabled in Super Productivity settings
- [ ] API key starts with `ntn_` and is valid
- [ ] Database is shared with integration (Edit permissions)
- [ ] Database ID is correct UUID format
- [ ] Required properties exist in Notion database (Name, SP Task ID, Complete)
- [ ] Internet connection is stable
- [ ] Browser console shows no critical errors

## Common Issues and Solutions

### 1. Connection Problems

#### Issue: "Connection Failed" Status
**Symptoms**:
- Status indicator shows "Not Connected" or "Connection Failed"
- Test connection button shows error messages
- Manual sync fails immediately

**Possible Causes & Solutions**:

**Incorrect API Key**
```
Error: "Invalid API key" or "Unauthorized"
Solution:
1. Go to notion.so/my-integrations
2. Copy the integration token again
3. Ensure it starts with "ntn_"
4. Paste into plugin configuration
5. Save and test again
```

**Wrong Database ID**
```
Error: "Database not found" or "Object not found"
Solution:
1. Open your Notion database in browser
2. Copy URL: https://notion.so/workspace/Tasks-[DATABASE-ID]?v=...
3. Extract the ID between last "/" and "?"
4. Remove hyphens if they exist in URL
5. Use clean UUID format: 12345678-1234-1234-1234-123456789012
```

**Database Not Shared**
```
Error: "Insufficient permissions" or "Access denied"
Solution:
1. Open your database in Notion
2. Click "Share" (top-right)
3. Click "Invite"
4. Add your integration
5. Set permission to "Edit"
6. Confirm invitation
```

**Network Issues**
```
Error: "Network error" or "Timeout"
Solution:
1. Check internet connection
2. Disable VPN temporarily
3. Check firewall settings
4. Try different network
5. Verify Notion.com is accessible
```

#### Issue: Connection Works But Sync Fails
**Symptoms**:
- Test connection succeeds
- Manual sync starts but fails
- Partial sync results

**Solutions**:
1. **Check Database Schema**:
   ```
   Required properties:
   - Name (Title)
   - SP Task ID (Rich Text)
   - Complete (Checkbox)
   ```

2. **Verify Property Types**:
   - Open database in Notion
   - Check each property type matches requirements
   - Fix any mismatched types

3. **Check Integration Permissions**:
   - Ensure integration can "Insert content"
   - Verify "Update content" permission
   - Re-share database if needed

### 2. Sync Issues

#### Issue: Tasks Not Syncing from SP to Notion
**Symptoms**:
- Manual sync completes without errors
- No new tasks appear in Notion
- SP Task ID field remains empty

**Diagnostic Steps**:
1. **Enable Debug Logging**:
   ```
   1. Check "Enable Logging" in plugin
   2. Open browser console (F12)
   3. Perform manual sync
   4. Look for error messages
   ```

2. **Check Task Creation**:
   ```javascript
   // Look for these log messages:
   "[Notion Sync] Creating task in Notion: [task-title]"
   "[Notion Sync] Task created successfully"
   // Or error messages like:
   "[Notion Sync] Failed to create task: [error]"
   ```

**Common Causes & Solutions**:

**Property Validation Errors**
```
Error: "Property validation failed"
Solution:
1. Check required properties exist
2. Verify property types are correct
3. Ensure no duplicate property names
4. Check for special characters in property names
```

**Data Format Issues**
```
Error: "Invalid property value"
Solution:
1. Check for very long task titles (>2000 chars)
2. Verify date formats are valid
3. Check for null/undefined values
4. Validate priority values match options
```

**Rate Limiting**
```
Error: "Rate limit exceeded" or 429 status
Solution:
1. Wait 60 seconds before retrying
2. Reduce auto-sync frequency
3. Avoid rapid manual syncs
4. Check for multiple sync processes
```

#### Issue: Tasks Not Syncing from Notion to SP
**Symptoms**:
- Notion tasks exist but don't appear in SP
- Changes in Notion don't update SP
- One-way sync only

**Diagnostic Steps**:
1. **Check SP Task ID Field**:
   ```
   - New Notion tasks should have empty SP Task ID
   - Existing tasks should have UUID in SP Task ID
   - Never manually edit SP Task ID field
   ```

2. **Verify Task Creation Permissions**:
   ```
   Plugin needs these permissions:
   - addTask
   - updateTask
   - getTasks
   ```

**Solutions**:

**Missing SP Task ID Mapping**
```
Problem: Tasks exist in both but aren't linked
Solution:
1. Check SP Task ID field in Notion
2. If empty for existing tasks, sync mapping is broken
3. Consider clearing mappings and re-syncing:
   - Export configuration first
   - Clear plugin data
   - Reconfigure and sync
```

**Super Productivity Permission Issues**
```
Error: "Permission denied" in console
Solution:
1. Check plugin manifest.json has correct permissions
2. Reload plugin in SP settings
3. Restart Super Productivity
4. Re-enable plugin
```

#### Issue: Duplicate Tasks Created
**Symptoms**:
- Same task appears multiple times
- Sync creates new tasks instead of updating
- SP Task ID field inconsistencies

**Causes & Solutions**:

**Broken Sync Mappings**
```
Problem: Plugin loses track of task relationships
Solution:
1. Export current configuration
2. In plugin console, check:
   console.log('Sync mappings:', [...syncMappings.entries()]);
3. If mappings are empty or wrong, reset:
   - Clear plugin data
   - Reconfigure
   - Perform fresh sync
```

**Concurrent Sync Operations**
```
Problem: Multiple syncs running simultaneously
Solution:
1. Wait for current sync to complete
2. Avoid clicking manual sync repeatedly
3. Check auto-sync interval isn't too short
4. Disable auto-sync temporarily if needed
```

### 3. Performance Issues

#### Issue: Slow Sync Performance
**Symptoms**:
- Sync takes longer than 30 seconds
- Browser becomes unresponsive
- Timeout errors

**Diagnostic Steps**:
1. **Monitor Sync Duration**:
   ```javascript
   // Enable logging and look for:
   "[Notion Sync] Sync completed in [X]ms"
   "[Notion Sync] Processing [X] tasks"
   ```

2. **Check Data Volume**:
   ```
   Count total tasks in SP and Notion
   Large datasets (>1000 tasks) may be slow
   ```

**Solutions**:

**Large Dataset Optimization**
```
For 1000+ tasks:
1. Archive completed tasks in both SP and Notion
2. Use database filters to limit sync scope
3. Increase auto-sync interval (30min+)
4. Consider splitting into multiple databases
```

**Network Optimization**
```
1. Use stable, fast internet connection
2. Close other bandwidth-heavy applications
3. Sync during off-peak hours
4. Consider geographic proximity to Notion servers
```

**Browser Performance**
```
1. Close unnecessary browser tabs
2. Disable browser extensions temporarily
3. Clear browser cache and storage
4. Use Chrome/Firefox for best performance
```

#### Issue: High Memory Usage
**Symptoms**:
- Browser tab consumes excessive RAM
- System becomes slow during sync
- Browser crashes during large syncs

**Solutions**:
1. **Reduce Sync Scope**:
   ```
   - Archive old completed tasks
   - Use database views to limit data
   - Sync smaller batches more frequently
   ```

2. **Browser Optimization**:
   ```
   - Restart browser before large syncs
   - Disable browser extensions
   - Use incognito/private mode
   - Monitor memory in browser dev tools
   ```

### 4. Data Integrity Issues

#### Issue: Data Loss or Corruption
**Symptoms**:
- Tasks disappear from SP or Notion
- Task data becomes corrupted
- Sync mappings lost

**Emergency Recovery**:
1. **Stop All Sync Operations**:
   ```
   - Disable auto-sync immediately
   - Don't perform manual syncs
   - Disable plugin if necessary
   ```

2. **Backup Current State**:
   ```
   - Export SP data
   - Export Notion database
   - Export plugin configuration
   ```

3. **Assess Damage**:
   ```
   - Compare SP and Notion task counts
   - Check for duplicate tasks
   - Verify critical task data
   ```

**Recovery Strategies**:

**Restore from Backups**
```
If you have recent backups:
1. Restore SP from backup
2. Restore Notion from backup
3. Reconfigure plugin
4. Test with small dataset first
```

**Manual Data Reconciliation**
```
If no backups available:
1. List all tasks in both systems
2. Identify missing or duplicate tasks
3. Manually merge data
4. Clear plugin mappings
5. Reconfigure and test sync
```

#### Issue: Incorrect Data Mapping
**Symptoms**:
- Wrong task properties synced
- Data types not converting correctly
- Missing or corrupted property values

**Diagnostic Steps**:
1. **Check Property Mapping**:
   ```javascript
   // In console, inspect task data:
   console.log('SP Task:', task);
   console.log('Notion Properties:', notionProperties);
   ```

2. **Verify Property Types**:
   ```
   Ensure Notion properties match expected types:
   - Priority: Select with Urgent/High/Medium/Low
   - Time Estimate: Number
   - Scheduling: Date
   ```

**Solutions**:

**Fix Property Mapping**
```
1. Check Notion database property names (case-sensitive)
2. Verify property types match requirements
3. Update property configurations if needed
4. Test with single task first
```

**Data Conversion Issues**
```
Common problems:
- Time values: Check ms to hours conversion
- Dates: Verify timezone handling
- Priority: Ensure options exist in Notion
- Text: Check for special characters
```

### 5. Auto-Sync Issues

#### Issue: Auto-Sync Not Running
**Symptoms**:
- Manual sync works but auto-sync doesn't
- No automatic updates
- Timer not starting

**Diagnostic Steps**:
1. **Check Configuration**:
   ```
   - Auto-sync interval > 0
   - Plugin is configured
   - No error messages in console
   ```

2. **Monitor Timer Status**:
   ```javascript
   // In console:
   console.log('Auto-sync timer active:', !!autoSyncTimer);
   console.log('Auto-sync interval:', pluginConfig.autoSyncInterval);
   ```

**Solutions**:

**Configuration Issues**
```
1. Verify auto-sync interval is not "Never"
2. Check plugin is marked as "configured"
3. Save configuration again
4. Test manual sync first
```

**Timer Problems**
```
1. Disable and re-enable auto-sync
2. Change interval and change back
3. Reload plugin or restart SP
4. Check for JavaScript errors
```

#### Issue: Auto-Sync Running Too Frequently
**Symptoms**:
- Sync happens more often than configured
- Rate limiting errors
- Performance issues

**Diagnostic Steps**:
1. **Check Console Logs**:
   ```javascript
   // Look for rapid sync messages:
   "[Notion Sync] Auto-sync starting..."
   "[Notion Sync] Rate limited, skipping sync"
   ```

2. **Monitor Sync Frequency**:
   ```
   Note timestamps of sync operations
   Calculate actual vs configured intervals
   ```

**Solutions**:
```
1. Check auto-sync interval setting
2. Look for configuration monitoring issues
3. Disable auto-sync temporarily
4. Clear plugin data and reconfigure
5. Update to latest plugin version
```

### 6. Error Messages Reference

#### Common Error Messages and Solutions

**"Cannot read properties of null"**
```
Cause: PluginAPI not available when expected
Solution:
1. Ensure Super Productivity is fully loaded
2. Wait a few seconds and try again
3. Reload the plugin
4. Check SP version compatibility
```

**"Network request failed"**
```
Cause: Internet connectivity or firewall issues
Solution:
1. Check internet connection
2. Verify notion.com is accessible
3. Disable VPN/proxy temporarily
4. Check firewall settings
```

**"Property validation failed"**
```
Cause: Data doesn't match Notion property requirements
Solution:
1. Check property types in Notion database
2. Verify required properties exist
3. Check for data format issues
4. Validate property names are exact matches
```

**"Rate limit exceeded"**
```
Cause: Too many API requests to Notion
Solution:
1. Wait 60 seconds before retrying
2. Reduce sync frequency
3. Check for multiple sync processes
4. Contact Notion if persistent
```

**"Insufficient permissions"**
```
Cause: Integration doesn't have database access
Solution:
1. Re-share database with integration
2. Ensure "Edit" permissions granted
3. Check integration is in correct workspace
4. Verify database still exists
```

## Debug Mode Usage

### Enable Debug Logging
1. Check "Enable Logging" in plugin configuration
2. Open browser developer console (F12)
3. Perform the problematic operation
4. Review console output for errors

### Understanding Log Messages

**Normal Operation Logs**:
```
[Notion Sync] Plugin initialized successfully
[Notion Sync] Auto-sync started with 10 minute interval
[Notion Sync] Manual sync completed: {results}
```

**Warning Logs**:
```
[Notion Sync] Rate limited, wait 5 seconds
[Notion Sync] Configuration changed, updating auto-sync
[Notion Sync] No saved data found, creating defaults
```

**Error Logs**:
```
[Notion Sync] Sync failed: [specific error message]
[Notion Sync] Failed to load configuration: [error]
[Notion Sync] Database not found: [database-id]
```

### Advanced Debugging

**Check Plugin State**:
```javascript
// In browser console:
console.log('Plugin config:', pluginConfig);
console.log('Sync mappings:', Object.fromEntries(syncMappings));
console.log('Last sync time:', new Date(lastSyncTime));
```

**Test API Connection**:
```javascript
// Test Notion API directly:
fetch('https://api.notion.com/v1/users/me', {
    headers: {
        'Authorization': 'Bearer ' + pluginConfig.apiKey,
        'Notion-Version': '2022-06-28'
    }
}).then(r => r.json()).then(console.log);
```

**Monitor Sync Process**:
```javascript
// Enable detailed sync logging:
pluginConfig.enableLogging = true;
// Then perform sync and watch console
```

## Recovery Procedures

### Complete Plugin Reset
If all else fails, perform a complete reset:

1. **Backup Critical Data**:
   ```
   - Export SP tasks
   - Export Notion database
   - Export plugin configuration
   ```

2. **Reset Plugin**:
   ```
   - Disable plugin in SP settings
   - Clear browser cache/storage
   - Re-enable plugin
   - Reconfigure from scratch
   ```

3. **Gradual Re-sync**:
   ```
   - Start with small test dataset
   - Verify sync works correctly
   - Gradually increase data volume
   ```

### Partial Reset Options

**Clear Sync Mappings Only**:
```javascript
// In console (use with caution):
syncMappings.clear();
// Then save configuration to persist
```

**Reset Configuration Only**:
```
1. Clear all form fields in plugin UI
2. Save configuration
3. Reconfigure with correct values
```

**Reset Auto-sync Only**:
```
1. Set auto-sync to "Never"
2. Save configuration
3. Set back to desired interval
4. Save again
```

## Getting Additional Help

### Information to Collect
When seeking help, gather this information:

**System Information**:
- Super Productivity version
- Plugin version
- Operating system and browser
- Internet connection type

**Configuration Details**:
- Auto-sync interval setting
- Number of tasks in SP and Notion
- Database schema (property names and types)
- Recent changes to setup

**Error Information**:
- Exact error messages
- Console log output
- Steps to reproduce
- When the issue started

### Support Resources
1. **Plugin Documentation**: Review all docs/ files
2. **Super Productivity Support**: For SP-specific issues
3. **Notion Support**: For Notion API issues
4. **Community Forums**: For user experiences and tips

### Prevention Best Practices
1. **Regular Backups**: Export configuration and data weekly
2. **Gradual Changes**: Test changes with small datasets first
3. **Monitor Performance**: Watch sync duration and frequency
4. **Stay Updated**: Keep SP and plugin versions current
5. **Document Setup**: Record your specific configuration details

This troubleshooting guide should help you resolve most common issues. For complex problems, don't hesitate to start with a complete reset and gradual reconfiguration.