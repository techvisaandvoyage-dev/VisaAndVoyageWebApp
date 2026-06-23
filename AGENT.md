# AGENTS.md

## Project Overview

Full-stack MERN application.

Architecture:

* admin/  → React admin dashboard
* client/ → React client application
* server/ → Node.js + Express.js backend API

## Tech Stack

### Frontend

Framework:

* React.js

Applications:

* Client website
* Admin dashboard

Common:

* JavaScript
* React Hooks
* Component-based architecture

### Backend

Runtime:

* Node.js

Framework:

* Express.js

Database:

* MongoDB

API:

* REST API

## Project Structure

```
admin/
  React admin application

client/
  React frontend application

server/
  Backend API server
  Database models
  Controllers
  Routes
  Middleware
```

# General Development Rules

## Code Changes

Before modifying files:

1. Understand existing code pattern.
2. Check related files only.
3. Avoid unnecessary file changes.
4. Do not rewrite working code.

## File Scope Rule

Modify only files required for the task.

Do not:

* scan entire project
* refactor unrelated components
* change folder structure without approval

## Code Quality

Follow:

* Clean code principles
* Reusable components
* Meaningful variable names
* Consistent formatting
* Existing project style

# Frontend Rules

Applies to:

* admin/
* client/

Use:

* Functional components
* React Hooks
* Reusable UI components
* Existing component patterns

Before creating new components:

Check:

* existing components
* existing utilities
* existing styles

Avoid:

* duplicate components
* unnecessary dependencies
* large component files

# Backend Rules

Applies to:

server/

Architecture:

```
Request
 ↓
Route
 ↓
Controller
 ↓
Service/Logic
 ↓
Model
 ↓
MongoDB
```

Follow:

* Existing Express structure
* Existing middleware pattern
* Existing error handling

Do not:

* modify database schema without confirmation
* expose sensitive environment variables
* change API response format unnecessarily

# Database Rules

Database:

MongoDB

Before changing models:

Check:

* existing schema
* existing references
* API dependencies

Avoid:

* unnecessary migrations
* breaking existing data

# API Rules

When creating/updating APIs:

Maintain:

* Existing route naming
* Existing response format
* Proper validation
* Error handling

Always check:

* frontend API usage
* admin API usage

# Environment Rules

Never modify:

* .env files
* secrets
* API keys

Use:

environment variables for:

* database URLs
* authentication secrets
* third-party services

# Debugging Workflow

When fixing bugs:

Follow:

1. Identify affected feature.
2. Locate related files.
3. Understand current flow.
4. Apply minimum required fix.
5. Verify result.

Do not:

* randomly edit multiple files
* rewrite complete modules

# Task Execution Rules

For every task:

First provide:

1. Understanding of issue.
2. Files that will be modified.
3. Implementation approach.

Then make changes.

# Context Optimization Rules

Important:

* Do not analyze entire repository unless requested.
* Read only required files.
* Prefer targeted searches.
* Avoid unnecessary explanations.
* Keep responses concise.

For large tasks:

Break into:

1. Planning
2. Implementation
3. Testing

# Important Commands

Frontend:

```
cd client
npm install
npm run dev
```

Admin:

```
cd admin
npm install
npm run dev
```

Backend:

```
cd server
npm install
npm run dev
```

# Project Memory

Store important decisions in:

```
docs/
```

Examples:

* architecture decisions
* database changes
* API changes
* deployment notes
