# Visa Details Migration Analysis

## 1. Existing Components

### 1.1 Visa Type

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `VisaTypeScopeConfigSection` | `admin/src/components/controls/VisaTypeScopeConfigSection.jsx` | 1-169 | Reusable scope selector (all/single/some countries) with picker dropdown + custom text input |
| `VisaTypesManager` | `admin/src/components/controls/VisaTypesManager.jsx` | 1-320 | Full CRUD for managed visa type dropdown options (add, toggle active, set country visibility, delete) |
| `CountryVisaTypesOverride` | `admin/src/components/controls/CountryVisaTypesOverride.jsx` | 1-265 | Standalone per-country custom visa type editor (not imported by Dashboard) |
| Visa type section in Dashboard | `admin/src/pages/Dashboard.jsx` | ~7956-8151 | Universal control card with "All Countries" picker, "Single Country" override builder, "Some Countries" group picker |
| Display toggle | `admin/src/pages/Dashboard.jsx` | ~1391 | `showVisaType` toggle |

**Draft state structure (`visaTypeSaveAllDraft`, Dashboard.jsx:~2571):**
```js
{
  allCountries: { picker: "", custom: "" },
  singleCountryDraft: { countryId: "", picker: "", custom: "" },
  singleCountryOverrides: [{ countryId, picker, custom }],
  someCountries: { countryIds: [], picker: "", custom: "" },
}
```

**Key functions:**
- `buildVisaTypeSaveAllDraft(value, scopeValues, scopeTargets)` (~line 267) — builds draft from API response
- `serializeVisaTypeSaveAllDraft(draft)` (~line 475) — serializes for dirty-checking
- `validateVisaTypeSaveAllDraft(draft)` (~line 4442) — validates before save
- `buildVisaTypeSaveAllPayload(draft)` (~line 4486) — transforms draft to API payload
- `addSingleCountryVisaTypeOverride()` (~line 4679) — adds override from draft input
- `removeSingleCountryVisaTypeOverride()` (~line 4714) — removes an override
- `runUpdateGlobalVisaType()` (~line 4723) — main save handler

### 1.2 Manage Visa Type

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `VisaTypesManager` | `admin/src/components/controls/VisaTypesManager.jsx` | 1-320 | CRUD table for managed visa types |
| Visibility within | same file | ~80-130 | `applyToAllActiveCountries` toggle + per-country multi-select |

**State:** Self-contained within `VisaTypesManager`. Manages its own `visaTypes[]` array via `GET /visa-types`.

### 1.3 Entry Type

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Entry type section in Dashboard | `admin/src/pages/Dashboard.jsx` | ~8357-8559 | Same `VisaTypeScopeConfigSection` pattern (all/single/some countries) |
| Save handler | `admin/src/pages/Dashboard.jsx` | ~5288 | `runUpdateGlobalEntryType()` |

**Draft state (`entryTypeSaveAllDraft`, Dashboard.jsx:~2583):**
```js
{
  allCountries: { picker: "", custom: "" },
  singleCountryDraft: { countryId: "", picker: "", custom: "" },
  singleCountryOverrides: [{ countryId, picker, custom }],
  someCountries: { countryIds: [], picker: "", custom: "" },
}
```

**Dropdown options (`ENTRY_TYPE_SUGGESTIONS`):** `["Single Entry", "Double Entry", "Multiple Entry"]`

### 1.4 Validity

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Validity section in Dashboard | `admin/src/pages/Dashboard.jsx` | ~8564-8766 | Same `VisaTypeScopeConfigSection` pattern |
| Save handler | `admin/src/pages/Dashboard.jsx` | ~4764 | `runUpdateGlobalValidity()` |

**Draft state (`validitySaveAllDraft`, Dashboard.jsx:~2590):**
```js
{
  allCountries: { picker: "", custom: "" },
  singleCountryDraft: { countryId: "", picker: "", custom: "" },
  singleCountryOverrides: [{ countryId, picker, custom }],
  someCountries: { countryIds: [], picker: "", custom: "" },
}
```

