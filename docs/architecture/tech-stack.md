# Technology Stack

This document explains the technology stack decisions for the [Freshers PWA](/README.md).

## 1. Frontend Library
**Chosen**: [React](https://react.dev/)

**React** uses a component-based architecture that facilitates code reusability and maintenance. Its extensive ecosystem and documentation provide a reliable foundation for troubleshooting. **React** allows for granular control over application structure and has a shorter learning curve than monolithic frameworks.

### Alternatives Considered

**Next.js**: Provides server-side rendering (SSR) which improves initial load times but introduces unnecessary complexity for client-heavy dashboards.\
**Angular**: Suitable for enterprise-scale applications but requires significant boilerplate and a steeper learning curve.\
**Svelte**: Offers high performance through a compilation-step approach but lacks the extensive community support and library ecosystem of **React**.

## 2. Build Tool
**Chosen** [Vite](https://vite.dev/)

**Vite** uses native browser ES modules to enable fast Hot Module Replacement (HMR) during development. It utilises Rollup for production builds, ensuring optimised asset delivery.

### Alternatives Considered

**Webpack**: Offers extensive customisation but involves complex configuration and slower build cycles.\
**Parcel**: Provides a zero-config experience but does not match the HMR performance of **Vite**.\

## 3. UI Component Library
**Chosen**: [shadcn/ui](https://ui.shadcn.com/)

**shadcn/ui** integrates Radix UI primitives with [Tailwind CSS](https://tailwindcss.com/). This combination ensures [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) compliant accessibility and utility-first styling. It is optimal for mobile-first PWAs because it allows developers to maintain small bundle sizes by only including necessary components.

### Alternatives Considered

**Radix UI**: Provides accessible primitives but requires significant manual styling effort.\
**Bootstrap**: Accelerates development but relies on pre-defined themes that limit design flexibility.\
**Material UI**: Offers a comprehensive suite but increases bundle size, which can degrade PWA performance on low-bandwidth connections.

## 4. Backend as a Service
**Chosen**: [Supabase](https://supabase.com/)

**Supabase** provides a relational PostgreSQL database, which is ideal for managing complex relationships between jobs, properties, and users. It includes essential integrated features for authentication and authorisation with [Supabase Auth](https://supabase.com/auth), and storage for media uploads with [Supabase Storage](https://supabase.com/storage).

### Alternatives Considered

**Firebase**: Uses Firestore (NoSQL), which complicates relational data modelling and increases the risk of data duplication, as well as increasing vendor lock-in.\
**PlanetScale**: Provides a robust SQL environment but lacks integrated authentication and storage services, requiring additional third-party providers.

## 5. Hosting and Deployment
**Chosen**: [Vercel](https://vercel.com/)

**Vercel** provides native integration for **Vite**-based applications and utilises a global Edge Network for low-latency asset delivery. It automates CI/CD pipelines and supports instantaneous rollbacks to maintain application stability.

### Alternatives Considered

**Netlify**: Offers comparable deployment features but provides fewer optimisations specifically for the React ecosystem.\
**AWS**: Provides extensive infrastructure options but increases configuration and maintenance overhead for solo developers.
