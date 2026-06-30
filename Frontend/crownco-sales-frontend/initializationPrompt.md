# Project Initialization Prompt

Use this prompt to initialize a new Next.js project with the exact same setup as the current project.

## Prompt to Use:

```
Create a Next.js 16.1.1 project with TypeScript, Tailwind CSS v4, Redux Toolkit, and the following exact configuration:

## 1. Package.json Setup

Create package.json with these exact dependencies and scripts:

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:fix": "eslint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "@reduxjs/toolkit": "^2.11.2",
    "lucide-react": "^0.562.0",
    "next": "16.1.1",
    "phosphor-icons": "^1.4.2",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-redux": "^9.2.0",
    "recharts": "^3.6.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "prettier": "3.7.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

## 2. TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

## 3. Next.js Configuration (next.config.ts)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

## 4. ESLint Configuration (eslint.config.mjs)

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

## 5. PostCSS Configuration (postcss.config.mjs)

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

## 6. Global CSS (src/app/globals.css)

Use this EXACT global CSS file with all custom CSS variables and Tailwind theme configuration:

```css
@import "tailwindcss";

:root {
  /* Base layout tokens */
  --background: #ffffff;
  --foreground: #1f1f1f;

  /* Primary palette */
  --primary-base: #0082E0;
  --primary-hover: #006fc0;
  --primary-active: #005a9a;
  --primary-selected: #e5f3ff;

  /* Secondary palette */
  --secondary-base: #0055a5;
  --secondary-hover: #004482;
  --secondary-active: #003360;
  --secondary-selected: #e0edff;

  /* Semantic colors */
  --error: #AF4B4B;
  --success: #589e67;
  --warning: #d28e3d;
  --purple: #954baf;
  --lime: #b1ab1d;

  /* Disabled */
  --disabled: #e0e0e0;
  --disabled-text: #9e9e9e;

  /* Surface colors for badges / subtle backgrounds */
  --surface-primary: #e5f3ff;
  --surface-secondary: #e3efff;
  --surface-error: #fbeaea;
  --surface-success: #e6f4ea;
  --surface-warning: #fdf1dd;
  --surface-purple: #f4e7fb;
  --surface-lime: #f6f6e2;
  --surface-neutral: #f5f5f5;
}

@theme inline {
  /* Map tokens to Tailwind-style theme variables */
  --color-background: var(--background);
  --color-foreground: var(--foreground);

  --color-primary: var(--primary-base);
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --color-primary-selected: var(--primary-selected);

  --color-secondary: var(--secondary-base);
  --color-secondary-hover: var(--secondary-hover);
  --color-secondary-active: var(--secondary-active);
  --color-secondary-selected: var(--secondary-selected);

  --color-error: var(--error);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-purple: var(--purple);
  --color-lime: var(--lime);

  --color-disabled: var(--disabled);
  --color-disabled-text: var(--disabled-text);

  --color-surface-primary: var(--surface-primary);
  --color-surface-secondary: var(--surface-secondary);
  --color-surface-error: var(--surface-error);
  --color-surface-success: var(--surface-success);
  --color-surface-warning: var(--surface-warning);
  --color-surface-purple: var(--surface-purple);
  --color-surface-lime: var(--surface-lime);
  --color-surface-neutral: var(--surface-neutral);

  --font-sans: var(--font-inter);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}
```

## 7. Redux Store Setup

### src/store/store.ts
```typescript
import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "../features/counter/counterSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### src/store/hooks.ts
```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### src/features/counter/counterSlice.ts
```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    reset: (state) => {
      state.value = 0;
    },
  },
});

export const { increment, decrement, incrementByAmount, reset } =
  counterSlice.actions;

export default counterSlice.reducer;
```

## 8. Providers Setup

### src/app/providers.tsx
```typescript
"use client";

import { Provider } from "react-redux";
import { ReactNode } from "react";
import { store } from "../store/store";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <Provider store={store}>{children}</Provider>;
}
```

## 9. Root Layout (src/app/layout.tsx)

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## 10. .gitignore

```gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

## 11. Project Structure

Create the following folder structure:
```
my-app/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── ui/
│   ├── features/
│   │   └── counter/
│   │       └── counterSlice.ts
│   └── store/
│       ├── hooks.ts
│       └── store.ts
├── public/
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── .gitignore
```

## 12. Installation Steps

After creating all files, run:
1. `npm install` (or `yarn install` or `pnpm install`)
2. `npm run dev` to start the development server

## Important Notes:

- Use Next.js 16.1.1 with App Router (src/app directory structure)
- Use Tailwind CSS v4 with PostCSS plugin
- Use React 19.2.3
- Use Redux Toolkit for state management
- Use TypeScript with strict mode enabled
- Use ESLint with Next.js config
- Use Prettier for code formatting
- The global CSS file contains all custom color variables and theme configuration - keep it exactly as provided
- Path alias `@/*` is configured to point to root directory
- Inter font is loaded from Google Fonts and set as CSS variable `--font-inter`
```