**Dropdown options (`VALIDITY_SUGGESTIONS`):** `["7 Days", "15 Days", "30 Days", "60 Days", "90 Days", "180 Days", "1 Year", "5 Years"]`

### 1.5 Processing Days

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Processing Days section in Dashboard | `admin/src/pages/Dashboard.jsx` | ~8772-8974 | Same `VisaTypeScopeConfigSection` pattern |
| Save handler | `admin/src/pages/Dashboard.jsx` | ~5329 | `runUpdateGlobalProcessingDays()` |

**Draft state (`processingDaysSaveAllDraft`, Dashboard.jsx:~2597):**
```js
{
  allCountries: { picker: "", custom: "" },
  singleCountryDraft: { countryId: "", picker: "", custom: "" },
  singleCountryOverrides: [{ countryId, picker, custom }],
  someCountries: { countryIds: [], picker: "", custom: "" },
}
```

**Dropdown options (`PROCESSING_DAYS_SUGGESTIONS`):** `["1-3 days", "3-5 days", "5-7 days", "5-10 days", "7-10 days", "10-15 days", "15-30 days", "2-3 weeks", "Per visa policy"]`

### 1.6 Required Documents

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Required Documents section | `admin/src/pages/Dashboard.jsx` | ~8982-9396 | Multi-select checkboxes from document catalog + country visibility |
| Per-country override in modal | `admin/src/pages/Dashboard.jsx` | ~11825-11997 | Shows global docs, extra docs, add-from-catalog |
| Save handler | `admin/src/pages/Dashboard.jsx` | ~5552 | `runUpdateGlobalRequiredDocuments()` |
| Toggle function | `admin/src/pages/Dashboard.jsx` | ~3707 | `toggleRequiredDoc(key)` — toggles in country form |

**Draft state:** `requiredDocsDraft` (~line 2606) — array of document key strings.

### 1.7 Optional Documents / Document Catalog

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Optional Documents section | `admin/src/pages/Dashboard.jsx` | ~9398-9726 | Multi-select checkboxes + add/edit/remove custom docs |
| Save handler | `admin/src/pages/Dashboard.jsx` | ~5612 | `runUpdateGlobalOptionalDocuments()` |
| Custom doc CRUD | `admin/src/pages/Dashboard.jsx` | ~5740 | `runAddCustomDocument()`, `runSaveDocumentCatalogEntry()`, `runRemoveCustomDocument()` |
| Catalog visibility | `admin/src/pages/Dashboard.jsx` | ~5694 | `runUpdateCatalogVisibility()` |

**Draft state:** `optionalDocsDraft` (~line 2608) — array of document key strings.

---

## 2. Existing APIs

### 2.1 Universal Control Endpoints (all `POST`)

| Endpoint | Body Pattern | Used By |
|----------|-------------|---------|
| `/api/admin/control/country-defaults` (GET) | — | Loads all globals + scopes + overrides + stats + catalog |
| `/api/admin/control/visa-type` | `{ allCountries, singleCountry, singleCountryOverrides[], someCountries }` | Visa Type |
| `/api/admin/control/validity` | Same structure | Validity |
| `/api/admin/control/length-of-stay` | Same structure | Length of Stay |
| `/api/admin/control/entry-type` | Same structure | Entry Type |
| `/api/admin/control/processing-days` | Same structure | Processing Days |
| `/api/admin/control/required-documents` | `{ requiredDocuments: [{key, showInAllActiveCountries, selectedCountries[]}] }` | Required Documents |
| `/api/admin/control/optional-documents` | `{ optionalDocuments: [{key, showInAllActiveCountries, selectedCountries[]}] }` | Optional Documents |
| `/api/admin/control/document-section-copy` | `{ requiredHeading, requiredDescription, optionalHeading, optionalDescription }` | Document section copy |
| `/api/admin/control/custom-documents` | `{ action: "add"|"save"|"remove"|"update-visibility", ... }` | Custom doc CRUD |
| `/api/admin/control/display-toggles` | `{ showVisaType, showValidity, showEntryType, ... }` | Visibility toggles |

