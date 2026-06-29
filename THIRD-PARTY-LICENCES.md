# Third-Party Licences

This application incorporates the following open-source components under their respective licences.

Full dependency lists are maintained in `package.json`. Each package's licence file is included in its distribution and archived in `node_modules/`.

All components use permissive (MIT, Apache-2.0, ISC) licences. No copyleft or GPL-licensed code is used. The company's use, modification, and commercialisation of the Web App is not restricted by any third-party licence.

---

## MIT Licence

| Package | Purpose |
|---------|---------|
| @hookform/resolvers | Form validation resolvers |
| @supabase/supabase-js | Supabase database and auth client |
| @tanstack/react-table | Table building library |
| clsx | Classname utility |
| date-fns | Date manipulation library |
| input-otp | OTP input component |
| media-chrome | Media element web components |
| nuqs | URL query state management |
| radix-ui | Accessible UI primitives |
| react | Library for building user interfaces |
| react-day-picker | Date picker component |
| react-dom | React DOM renderer |
| react-dropzone | File dropzone component |
| react-hook-form | Form state management |
| react-router-dom | Client-side routing |
| recharts | Charting library |
| sonner | Toast notifications library |
| tailwind-merge | Tailwind class merging |
| vaul | Drawer component |
| workbox-core | Service worker utilities |
| workbox-precaching | Service worker precaching |
| zod | Schema validation library |

---

## Apache 2.0 Licence

| Package | Purpose |
|---------|---------|
| class-variance-authority | Class variant utility |

---

## ISC Licence

| Package | Purpose |
|---------|---------|
| lucide-react | Icon component library |

---

## Development-Only Tooling

The following packages are used during development, testing, and build only. They are not distributed to end users. All use permissive licences.

- **Build tooling**: vite (MIT), vite-plugin-pwa (MIT), @vitejs/plugin-react (MIT), @tailwindcss/vite (MIT), tailwindcss (MIT), tw-animate-css (MIT), typescript (Apache 2.0)
- **Testing**: vitest (MIT), @playwright/test (Apache 2.0), @testing-library/react (MIT), @testing-library/jest-dom (MIT), @testing-library/user-event (MIT), jsdom (MIT), msw (MIT)
- **Linting and code quality**: @biomejs/biome (MIT OR Apache 2.0), shadcn (MIT), @vite-pwa/assets-generator (MIT)
- **Type definitions**: @types/react (MIT), @types/react-dom (MIT), @types/node (MIT), globals (MIT)
