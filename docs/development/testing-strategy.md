# Testing Strategy

This document outlines the testing strategy for the [Freshers PWA](/README.md). 

## 1. Functional Testing

Functional testing will be executed locally during development and automated within the [CI/CD pipeline](/docs/operations/ci-cd-pipeline.md).

**Unit Testing**: Target pure functions, data transformations, and business logic. These tests are executed using [Vitest](https://vitest.dev/).

**Integration Testing**: Verify the interaction between the user interface and state management logic. These tests are executed using [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

**End-to-end Testing**: Verify that the core business logic and main user workflows work entirely. These tests are executed using [Playwright](https://playwright.dev/).

## 2. Non-Functional Testing

Non-functional tests are automated during the staging phase of the [CI/CD Pipeline](/docs/operations/ci-cd-pipeline.md) to ensure the PWA meets basic criteria.

**PWA Compliance**:  Playwright is used to ensure the application follows Progressive Web App standards. It confirms the presence of a valid web app manifest, service worker registration, and offline support.
