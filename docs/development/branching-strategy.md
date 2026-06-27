# Branching Strategy

This document outlines the branching strategy for the [Freshers PWA](/README.md).

## 1. Branches

This project implements a variant [GitHub Flow](https://www.w3schools.com/git/git_github_flow.asp) branching strategy, by adding a staging process for manual QA before deployment. This workflow facilitates continuous integration (CI) and delivery by maintaining a stable `main` branch and using short-lived feature branches for all development tasks.

**Feature Branches**: Feature branches are used for all new development, bug fixes, and refactoring. These branches are created from the latest `main` commit and are deleted after they are successfully merged.

**Main Branch**: Pull requests to `main` trigger automatic staging deployments to the Vercel Preview environment for quality assurance (QA). The `main` branch must always be in a deployable state. Direct commits to `main` are prohibited, all changes must arrive via merged pull requests.

## 2. Naming Conventions

Standardised branch names categorise the intent of the changes and improve repository organisation. Use the following prefixes:

- `feat/`: Additions to user-facing functionality or the application's public API.
- `fix/`: Patches for identified bugs or unintended behaviour.
- `refactor/`: Changes to the codebase that improve internal structure or performance without changing external behaviour.
