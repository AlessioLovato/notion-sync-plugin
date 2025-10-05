# Notion Database Structure Guide

This document details the required and optional database properties for the Notion Sync Plugin to function correctly.

## Overview

The plugin uses property names and types to map data between Super Productivity tasks and Notion pages. While the plugin can auto-discover databases, ensuring the correct schema maximizes sync functionality.

## Required Properties

These properties **must** exist in your Notion database for the plugin to function:

### 1. Name (Title)
- **Type**: Title
- **Purpose**: Stores the task title/name
- **Mapping**: Super Productivity `task.title` ↔ Notion `Name`
- **Notes**: Primary identifier for the task

### 2. SP Task ID (Rich Text)
- **Type**: Rich Text
- **Purpose**: Stores Super Productivity task UUID for sync mapping
- **Mapping**: Super Productivity `task.id` ↔ Notion `SP Task ID`
- **Notes**: Essential for bidirectional sync - never edit manually

### 3. Complete (Checkbox)
- **Type**: Checkbox
- **Purpose**: Primary completion status indicator
- **Mapping**: Super Productivity `task.isDone` ↔ Notion `Complete`
- **Notes**: Main completion tracking property

### 4. Status (Status)
- **Type**: Status
- **Purpose**: Alternative completion tracking with workflow states
- **Mapping**: Super Productivity `task.isDone` ↔ Notion `Status`
- **Recommended Options**:
  - Not started
  - In progress
  - Complete
  - Cancelled

### 5. Scheduling (Date)
- **Type**: Date
- **Purpose**: Planned date/time for task execution
- **Mapping**: Super Productivity `task.plannedAt` ↔ Notion `Scheduling`
- **Notes**: Supports both date-only and date-time values

### 6. Time Estimate (Number)
- **Type**: Number
- **Purpose**: Estimated time to complete task
- **Mapping**: Super Productivity `task.timeEstimate` ↔ Notion `Time Estimate`
- **Units**: Hours (converted from SP milliseconds)
- **Format**: Decimal values (e.g., 2.5 for 2 hours 30 minutes)

### 7. Time Spent (Number)
- **Type**: Number
- **Purpose**: Actual time spent on task
- **Mapping**: Super Productivity `task.timeSpent` ↔ Notion `Time Spent`
- **Units**: Hours (converted from SP milliseconds)
- **Format**: Decimal values (e.g., 1.25 for 1 hour 15 minutes)

### 8. Task Type (Multi-select)
- **Type**: Multi-select
- **Purpose**: Task categories/tags
- **Mapping**: Super Productivity `task.tagIds` ↔ Notion `Task Type`
- **Notes**: Options are auto-created when SP tags are synced

### 9. Projects (Relation)
- **Type**: Relation to another database
- **Purpose**: Alternative project linking
- **Mapping**: Super Productivity `task.projectId` ↔ Notion `Projects`
- **Target Database**: Should point to a Projects database

## Projects Database Schema

If using project sync, create a separate Projects database:

### Required Properties
- **Name** (Title) - Project name
- **SP Project ID** (Rich Text) - Super Productivity project UUID

## Schema Validation

The plugin performs automatic schema validation when testing connections:

### Tasks Database Validation
1. Checks for required properties: Name, SP Task ID, Complete
2. Validates property types match expected format
3. Warns about missing optional properties
4. Provides recommendations for improvements

### Auto-Discovery Criteria
The plugin auto-discovers databases by:
1. **Title Analysis**: Looks for databases with titles containing "task", "todo", "activity", etc.
2. **Schema Verification**: Confirms the database has required properties
3. **Access Check**: Verifies the integration has edit permissions

## Common Schema Issues

### Missing Required Properties
**Issue**: Plugin fails to sync or shows "invalid database" errors
**Solution**: Add missing Name, SP Task ID, or Complete properties

### Wrong Property Types
**Issue**: Data not syncing correctly or type conversion errors
**Solution**: Ensure property types match specification (Title, Rich Text, Checkbox, etc.)

### Permission Issues
**Issue**: Plugin can read but not write to database
**Solution**: Share database with integration using "Edit" permissions

### Inconsistent Option Names
**Issue**: Priority or status values not mapping correctly
**Solution**: Use exact option names specified (Urgent, High, Medium, Low)

## Troubleshooting Schema Issues

### Plugin Can't Find Database
- Check database is shared with integration
- Verify integration has edit permissions
- Confirm database ID is correct format (UUID)

### Sync Fails on Specific Tasks
- Check for required properties in Notion database
- Verify property types match specification
- Look for special characters or very long content

### Data Not Mapping Correctly
- Enable debug logging in plugin
- Check console for specific property mapping errors
- Verify select/multi-select options exist in Notion

### Auto-Discovery Not Working
- Ensure database title contains recognizable keywords
- Check that required properties exist
- Verify integration permissions are correct

For additional troubleshooting, see `troubleshooting.md`.