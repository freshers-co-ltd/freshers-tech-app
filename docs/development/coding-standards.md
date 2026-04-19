# Coding Standards

This document establishes the coding standards for the [Cleaner Hire PWA](/README.md). These guidelines ensure code quality, consistency, and maintainability.

## 1. Best Practises

### 1.1 Naming

Name identifiers based on their responsibility. Names should capture what the code does, not how it is used.\
Function names should capture the action performed. Avoid generic names like `handleClick()`, prefer descriptive action names like `activateRipple()`.\
Prefix boolean variables with a verb such as `is`, `has`, or `can` to clarify intent.

Follow these casing guidelines:

- **PascalCase** for types, interfaces, classes, and React components.
- **camelCase** for variables, functions, and class instances.
- **UPPER_SNAKE_CASE** for global constants and configuration values.

### 1.2 Comments and Documentation

Use comments to explain why code exists, not just what it does.\
All public APIs must have JsDoc-style comments.\
Use `//` style comments for explanations and background information.

## 2. TypeScript

The project requires strict TypeScript configuration. Enable the `strict` flag in `tsconfig.json` to ensure type safety and prevent runtime errors.\
Use `interface` for public API definitions and data models. Use `type` for unions, intersections, and utility definitions.\
Avoid the `any` keyword; if a type is unknown at compile time, use `unknown` and implement type narrowing.\
Do not use non-null assertions (`!`) or type assertions (`as`). Instead, use a validation library or custom type guards to validate data at the application boundary.
    
### 2.1 Variable Declarations

Follow these variable declaration guidelines:

- Prefer `const` wherever possible.
- Use `let` only when a value must change.
- Avoid `var` unless absolutely necessary.
- Use `readonly` for members whenever possible.

## 3. React

The application follows a functional component pattern.

**Component Structure**: Define components as standard function declarations. Destructure props directly in the function signature. Use ES6 default parameters for optional props rather than `defaultProps`.

**Logic and State**: Colocate state as close to the relevant UI as possible to minimise unnecessary re-renders. Abstract complex business logic, side effects, and Supabase interactions into custom hooks. This separation of concerns ensures that components remain focused on the view layer.

**Hook Management**: Always include all referenced variables in the dependency arrays for `useEffect`, `useMemo`, and `useCallback`. Do not disable ESLint warnings for exhaustive dependencies.

## 4. Error Handling

Implement robust error handling for all asynchronous operations.

**Try-Catch**: Use try-catch blocks only for legitimately unexpected errors, do not use try-catch to avoid checking for expected error conditions.
Each try-catch block must include a comment explaining the specific error being caught and why it cannot be prevented.

**Error Boundaries**: Wrap top-level feature components in React Error Boundaries. This prevents a single component failure from crashing the entire PWA and allows the application to fail gracefully with a fallback UI.

**Supabase Integration**: Every call to the Supabase SDK must include an explicit check for the `error` object. Log these errors for debugging and provide the user with actionable feedback via toast notifications.