### 2.2 Country Endpoints (admin)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/countries-list?includeInactive=true` | Fetch all countries |
| POST | `/api/admin/countries` | Create country |
| PUT | `/api/admin/countries/:id` | Update country (per-country fields: `visaType`, `entryType`, `validity`, `processingDays`, `lengthOfStay`, `requiredDocuments`, etc.) |
| DELETE | `/api/admin/countries/:id` | Delete country |

### 2.3 Visa Type CRUD Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/visa-types` | List all (admin) |
| GET | `/api/visa-types/active?countryId=` | List active (public), returns `country.customVisaTypes` if enabled |
| POST | `/api/visa-types` | Create |
| PATCH | `/api/visa-types/:id` | Update |
| DELETE | `/api/visa-types/:id` | Delete |

### 2.4 Settings

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/settings` | Fetch all settings (used for destination content, integrations) |
| PUT | `/api/admin/settings` | Update settings |

---

## 3. Existing Database Collections

### 3.1 `countries`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `slug` | String (unique) | — | URL identifier |
| `name` | String | — | Display name |
| `isActive` | Boolean | `true` | Public visibility |
| `visaType` | String | `'Tourist Visa'` | Per-country value |
| `useGlobalVisaType` | Boolean | `true` | When true, uses global |
| `validity` | String | `''` | Free text |
| `useGlobalValidity` | Boolean | `true` | — |
| `lengthOfStay` | String | `''` | Free text |
| `useGlobalLengthOfStay` | Boolean | `true` | — |
| `entryType` | String | `''` | Free text |
| `useGlobalEntryType` | Boolean | `true` | — |
| `processingDays` | String | `'5-10'` | Free text |
| `useGlobalProcessingDays` | Boolean | `true` | — |
| `requiredDocuments` | [String] | `[]` | Array of doc keys |
| `useGlobalRequiredDocuments` | Boolean | `true` | — |
| `customVisaTypes` | [{id, name, active}] | `[]` | Custom dropdown options |
| `useCustomVisaTypes` | Boolean | `false` | Override dropdown |
| `visaInformation` | Embedded doc | defaults | `{ items: [{type, label, value}] }` |
| `basePrice` | Number | `0` | Service fee |
| `useGlobalBasePrice` | Boolean | `false` | — |
| `governmentFee` | Number | `0` | Government fee |
| `useGlobalGovernmentFee` | Boolean | `true` | — |
| `feeManager` | Embedded doc | `{}` | Currency/amount/exchange |
| `gstEnabled` | Boolean | — | Per-country GST |
| `gstRate` | Number | — | Per-country GST % |
| `useGlobalGst` | Boolean | `true` | — |
| `requirements` | [String] | `[]` | Free-text bullets |
| `useGlobalVisaRequirements` | Boolean | `true` | — |
| `whyBookNow` | [String] | `[]` | Per-country bullets |
| `includedItems` | [{title,description,icon}] | `[]` | Per-country items |
| `faqs` | [{question,answer}] | `[]` | Per-country FAQ |
| `howItWorks` | [{title,description}] | `[]` | Per-country steps |
| `excludeDestination*` | [String] | `[]` | Keys to hide from global |

### 3.2 `settings` (singleton)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `globalVisaType` | String | `''` | Universal default |
| `visaTypeScopeValues` | `{all, single, some}` | `{}` | Scope values |
| `visaTypeScopeTargets` | `{singleCountryId, someCountryIds}` | `{}` | Scope targets |
| `visaTypeSingleCountryOverrides` | [{countryId, visaType}] | `[]` | Per-country override list |
| `globalValidity` | String | `''` | — |
| `validityScopeValues` / `validityScopeTargets` / `validitySingleCountryOverrides` | Same pattern | — | — |
| `globalLengthOfStay` | String | `''` | — |
| `lengthOfStayScopeValues` / `lengthOfStayScopeTargets` / `lengthOfStaySingleCountryOverrides` | Same pattern | — | — |
| `globalEntryType` | String | `''` | — |
| `entryTypeScopeValues` / `entryTypeScopeTargets` / `entryTypeSingleCountryOverrides` | Same pattern | — | — |
| `globalProcessingDays` | String | `''` | — |
| `processingDaysScopeValues` / `processingDaysScopeTargets` / `processingDaysSingleCountryOverrides` | Same pattern | — | — |
| `globalBasePrice` | Number | `null` | — |
| `serviceFeeScopeValues` / `serviceFeeScopeTargets` / `serviceFeeCountryOverrides` | Same pattern | — | — |
| `globalGovernmentFee` | Number | `null` | — |
| `governmentFeeScopeValues` / `governmentFeeScopeTargets` / `governmentFeeCountryOverrides` | Same pattern | — | — |
| `globalRequiredDocuments` | [{key, showInAllActiveCountries, selectedCountries}] | `[]` | — |
| `globalOptionalDocuments` | Same | `[]` | — |
| `customDocuments` | [{key, label, description, icon}] | `[]` | Admin-added doc types |
| `documentCatalogOverrides` | [{key, label, description, icon, deleted}] | `[]` | Built-in doc overrides |
| `showVisaType` | Boolean | `true` | Display toggle |
| `showValidity` | Boolean | `true` | Display toggle |
| `showLengthOfStay` | Boolean | `true` | Display toggle |
| `showEntryType` | Boolean | `true` | Display toggle |
| `showProcessingDays` | Boolean | `true` | Display toggle |
| `showRequiredDocuments` | Boolean | `true` | Display toggle |
| Destination content fields | Various | defaults | whyBookNow, includedItems, FAQs, etc. |

### 3.3 `visatypes`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `name` | String (unique) | — | Display name |
| `active` | Boolean | `true` | Visibility |
| `applyToAllActiveCountries` | Boolean | `true` | Scope flag |
| `selectedCountries` | [String] | `[]` | Country slugs when not all |

---

## 4. Existing Forms

### 4.1 Universal Control Card Structure (Visa Type, Entry, Validity, Processing Days)

Each control card has identical layout:

```
┌─────────────────────────────────────────────┐
│ [Title] [Display Toggle]                    │
│ [Description]                               │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ All Countries ───────────────────────┐   │
│ │  [Picker Dropdown] [Custom Text Input] │   │
│ └────────────────────────────────────────┘   │
│                                             │
│ ┌─ Single Country ──────────────────────┐   │
│ │  [Country Selector] [Picker + Custom]  │   │
│ │  [Add Button]                          │   │
│ │  ──────────────────────────────────────│   │
│ │  [Override List: Country → Value]      │   │
│ │  [Remove Button per row]               │   │
│ └────────────────────────────────────────┘   │
│                                             │
│ ┌─ Some Countries ──────────────────────┐   │
│ │  [Country Multi-Select] [Picker +     │   │
│ │   Custom Text Input]                   │   │
│ └────────────────────────────────────────┘   │
│                                             │
│ Stats: X countries use global, Y override   │
│                                             │
│ [Save All Changes Button]                   │
└─────────────────────────────────────────────┘
```

All three scope cards use `VisaTypeScopeConfigSection` (`admin/src/components/controls/VisaTypeScopeConfigSection.jsx`) which renders:
- A scope mode selector (not in the universal cards — the cards ARE the scope)
- A country search/picker (for single/some scopes)
- A `<Select>` dropdown from suggestions + a text `<Input>` for custom values
- A "picker/custom" dual-input where custom overrides picker

### 4.2 Required / Optional Documents Form

```
┌─────────────────────────────────────────────┐
│ [Title] [Display Toggle]                    │
│ [Description]                               │
│ [Heading Input] [Description Textarea]      │
├─────────────────────────────────────────────┤
│ ┌─ Document Checklist ──────────────────┐   │
│ │  ☐ Passport                           │   │
│ │  ☐ Photo                              │   │
│ │  ☐ Bank Statement                     │   │
│ │  ...                                  │   │
│ │  [Country Visibility per doc]         │   │
│ └────────────────────────────────────────┘   │
│                                             │
│ Stats: X countries using global docs         │
│                                             │
│ [Save All Changes Button]                   │
└─────────────────────────────────────────────┘
```

For optional docs, an additional "Add Custom Document" form sits at the bottom with:
- Label input, Description input, Icon picker
- Edit/Delete on existing custom docs
- "Save Catalog Visibility" button for bulk activation/deactivation

### 4.3 Per-Country Edit Modal (Country Manager)

Accessible via Country Manager → Edit button.

```
┌─────────────────────────────────────────────┐
│ Edit Country: [Name]                        │
├─────────────────────────────────────────────┤
│ General Info: name, slug, flag, etc.        │
│                                             │
│ ┌─ Visa Info Tab ───────────────────────┐   │
│ │  Visa Type: [Dropdown + Custom]       │   │
│ │  Length of Stay: [Dropdown + Custom]  │   │
│ │  Entry Type: [Dropdown + Custom]      │   │
│ │  Validity: [Dropdown + Custom]        │   │
│ │  Processing Days: [Dropdown + Custom] │   │
│ │  Service Fee: [Number Input]          │   │
│ │  Government Fee: [Number Input]       │   │
│ └────────────────────────────────────────┘   │
│                                             │
│ ┌─ Required Docs ───────────────────────┐   │
│ │  Global docs (show/hide per country)  │   │
│ │  Extra docs (selected for this only)  │   │
│ │  Add from catalog                      │   │
│ └────────────────────────────────────────┘   │
│                                             │
│ [Save Country Button]                       │
└─────────────────────────────────────────────┘
```

### 4.4 Visa Types Manager (CRUD)

```
┌─────────────────────────────────────────────┐
│ Manage Visa Types                           │
├─────────────────────────────────────────────┤
│ [Add New Visa Type: Text Input + Add Btn]   │
│                                             │
│ ┌─ Existing Types Table ────────────────┐   │
│ │  ● Tourist Visa   [Active] [✕]       │   │
│ │  ● Business Visa  [Active] [✕]       │   │
│ │  ○ Sticker Visa   [Inactive] [✕]     │   │
│ │  [Toggle Active / Set Visibility]     │   │
│ └────────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 5. Mapping Into the New Table Structure

