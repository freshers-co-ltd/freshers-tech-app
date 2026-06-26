# Database Design

This document outlines the design of the database for the [Cleaner Hire PWA](/README.md).

## 1. Custom Enumerated Types

The following `ENUM` types provide structured, type-safe representations of finite sets of data:

- **user_role**: `cleaner`, `host`, `admin`
- **cleaning_status**: `requested`, `confirmed`, `in_progress`, `completed`, `cancelled`
- **property_type**: `house`, `apartment`, `studio`
- **media_type**: `image`, `video`
- **notification_type**: `cleaning_requested`, `cleaning_confirmed`, `cleaning_started`, `cleaning_completed`, `cleaning_cancelled`, `cleaning_assigned`, `cleaning_reassigned`, `cleaning_updated`, `cleaning_reminder`, `cleaning_starting_soon`, `cleaning_missed_clockin`

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    PROFILES ||--o{ PROPERTIES : "owns"
    PROFILES ||--o{ CLEANINGS : "(host) creates"
    PROFILES ||--o{ CLEANINGS : "(cleaner) assigned"
    PROFILES ||--o{ EVIDENCE_MEDIA : "(cleaner) uploads"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    PROFILES ||--o| NOTIFICATION_PREFERENCES : "has one"
    PROFILES ||--o{ PUSH_SUBSCRIPTIONS : "registers"

    PROPERTIES ||--o{ CLEANINGS : "location for"
    CLEANINGS ||--|{ CLEANING_TASKS : "contains"
    CLEANINGS ||--o{ EVIDENCE_MEDIA : "documented by"
    CLEANINGS ||--o| CLEANING_REPORTS : "has one"

    PROFILES {
        uuid id PK "References auth.users"
        text email
        user_role role
        boolean is_verified
        text full_name
        text avatar_url
        timestamptz updated_at
        timestamptz last_seen_at
        timestamptz deleted_at
        integer failed_login_attempts
        timestamptz locked_until
    }

    PROPERTIES {
        uuid id PK
        uuid host_id FK
        text address_line_1
        text address_line_2
        text town_city
        text postcode
        property_type type
        smallint bedrooms
        smallint bathrooms
        text main_image_url
        text[] extra_images_urls
        numeric price_per_cleaning
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    CLEANINGS {
        uuid id PK
        uuid host_id FK
        uuid property_id FK
        uuid cleaner_id FK "Nullable until assigned"
        cleaning_status status
        timestamptz scheduled_start
        numeric service_cost
        numeric cleaner_pay
        text information
        boolean stocks_included
        timestamptz clock_in_time
        timestamptz clock_out_time
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    CLEANING_TASKS {
        uuid id PK
        uuid cleaning_id FK
        text description
        boolean is_custom
        boolean is_completed
        timestamptz created_at
        timestamptz deleted_at
    }

    EVIDENCE_MEDIA {
        uuid id PK
        uuid cleaning_id FK
        uuid uploader_id FK
        text media_url
        media_type type
        timestamptz created_at
        timestamptz deleted_at
    }

    CLEANING_REPORTS {
        uuid id PK
        uuid cleaning_id FK, UK "One report per cleaning"
        uuid cleaner_id FK
        text broken_items_report
        text low_supplies_report
        timestamptz created_at
        timestamptz deleted_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        notification_type type
        text title
        text message
        jsonb data
        text link
        boolean is_read
        timestamptz created_at
    }

    NOTIFICATION_PREFERENCES {
        uuid user_id PK, FK
        boolean enabled
        boolean push_enabled
        timestamptz created_at
        timestamptz updated_at
    }

    PUSH_SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        jsonb subscription
        timestamptz created_at
        timestamptz updated_at
    }
```
