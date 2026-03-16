# Database Design

This document outlines the initial design of the database for the [Cleaner Hire PWA](/README.md).

## 1. Custom Enumerated Types

The following `ENUM` types provide structured, type-safe representations of finite sets of data:

- **user_role**: `host`, `cleaner`, `admin`
- **verification_status**: `unverified`, `pending`, `verified`, `rejected`
- **job_status**: `draft`, `pending`, `assigned`, `in_progress`, `completed`, `cancelled`
- **property_type**: `house`, `flat`
- **media_type**: `image`, `video`

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    PROFILES ||--o| IDENTITIES : "has one"
    PROFILES ||--o{ PROPERTIES : "owns"
    PROFILES ||--o{ JOBS : "(host) creates"
    PROFILES ||--o{ JOBS : "(cleaner) assigned"
    PROFILES ||--o{ APPLICATIONS : "(cleaner) submits"
    PROFILES ||--o{ EVIDENCE_MEDIA : "(cleaner) uploads"
    PROFILES ||--o{ REVIEWS : "writes/receives"
    PROFILES ||--o{ PUSH_SUBSCRIPTIONS : "registers"

    PROPERTIES ||--o{ JOBS : "location for"
    JOBS ||--|{ JOB_TASKS : "contains"
    JOBS ||--o{ APPLICATIONS : "receives"
    JOBS ||--o{ EVIDENCE_MEDIA : "documented by"
    JOBS ||--o| REVIEWS : "evaluated by"

    PROFILES {
        uuid id PK "References auth.users"
        text full_name
        user_role role
        verification_status status
        text phone_number
        text avatar_url
        boolean is_suspended
        timestamptz created_at
    }

    IDENTITIES {
        uuid user_id PK, FK
        text document_url "Nullified after verification"
        verification_status status
        text admin_notes
        timestamptz created_at
        timestamptz processed_at
    }

    PROPERTIES {
        uuid id PK
        uuid host_id FK
        text address
        property_type type
        integer bedrooms
        integer bathrooms
    }

    JOBS {
        uuid id PK
        uuid host_id FK
        uuid property_id FK
        uuid cleaner_id FK "Nullable until assigned"
        job_status status
        timestamptz scheduled_start
        numeric pay_amount
        text instructions
        timestamptz clock_in_time
        timestamptz clock_out_time
    }

    JOB_TASKS {
        uuid id PK
        uuid job_id FK
        text description
        boolean is_completed
    }

    APPLICATIONS {
        uuid job_id PK, FK
        uuid cleaner_id PK, FK
        timestamptz created_at
    }

    EVIDENCE_MEDIA {
        uuid id PK
        uuid job_id FK
        uuid uploader_id FK
        text media_url
        media_type type
    }

    REVIEWS {
        uuid id PK
        uuid job_id FK
        integer rating
        text comment
    }

    PUSH_SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        text endpoint UK
        text p256dh
        text auth
    }
```