### 5.1 Table Columns → Existing Data Sources

| New Table Column | Data Source | Location |
|-----------------|-------------|----------|
| **Country Name** | `countries.name` | `countries` collection |
| **Default Visa Type** | `country.visaType` (if `!useGlobalVisaType`) else `settings.globalVisaType` | Resolution: `countryController.resolveCountryDoc()` |
| **Available Visa Types** | `visatypes` collection (filtered by `country.customVisaTypes` if enabled) | `/api/visa-types/active?countryId=` |
| **Length of Stay** | `country.lengthOfStay` (if `!useGlobalLengthOfStay`) else `settings.globalLengthOfStay` | Same resolution pattern |
| **Entry** | `country.entryType` (if `!useGlobalEntryType`) else `settings.globalEntryType` | Same resolution pattern |
| **Validity** | `country.validity` (if `!useGlobalValidity`) else `settings.globalValidity` | Same resolution pattern |
| **Processing Days** | `country.processingDays` (if `!useGlobalProcessingDays`) else `settings.globalProcessingDays` | Same resolution pattern |
| **Required Documents** | `country.requiredDocuments` (if `!useGlobalRequiredDocuments`) else `settings.globalRequiredDocuments` | Same resolution pattern |
| **Optional Documents** | `settings.globalOptionalDocuments` (filtered per-country) | Settings singleton |

