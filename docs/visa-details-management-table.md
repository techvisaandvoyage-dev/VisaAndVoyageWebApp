# Visa Details Management Table

## Objective

Merge all existing visa-related settings into a single centralized management interface.

The purpose is to eliminate switching between multiple control sections and allow administrators to manage all visa details from one table.

---

# Location

Controls

→ Cards

→ Visa Details Management

---

# Top Toolbar

Display above the table.

Components:

1. Search Bar
2. Show Active Countries Toggle
3. Select All Countries Button
4. Deselect All Countries Button
5. Save Changes Button

---

# Table Structure

## Column 1

Selection

Purpose:

Select one or multiple countries.

Type:

Checkbox

Header:

Select All Checkbox

Behaviour:

Checking header checkbox selects all visible countries.

---

## Column 2

Edit

Purpose:

Edit a single country only.

Type:

Button

Label:

Edit

---

## Column 3

Country Name

Examples:

India
UAE
Germany
Canada

Read only.

---

## Column 4

Default Visa Type

Current selected visa type shown on cards.

Dropdown.

---

## Column 5

Available Visa Types

Multi Select Dropdown.

Examples:

* Tourist Visa
* Business Visa
* Sticker Visa
* E Visa

---

## Column 6

Length Of Stay

Dropdown.

Examples:

14 Days
30 Days
60 Days
90 Days

---

## Column 7

Entry

Dropdown.

Examples:

Single
Double
Multiple

---

## Column 8

Validity

Dropdown.

Examples:

30 Days
60 Days
90 Days

---

## Column 9

Processing Days

Dropdown.

Examples:

3-5 Days
5-7 Days
10-15 Days

---

## Column 10

Required Documents

Multi Select Dropdown.

Behaviour:

Click dropdown.

Display document catalog.

Admin can select multiple documents.

Bottom of dropdown:

* Add Document

Creating a document automatically adds it to the catalog.

---

## Column 11

Optional Documents

Multi Select Dropdown.

Behaviour same as Required Documents.

Bottom option:

* Add Optional Document

New document should be stored in catalog.

---

# Bulk Edit System

When one or more countries are selected:

Display Bulk Edit Panel above table.

Example:

Selected Countries: 24

Bulk Update:

* Visa Type
* Entry
* Validity
* Processing Days
* Documents

Apply To Selected Countries

---

# Single Country Edit

Edit button should open advanced editor.

Used only for one country.

Must not affect other countries.

---

# Save System

Only one Save button.

No individual save buttons.

Changes remain temporary until Save Changes is clicked.

---

# Existing System Reuse

Important:

Reuse existing:

* Visa Type controls
* Entry controls
* Validity controls
* Processing controls
* Document catalogs

Do not rebuild backend logic.

Do not create duplicate databases.

Do not create duplicate collections.

Only merge existing functionality into one unified table interface.

---

# UI Style

Reference:

Google Sheets
Airtable
Modern SaaS CMS

Requirements:

* Sticky header
* Search
* Filters
* Responsive horizontal scrolling
* Bulk edit support
* Fast editing experience
* Professional admin dashboard appearance

---

# Migration Rule

Existing controls must remain functional.

Do not remove old sections until this new table is fully tested and verified.

