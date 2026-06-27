# Environment Variables

This document defines the environments and environment variables used by the [Freshers PWA](/README.md).

## 1. Environment Hierarchy

The application infrastructure is divided into three distinct environments to ensure isolation between development, testing, and production data.

|**Environment**|**Purpose**|**Hosting**|**Supabase Backend**|
|---|---|---|---|
|**Local**|Active development and functional testing.|Localhost|Local Instance (CLI)|
|**Staging**|Pre-production PWA auditing and QA.|[Vercel Preview](https://vercel.com/sirio-projects/freshers-mvp)|[Development project](https://supabase.com/dashboard/project/blojdfotffzxkjyhojsz)|
|**Production**|Live end-user traffic.|[Vercel Production](https://vercel.com/sirio-projects/freshers-mvp)|[Production project](https://supabase.com/dashboard/project/zpsaqiiyvuxbygrkqeem)|

## 2. Variables and Secrets

These are all the required variables and secrets across every environment. For instructions on how to configure these values, refer to the [infrastructure setup guide](/docs/infrastructure/infrastructure-setup.md).

### 2.1 Global Secrets

These are global encrypted credentials that enable the CI/CD pipeline to authenticate with external platform APIs.

- `GH_TOKEN`: A GitHub Personal Access Token (PAT) required for the CI/CD pipeline.
- `SUPABASE_ACCESS_TOKEN`: Authentication token for Supabase CLI.
- `VERCEL_ORG_ID`: Unique identifier for the Vercel organisation.
- `VERCEL_PROJECT_ID`: Unique identifier for the project on Vercel.
- `VERCEL_TOKEN`: Authentication token for Vercel CLI deployments.

### 2.2 Environment Variables

These identifiers are non-sensitive and serve to reference the appropriate infrastructure during deployment. They must be configured in both staging and production environments.

- `SUPABASE_PROJECT_ID`: The Supabase project reference ID used for database migrations.
- `VITE_SUPABASE_ANON_KEY`: The client-side key used to interact with Supabase via Row Level Security (RLS).
- `VITE_SUPABASE_URL`: The API endpoint for the Supabase project.
- `VITE_VAPID_PUBLIC_KEY`: The public key used to identify the push notification server to the browser.

### 2.3 Environment Secrets

These encrypted credentials are used during the CI/CD pipeline and specific server-side functions. They must be stored as protected secrets within both staging and production environments.

- `WEBHOOK_SECRET`: A shared secret used to verify requests between webhooks and Supabase Edge Functions.
- `SUPABASE_DB_PASSWORD`: The Supabase database password used for database migrations.
- `SUPABASE_SERVICE_ROLE_KEY`: An administrative key used to bypass RLS for backend operations.
- `VAPID_PRIVATE_KEY`: The secret key used to sign and authorise Web Push notifications.