### 5.2 Per-Country `useGlobal*` Flag Mapping

Each cell in the new table must respect the existing `useGlobal*` flag pattern:

| Column | Country Field | Global Field | `useGlobal*` Flag |
|--------|--------------|-------------|-------------------|
| Default Visa Type | `country.visaType` | `settings.globalVisaType` | `country.useGlobalVisaType` |
| Length of Stay | `country.lengthOfStay` | `settings.globalLengthOfStay` | `country.useGlobalLengthOfStay` |
| Entry | `country.entryType` | `settings.globalEntryType` | `country.useGlobalEntryType` |
| Validity | `country.validity` | `settings.globalValidity` | `country.useGlobalValidity` |
| Processing Days | `country.processingDays` | `settings.globalProcessingDays` | `country.useGlobalProcessingDays` |
| Required Documents | `country.requiredDocuments[]` | `settings.globalRequiredDocuments[]` | `country.useGlobalRequiredDocuments` |

**UI indicator needed:** When a cell value comes from the global (i.e., `useGlobal* = true`), it should be visually distinguished (e.g., muted text, "Global" badge, or italic style) so the admin knows it's the inherited default vs. an explicit per-country override.

### 5.3 Scope System Migration

The existing **three-scope system** (all/single/some countries) must map into the new table as follows:

