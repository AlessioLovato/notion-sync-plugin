# Configuration Guide

This comprehensive guide walks you through setting up and configuring the Notion Sync Plugin for optimal performance and functionality.

## Prerequisites

Before starting, ensure you have:

- **Super Productivity** v14.0.0 or higher
- **Notion workspace** with database creation permissions
- **Admin access** to create Notion integrations
- **Stable internet connection** for API operations

## Step 1: Create Notion Integration

### 1.1 Access Notion Integrations
1. Open your web browser
2. Navigate to [notion.so/my-integrations](https://notion.so/my-integrations)
3. Log in to your Notion account if prompted

### 1.2 Create New Integration
1. Click **"New integration"**
2. Fill in the integration details:
   - **Name**: `Super Productivity Sync` (or your preferred name)
   - **Logo**: Upload a logo (optional)
   - **Associated workspace**: Select your target workspace
3. Click **"Submit"** to create the integration

### 1.3 Copy API Key
1. After creation, you'll see your integration page
2. Under **"Secrets"**, find the **"Internal Integration Token"**
3. Click **"Show"** and copy the token
4. **Important**: This token starts with `ntn_` and should be kept secure

### 1.4 Integration Capabilities
Your integration will have these default capabilities:
- **Read content**
- **Update content**
- **Insert content**

These are sufficient for the plugin to function properly.

## Step 2: Prepare Notion Database

### 2.1 Create Tasks Database

#### Option A: Create from Template
1. In Notion, create a new page
2. Type `/database` and select **"Table - Full page"**
3. Name your database (e.g., "Tasks", "Super Productivity Tasks")

#### Option B: Use Existing Database
If you have an existing tasks database, ensure it meets the requirements outlined in the next section.

### 2.2 Configure Required Properties

Add these **required** properties to your database:

#### Name (Title) - Already exists
- **Type**: Title
- **Purpose**: Task title
- **No changes needed** - this is the default property

#### SP Task ID (Rich Text)
1. Click **"+"** to add a new property
2. **Property name**: `SP Task ID` (exact spelling required)
3. **Property type**: Rich Text
4. Click **"Create"**

#### Complete (Checkbox)
1. Add another property
2. **Property name**: `Complete` (exact spelling required)
3. **Property type**: Checkbox
4. Click **"Create"**

#### Status (Status)
1. **Property name**: `Status`
2. **Property type**: Status
3. **Options**: Create these status options:
   - Not started
   - In progress
   - Complete
   - Cancelled

#### Scheduling (Date)
1. **Property name**: `Scheduling`
2. **Property type**: Date
3. **Include time**: Enable for date + time support

#### Time Estimate (Number)
1. **Property name**: `Time Estimate`
2. **Property type**: Number
3. **Format**: Number (represents hours)

#### Time Spent (Number)
1. **Property name**: `Time Spent`
2. **Property type**: Number
3. **Format**: Number (represents hours)

#### Task Type (Multi-select)
1. **Property name**: `Task Type`
2. **Property type**: Multi-select
3. **Options**: Leave empty initially (will be populated from SP tags)


### 2.4 Share Database with Integration

1. In your database, click **"Share"** (top-right corner)
2. Click **"Invite"**
3. Search for your integration name
4. Select your integration from the dropdown
5. **Permission level**: Choose **"Edit"**
6. Click **"Invite"**

### 2.5 Copy Database ID

1. Copy the database URL from your browser
2. The database ID is the long string between the last `/` and the `?`
3. Example URL: `https://notion.so/yourworkspace/Tasks-2746194e719981839cd6cacb567b74e0`
4. Database ID: `2746194e-7199-8183-9cd6-cacb567b74e0`
5. **Note**: Hyphens may or may not be present in the URL

## Step 3: Create Projects Database (Optional)

If you want to sync Super Productivity projects with Notion:

### 3.1 Create Projects Database
1. Create a new database named "Projects" or similar
2. Add required properties:
   - **Name** (Title) - default property

### 3.3 Share and Get Database ID
Follow the same sharing and ID extraction process as with the tasks database.

## Step 4: Install Plugin

### 4.1 Download Plugin
1. Download the plugin files to your local machine
2. Ensure all files are in a single folder:
   - `manifest.json`
   - `plugin.js`
   - `index.html`
   - `icon.svg`

### 4.2 Load in Super Productivity
1. Open Super Productivity
2. Go to **Settings** → **Plugins**
3. Click **"Load Plugin"** or similar option
4. Select the plugin folder
5. The plugin should appear in your plugins list

### 4.3 Enable Plugin
1. Find "Notion Sync Plugin" in your plugins list
2. Enable the plugin
3. You should see a new icon in your side panel

## Step 5: Configure Plugin

### 5.1 Open Plugin Configuration
1. Click the Notion Sync Plugin icon in the side panel
2. The configuration interface will open

### 5.2 Enter Basic Configuration

#### API Key
1. Paste your Notion integration API key (from Step 1.3)
2. Ensure it starts with `ntn_`

#### Tasks Database ID
1. Paste your tasks database ID (from Step 2.5)
2. Remove any hyphens if present in the URL version

#### Projects Database ID (Optional)
1. If you created a projects database, paste its ID here
2. Leave blank if you don't want project sync

### 5.3 Configure Auto-Sync
1. **Auto-Sync Interval**: Choose your preferred frequency:
   - **Never**: Disable auto-sync (manual only)
   - **Every 5 minutes**: Frequent sync for active workflows
   - **Every 10 minutes**: Recommended default
   - **Every 15 minutes**: Balanced approach
   - **Every 30 minutes**: Less frequent updates
   - **Every hour**: Minimal sync frequency
   - **Every 2 hours**: Least frequent option

### 5.4 Additional Settings
- **Enable Logging**: Keep checked for troubleshooting
- This creates detailed logs in the browser console

## Step 6: Test Configuration

### 6.1 Test Connection
1. Click **"Test Connection"** button
2. Wait for the response
3. **Success**: You'll see "Connection test successful!"
4. **Failure**: Check error message and verify:
   - API key is correct
   - Database ID is correct
   - Database is shared with integration
   - Integration has Edit permissions

### 6.2 Save Configuration
1. Click **"Save Configuration"**
2. Verify the status indicator shows "Connected"

### 6.3 Discover Databases (Optional)
1. Click **"Discover Databases"** to auto-find databases
2. This will search for databases with common task-related names
3. Review the console logs for discovery results

## Step 7: Perform First Sync

### 7.1 Manual Sync
1. Use the **"Sync Notion"** button in the Super Productivity header
2. Alternatively, use the manual sync button in the plugin interface
3. Watch for progress notifications

### 7.2 Verify Sync Results
1. Check your Notion database for new tasks
2. Verify that SP Task ID fields are populated
3. Check Super Productivity for any new tasks from Notion

### 7.3 Enable Auto-Sync
1. If manual sync worked correctly, auto-sync should work automatically
2. Monitor the first few auto-sync cycles
3. Check console logs if needed

## Advanced Configuration

### Import/Export Configuration

#### Export Configuration
1. Click **"Export Configuration"**
2. Save the JSON file to a secure location
3. **Note**: This includes your API key

#### Import Configuration
1. Click **"Import Configuration"**
2. Select a previously exported JSON file
3. Verify settings and save

### Troubleshooting Configuration

#### Enable Debug Mode
1. Check **"Enable Logging"** in the plugin interface
2. Open browser developer console (F12)
3. Watch for detailed sync information

#### Clear Configuration
1. If you need to start over, clear the form fields
2. Save configuration with empty values
3. Reconfigure from scratch

#### Reset Plugin Data
1. If experiencing persistent issues:
   - Disable the plugin
   - Clear browser cache/storage
   - Re-enable and reconfigure

## Configuration Best Practices

### Security
1. **Never share** your API key publicly
2. **Backup** your configuration regularly
3. **Rotate** API keys periodically for security

### Performance
1. **Start with longer intervals** (15-30 minutes) for auto-sync
2. **Monitor** sync performance and adjust as needed
3. **Use manual sync** for immediate needs

### Data Management
1. **Test** with a small number of tasks initially
2. **Backup** both SP and Notion data before large syncs
3. **Archive** old completed tasks to improve performance

### Workflow Integration
1. **Establish** consistent naming conventions
2. **Train** team members on the sync behavior
3. **Document** your specific configuration for team reference

## Common Configuration Issues

### "Invalid API Key" Error
- **Cause**: Incorrect or malformed API key
- **Solution**: Re-copy the key from Notion integrations page

### "Database not found" Error
- **Cause**: Incorrect database ID or permissions
- **Solution**: Verify ID format and sharing permissions

### "Connection timeout" Error
- **Cause**: Network connectivity issues
- **Solution**: Check internet connection and firewall settings

### Sync not working after configuration
- **Cause**: Various possibilities
- **Solution**: Enable logging and check console for specific errors

For detailed troubleshooting, see the [troubleshooting guide](troubleshooting.md).

## Maintenance

### Regular Tasks
1. **Monitor** sync performance weekly
2. **Check** for plugin updates monthly
3. **Review** and cleanup old task mappings quarterly

### Performance Monitoring
1. **Watch** sync duration in console logs
2. **Adjust** auto-sync frequency if performance degrades
3. **Archive** completed tasks to maintain performance

### Updates and Changes
1. **Test** configuration after Super Productivity updates
2. **Verify** Notion API compatibility with plugin updates
3. **Update** documentation when changing team workflows

This configuration guide should help you set up the plugin successfully. For additional help, refer to the other documentation files in the `docs/` folder.