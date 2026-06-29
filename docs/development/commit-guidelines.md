# Commit Guidelines

This document explains the commit message guidelines for the [Freshers PWA](/README.md). This project enforces the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification for all contributions. Adhering to this standard ensures a readable project history and enables automated versioning and changelog generation.

## 1. Message Structure

Each commit message consists of a [header](#2-header), a [body](#3-body), and a [footer](#4-footer). The header has a special format that includes a [type](#21-type), a [scope](#22-scope), and a [description](#23-description):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## 2. Header

### 2.1 Type

Defines the intent of the change. Must be one of the following:

|**Type**|**Description**|
|---|---|
|**feat**|Commits that add a new feature.|
|**fix**|Commits that fix a bug.|
|**docs**|Documentation only changes.|
|**style**|Commits that do not affect the meaning of code.|
|**refactor**|Commits that change code, however do not change any behaviour.|
|**perf**|Commits that improve performance, a specific kind of refactor commits.|
|**test**|Commits that add missing tests or correct existing tests.|
|**build**|Commits that affect build and ci/cd components.|
|**chore**|Commits for general maintenance, that do not change any behaviour.|
|**revert**|Commits that revert a previous commit.|

### 2.2 Scope

A noun describing the section of the codebase that has been changed (e.g., `auth`, `api`, `jobs`).

### 2.3 Description

A short summary of the changes.
- Use the imperative, present tense: "change" not "changed" or "changes".
- Do capitalise the first letter.
- Do not end the subject line with a period.

## 3. Body

Use the body to explain the "what" and "why" of the change, as opposed to the "how".\
Just as in the summary, use the imperative, present tense.

## 4. Footer

Use the footer to reference issue IDs (e.g., `Fixes: #123`) or to denote [breaking changes](#5-breaking-changes).

## 5. Breaking Changes

Breaking changes must be indicated in the type/scope section by appending a `!` after the type/scope. You must explain the breaking change in the body.

```
feat(api)!: Title

Explanation of breaking change
```
