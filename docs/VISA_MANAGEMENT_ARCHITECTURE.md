# Visa Management Architecture

## Goal

Create admin visa management with **multi-country selection + default inheritance + country override system**.

Example:

Select:

```
India, USA, UK, Canada
```

Set default:

```
Visa Type = E-Visa
```

Result:

```
India   → E-Visa (Default)
USA     → E-Visa (Default)
UK      → E-Visa (Default)
Canada  → E-Visa (Default)
```

Later:

```
USA → Sticker Visa
```

Result:

```
India   → E-Visa
USA     → Sticker Visa (Override)
UK      → E-Visa
Canada  → E-Visa
```

Only USA changes.

---

# Data Model

## Visa Configuration

```js
{
 countryId,
 visaType,
 processingTime,
 validity,
 stayDuration,
 requirements,
 documents,
 price,

 sourceType: "DEFAULT" | "OVERRIDE",

 parentId
}
```

---

# Logic

## Default Flow

When admin selects multiple countries:

Create shared default configuration.

Countries without custom data inherit this value.

---

## Override Flow

When admin edits a specific country:

Do not update default.

Create/update country override.

Example:

Before:

```
USA
E-Visa
DEFAULT
```

After:

```
USA
Sticker Visa
OVERRIDE
```

---

# Fetch Logic

Priority:

```
1. Check country override
2. If exists → return override
3. Else → return default
```

Pseudo:

```js
getVisa(countryId){

 override = find({
 countryId,
 sourceType:"OVERRIDE"
 })

 if(override)
    return override

 return findDefault()
}
```

---

# Update Logic

```js
updateVisa(countryId,data){

 existingOverride = findOverride(countryId)

 if(existingOverride)
    update(existingOverride,data)

 else
    create({
      countryId,
      ...data,
      sourceType:"OVERRIDE"
    })
}
```

---

# Admin UI Requirements

Show source status:

```
Country       Visa Type        Status

India         E-Visa           Default
USA           Sticker Visa     Override
UK            E-Visa           Default
```

Actions:

* Bulk edit → updates default
* Single country edit → creates override

---

# API

## Create Default

POST

```
/api/admin/visa/default
```

## Update Country Override

PUT

```
/api/admin/visa/:countryId
```

## Get Visa

GET

```
/api/admin/visa/:countryId
```

---

# Database Rules

* One country can have one active override.
* Never duplicate default data for every country.
* Override must not affect other countries.
* Always maintain DEFAULT vs OVERRIDE state.

Index:

```js
{
 countryId:1,
 sourceType:1
}
```

---

# Implementation Requirement

Build scalable visa management supporting:

* Multiple countries
* Shared defaults
* Country-level customization
* Future visa fields
* Clear inheritance handling
