# Local Setup Guide

This document defines the procedure for configuring a local development environment for the [Freshers PWA](/README.md).

## 1. Development Dependencies

The following are required for development:
- [Node.js v24](https://nodejs.org/en): the execution environment for the build system
- [Docker Desktop](https://www.docker.com/products/docker-desktop/): the containerisation software required for [local Supabase development](https://supabase.com/docs/guides/local-development).

## 2. Installation and Setup

Complete these steps to bootstrap local development:

1. Clone the repository and install dependencies.
    
    ```
    git clone git@github.com:freshers-co-ltd/freshers-tech-app.git
    cd freshers-tech-app
    npm install
    ```
2. Start the local Supabase environment. Ensure Docker is running before execution.
    
    ```
    npx supabase start
    ```
    
    Take note of the `Project URL` under `APIs` and the `Publishable` key under `Authentication Keys` from the terminal output.
3. Create a `.env.local` file in the root directory and insert the values from the previous step as well as the VAPID private key in use.
    ```
    VITE_SUPABASE_URL=<Project URL>
    VITE_SUPABASE_ANON_KEY=<Publishable>
    VAPID_PRIVATE_KEY=<VAPID Private Key>
    ```
4. Apply the migration history and populate the database with seed data.
    ```
    npx supabase db reset
    ```
5. Start the Vite development server.

    ```
    npm run dev
    ```

## 3. Troubleshooting

- **Service Worker Lifecycle**: In development mode, Service Workers are often disabled or updated frequently. Use a Guest/Incognito profile to ensure a clean registration of the PWA manifest and service worker.
- **Docker Resource Constraints**: The Supabase stack requires significant resources. Ensure Docker is allocated at least 4GB of RAM and 2 CPUs to prevent container timeouts.
- **Port Conflicts**: If port `5432` (PostgreSQL) or `5173` (Vite) is occupied, the services will fail to bind. Terminate existing instances of PostgreSQL or modify the `config.toml` in the `supabase` directory.
- **CLI Sync**: If local migrations fail, verify the CLI version against the production instance: `npx supabase --version`.
