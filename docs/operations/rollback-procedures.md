# Rollback Procedures

This document defines the protocols for reverting the application to a stable state in the event of a critical failure within the [Freshers PWA](/README.md).

## 1. Front-end Rollbacks

Front-end stability is maintained through [Vercel](https://vercel.com)'s instantaneous rollback capability. This mechanism allows the production domain to be pointed back to a previous, verified deployment without requiring a new build or code change.

### Procedure

1. Confirm the issue is caused by the most recent deployment and not a backend or third-party service outage.
2. Navigate to the project **Deployments** tab in the Vercel dashboard and locate the last known stable deployment.
3. Select **Instant Rollback** from the deployment's options menu. This allows you to reassign the production traffic to that specific deployment.
4. Verify that the application is functional. The underlying issue must then be addressed.

## 2. Database Rollbacks

Database state is persistent and database migrations are not automatically reversible. Unlike the front-end, a database rollback requires a compensating transaction. This is a new migration that performs the inverse of the statements that caused the error.

### Procedure

1. Locate the file in `supabase/migrations/` that caused the error. Identify the specific statements within that file that must be reversed.
2. Use the Supabase CLI to generate a new migration file:
    ```
    supabase migration new rollback_description
    ```
3. Enter the inverse of the statements identified in **Step 1**. For example, if the previous migration added a column, the new file must drop it:
    ```
    ALTER TABLE JOBS DROP COLUMN IF EXISTS column_name;
    ```
4. Run `supabase db reset --local` to recreate the local database and apply the new migration.
5. Apply the fix to the remote environment using `supabase db push`.
6. To verify that the rollback was successful:
    - Run `supabase migration list` and verify that the compensating transaction migration appears in both LOCAL and REMOTE columns.
    - Run `supabase db diff --linked` and confirm the output is empty, indicating the remote schema matches the local one.
    - Test the application to ensure the errors are resolved and no new errors are introduced.
