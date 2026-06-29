# CI/CD Pipeline

This document describes the CI/CD pipeline for the [Freshers PWA](/README.md). The process ensures that only verified, stable code reaches the production environment.

## 1. Versioning Strategy

The project follows the [Semantic Versioning](https://semver.org/) specification and uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/) to automate the release lifecycle. Version increments are determined by [commit types](/docs/development/commit-guidelines.md#type):

|**Commit Type**|**Version Increment**|
|---|---|
|**feat**|MINOR|
|**fix**|PATCH|
|**feat! / fix!**|MAJOR (Breaking Change)|

## 2. Environment Tiering

The application is deployed across three distinct tiers, for more information look at the [environment definitions](/docs/infrastructure/environment-variables.md).

|Environment|Deployment Trigger|Source Branch|
|---|---|---|
|**Development**|Manual (Local) / Push to Feature Branch (CI)|Feature branches|
|**Staging**|Automatic on Push to `main`|`main`|
|**Production**|Manual (Workflow Dispatch)|`main`|

## 3. Deployment Pipeline

The transition from code completion to production follows a structured path managed by [GitHub Actions](https://docs.github.com/en/actions).

### 3.1 Quality Checks and Staging

Upon opening a pull request (PR) to `main`, the staging workflow triggers:

1. **Validation**: Executes linting, type-checking, and unit tests.
2. **Non-functional Tests**: Runs automated Playwright tests to ensure service worker and manifest compliance.
3. **Database Migration**: Pushes schema changes to the Staging Supabase project.
4. **Preview Deployment**: Deploys the application to the Vercel Preview environment.

### 3.2 Production Release

Production deployment is a gated process initiated manually. When the workflow is triggered:

1. **Automated Versioning**: `semantic-release` analyses commits, creates a new Git tag, and generates a changelog.
2. **Database Migration**: New database migrations are pushed to the Production Supabase project.
3. **Production Deployment**: The application is deployed to Vercel Production using the newly tagged commit.


## 4. Release Requirements

The following requirements must be satisfied before a production deployment:

- All automated tests must execute successfully.
- Functional and non-functional requirements must be verified on the staging environment.
- Environment variables and Supabase Row Level Security (RLS) policies must be audited for the new release version.
