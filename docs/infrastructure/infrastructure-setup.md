# Infrastructure Setup

This document provides step-by-step instructions for configuring the [Cleaner Hire PWA](/README.md) infrastructure on [GitHub](#1-github-repository-setup), [Supabase](#2-supabase-setup), and [Vercel](#3-vercel-setup).

## 1. Github Repository Setup

All the following settings will be found in the project's GitHub repository **Settings** page.

### 1.1 Rules

#### 1.1.1 Branch Ruleset

To enforce the [branching strategy](/docs/development/branching-strategy.md) go to **Rules > Rulesets**.
Create a new branch ruleset and select the default branch for **Target Branches**.
Enable the following rules:

- Restrict deletions
- Require linear history
- Require deployments to succeed
  - Add **Staging** environment  
- Require a pull request before merging
  - Require conversation resolution before merging
  - Allowed merge methods: **Squash, Rebase**
- Block force pushes

#### 1.1.2 Tag Ruleset

To enforce the [deployment strategy](/docs/operations/ci-cd-pipeline.md) go to **Rules > Rulesets**. 
Create a new tag ruleset that targets tags matching the pattern `v*`.
Enable the following rules:

- Restrict creations
  - WARNING: Ensure `semantic-release` is added to the bypass list or deployment won't work.
- Restrict updates
- Restrict deletions


### 1.2 Actions

To allow for the [CI/CD pipeline](/docs/operations/ci-cd-pipeline.md) to work properly go to **Actions > General**.
Enable the following rules:

- Allow all actions and reusable workflows
- Require approval for all external contributors
- Read repository contents and packages permissions
- Allow GitHub Actions to create and approve pull requests

### 1.3 Environments

For more information about environment variables and secrets see the [environment variables definitions](/docs/infrastructure/environment-variables.md).\
The following variables and secrets must be added to both environments.

**Variables**:
- `SUPABASE_PROJECT_ID`: Found in the Supabase project settings under **General > Project ID**.
- `VITE_SUPABASE_ANON_KEY`: Found in the Supabase project settings under **API Keys > Publishable Key**.
- `VITE_SUPABASE_URL`: Found in the Supabase project settings under **Data API > API URL**.

**Secrets**:
- `INTERNAL_API_SECRET`: Run `openssl rand -base64 32` in the CLI.
- `SUPABASE_DB_PASSWORD`: Created during Supabase project creation.
- `SUPABASE_SERVICE_ROLE_KEY`: Found in the Supabase project settings under **API Keys > Private Key**.
- `VAPID_PRIVATE_KEY`: Run `npx web-push generate-vapid-keys` in the CLI.

#### 1.3.1 Staging

- Go to **Environments**, create a new environment and name it "Staging".
- Add all the secrets and variables outlined previously.

#### 1.3.2 Production

- Go to **Environments**, create a new environment and name it "Production".
- Enable **Required reviewers**.
- Disable **Allow administrators to bypass configured protection rules**.
- Add the `main` branch to the **Deployment branches**.
- Add all the secrets and variables outlined previously

### 1.4 Advanced Security

Go to **Advanced Security**.
Enable the following settings:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Grouped security updates
- Secret protection
- Push protection

### 1.5 Secrets and Variables

For more information about variables and secrets see the [environment variables definitions](/docs/infrastructure/environment-variables.md).\
The following secrets must be added to the repository under **Secrets and variables > Actions**.

- `GH_TOKEN`: Create in GitHub account settings under **Developer Settings > Tokens (classic)** with **repo** and **workflow** scopes.
- `SUPABASE_ACCESS_TOKEN`: Create in Supabase account settings under **Access Tokens > Generate new token** with **Full Account** scope and no expiration.
- `VERCEL_ORG_ID`: Found in the Vercel team settings under **General > Team ID**.
- `VERCEL_PROJECT_ID`: Found in the Vercel project settings under **General > Project ID**.
- `VERCEL_TOKEN`: Create in Vercel account settings under **Tokens > Create token** with **Full Account** scope.

## 2. Supabase Setup

All the following settings will be found in the Supabase project's **Dashboard** page.

### 2.1 Database

Go to **Database > Settings** and enable **Enforce SSL on incoming connections**.

### 2.2 Authentication

Go to **Authentication > URL Configuration** and add the following:

- Vercel production URL to **Site URL**.
- Vercel preview URL with wildcards to **Redirect URLs**.

### 2.3 Edge Functions

Go to **Edge Functions > Secrets** and add the following:

- `VAPID_PRIVATE_KEY`: Run `npx web-push generate-vapid-keys` in the CLI.

## 3. Vercel Setup

All the following settings will be found in the Vercel project's **Settings** page.

### 3.1 Build and Deployment

- Ensure **Framework Preset** is set to **Vite**.
- Change **Ignored Build Step** behaviour to **Don't build anything**.

### 3.2 Environments

- Go to **Environments** and select the **Preview** environment.
- Set **Branch Tracking** to **Disabled**.

### 3.3 Environment Variables

Go to **Environment Variables** and add the following to both **Preview** and **Production** environments:

- `VITE_SUPABASE_ANON_KEY`: Found in the Supabase project settings under **API Keys > Publishable Key**.
- `VITE_SUPABASE_URL`: Found in the Supabase project settings under **Data API > API URL**.
- `VITE_VAPID_PUBLIC_KEY`: Run `npx web-push generate-vapid-keys` in the CLI.

### 3.4 Git

- Enable **deployment_status Events**.