| Old Scope | New Table Behavior |
|-----------|-------------------|
| **All Countries** | Becomes the **Save Default** / batch-fill action — sets the global default AND marks every country as "use global" for that field |
| **Single Country** | Becomes editing a single row in the table — per-country value is written directly to the country doc with `useGlobal* = false` |
| **Some Countries** | Becomes the **Bulk Edit** panel — select multiple rows, set a value, and it applies only to selected countries with `useGlobal* = false` |

### 5.4 Existing Functions to Reuse (DO NOT Rewrite)

| Function | File:Line | Purpose in New Table |
|----------|-----------|---------------------|
| `resolvePickerOrCustomValue()` | Dashboard.jsx:~261 | Resolve effective value from picker/custom dual input |
| `buildVisaTypeSaveAllPayload()` | Dashboard.jsx:~4486 | Transform draft to API payload |
| `validateVisaTypeSaveAllDraft()` | Dashboard.jsx:~4442 | Validate before save |
| Equivalent functions for entry/validity/processing | Dashboard.jsx:~4915-5246 | Same pattern |
| `buildGlobalRequiredDocumentEntriesPayload()` | Dashboard.jsx:~2749 | Build document visibility payload |
| `loadGlobalCountryDefaults()` | Dashboard.jsx:~3850 | Fetch all globals + scopes + stats |
| `fetchCountries()` | dataStore.js:~85 | Fetch all countries |
| `updateCountry()` | dataStore.js:~191 | Per-country save |
| `toggleRequiredDoc()` | Dashboard.jsx:~3707 | Toggle document per country |

### 5.5 Existing Backend Endpoints to Reuse (DO NOT Rewrite)

| Endpoint | Method | Purpose in New Table |
|----------|--------|---------------------|
| `/api/admin/control/country-defaults` | GET | Load initial table data (globals + per-country overrides) |
| `/api/admin/control/visa-type` | POST | Save global default + scoped overrides |
| `/api/admin/control/validity` | POST | Same |
| `/api/admin/control/entry-type` | POST | Same |
| `/api/admin/control/processing-days` | POST | Same |
| `/api/admin/control/length-of-stay` | POST | Same |
| `/api/admin/control/required-documents` | POST | Save required doc visibility |
| `/api/admin/control/optional-documents` | POST | Save optional doc visibility |
| `/api/admin/control/custom-documents` | POST | CRUD for custom docs |
| `/api/admin/control/display-toggles` | POST | Toggle section visibility |
| `PUT /api/admin/countries/:id` | PUT | Save per-country row edits |
| `/api/visa-types` | GET | Fetch available visa types for dropdown |
| `/api/admin/settings` | GET | Check display toggle state |

### 5.6 New Table Data Flow

```
1. LOAD TABLE
   ├─ GET /admin/control/country-defaults
   │   └─ { defaults, stats, display, documentCatalog }
   ├─ GET /admin/countries-list?includeInactive=true
   │   └─ countries[]
   ├─ GET /visa-types
   │   └─ visaTypes[]
   └─ Merge: For each country, resolve effective values
       (per-country if useGlobal* = false, else global default)

2. SINGLE CELL EDIT (inline dropdown/select change)
   └─ Mark as dirty in local state
       └─ Show "unsaved" indicator

3. BULK EDIT (select countries + apply value)
   └─ Show bulk edit panel
       └─ Apply to selected countries in local state
           └─ Mark all affected rows as dirty

4. SAVE
   └─ One "Save Changes" button
       ├─ For each dirty row:
       │   └─ PUT /admin/countries/:id
       │       └─ { field: value, useGlobalField: false }
       ├─ For global defaults (if changed):
       │   └─ POST /admin/control/{field-type}
       └─ On success:
           └─ Reload table data
```

### 5.7 Dropdown Options Per Column (Reuse Existing Suggestions)

| Column | Source | Values |
|--------|--------|--------|
| Default Visa Type | `VISA_TYPE_SUGGESTIONS` + `visatypes` collection | `["Tourist Visa", "Business Visa", ...]` |
| Available Visa Types | `visatypes` collection | As managed by `VisaTypesManager` |
| Length of Stay | Dashboard constants | Free text with suggestions |
| Entry | `ENTRY_TYPE_SUGGESTIONS` | `["Single Entry", "Double Entry", "Multiple Entry"]` |
| Validity | `VALIDITY_SUGGESTIONS` | `["7 Days", "15 Days", ..., "5 Years"]` |
| Processing Days | `PROCESSING_DAYS_SUGGESTIONS` | `["1-3 days", "3-5 days", ..., "Per visa policy"]` |
| Required Documents | `documentCatalog` (built-in + custom) | All catalog entries as checkboxes |
| Optional Documents | `documentCatalog` (built-in + custom) | All catalog entries as checkboxes |

### 5.8 Existing Display Toggles to Integrate

| Toggle | Settings Field | Affects Column |
|--------|---------------|----------------|
| `showVisaType` | `settings.showVisaType` | Default / Available Visa Type |
| `showLengthOfStay` | `settings.showLengthOfStay` | Length of Stay |
| `showEntryType` | `settings.showEntryType` | Entry |
| `showValidity` | `settings.showValidity` | Validity |
| `showProcessingDays` | `settings.showProcessingDays` | Processing Days |
| `showRequiredDocuments` | `settings.showRequiredDocuments` | Required Documents |

These should control column visibility in the new table (hide column when toggle is off).

### 5.9 Legacy Data to Preserve

| Legacy Data | Location | Migration Strategy |
|-------------|----------|-------------------|
| `visaInformation` subdocument | `country.visaInformation` | Keep synced — auto-updated by `resolveCountryDoc()` on the server |
| `feeManager` subdocument | `country.feeManager` | Not in scope of this table (separate fee management) |
| Destination content per-country | `country.whyBookNow`, `country.includedItems`, etc. | Not in scope of this table |
| `customVisaTypes` per-country | `country.customVisaTypes` | Keep as-is — affects Available Visa Types dropdown per country |
| `useCustomVisaTypes` flag | `country.useCustomVisaTypes` | Keep as-is — determines dropdown source |
| `requirements` (free-text bullets) | `country.requirements` | Not in scope of this table |

### 5.10 Architecture Decisions Required

1. **Single Save vs Incremental Saves**: The doc says "Only one Save button" — but the existing per-country save uses `PUT /admin/countries/:id` which is inherently per-row. Two approaches:
   - **Option A**: Single "Save All" button that iterates dirty rows + calls existing endpoints for each (simpler, reuses backend).
   - **Option B**: New bulk endpoint that accepts all changes at once (cleaner UX, new backend work).

2. **Global Default Cell Treatment**: Each column should show whether the value is inherited from global default (`useGlobal* = true`) vs. an explicit override. Suggested UX: Show global value in muted/italic, show a "Use Global" badge or toggle per cell.

3. **Available Visa Types Column**: This controls which options appear in the "Default Visa Type" dropdown. The existing `VisaTypesManager` CRUD already manages this list globally, and `customVisaTypes` overrides per country. The table cell should be a multi-select from the global list (with per-country override support).

4. **Document Columns**: Required and Optional documents need multi-select dropdowns with the document catalog as the source. The "Add Document" option at the bottom should trigger the existing `runAddCustomDocument()` flow.
