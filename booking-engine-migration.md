# Next.js migration — Banana Aqua Park booking engine

> **Status: COMPLETED** — Migration finished (all 8 phases). The CRA frontend has been deleted. The consolidated Next.js app is now at `/frontend` serving both `bananaaquapark.com` (public, i18n path routing) and `app.bananaaquapark.com` (admin panel) via subdomain-based proxy routing.

## Context

~~You are migrating the public-facing booking engine at `bananaaquapark.com` from Create React App (CRA) to Next.js 14 with the App Router. The admin panel at `app.bananaaquapark.com` is a separate CRA app and is NOT part of this migration.~~

**Migration complete.** Both public booking and admin panel now run from a single Next.js 16 app in `/frontend`.

The site sells: hotel stays, day passes, afternoon passes, and events.

---

## Rendering strategy per route

1. Determine what each route should use SSG, ISR, or SSR.
2. Do not use SSR where SSG or ISR is sufficient.

---

## Project setup

1. Scaffold with `npx create-next-app@latest` using the App Router (`/app` directory), TypeScript, and Tailwind CSS.
2. Preserve all existing React components. Move them into `/components`. No rewrites — only restructure.
3. Replace `react-router-dom` with Next.js file-based routing. Map each existing route to the equivalent `page.tsx` file.
4. Replace all `<img>` tags with `next/image`. Always provide `width`, `height`, and `alt`. Use `priority` on above-the-fold hero images.
5. Replace all internal `<a>` tags and `useNavigate` calls with `next/link`.

---

## SEO — required on every public page

Add a `generateMetadata()` export to every `page.tsx` under `/app`. Each page must set:

- `title` — unique per page, include "Banana Aqua Park" suffix
- `description` — 150 characters max, unique per page
- `openGraph.title`, `openGraph.description`, `openGraph.images`
- `canonical` URL

For dynamic routes, generate metadata from the fetched data inside `generateMetadata()`.

Add a root `layout.tsx` with:

- A default `<meta name="robots" content="index, follow">`
- `<html lang="es">` (or `"en"` depending on primary audience)
- Google Analytics or equivalent inside a `<Script>` tag with `strategy="afterInteractive"`

---

## Schema.org structured data

Add a `<script type="application/ld+json">` block inside each page component (not in `layout.tsx`). Determine which Schema.org type is most relevant for each page.

---

## Data fetching rules

- In SSG and ISR pages, fetch data inside the `page.tsx` component directly (Next.js server component). Do not use `useEffect` or `useState` for initial data.
- In SSR pages, use `fetch()` with `cache: 'no-store'` to guarantee fresh data on every request.
- In ISR pages, use `fetch()` with `next: { revalidate: 600 }`.
- Client components (CSR pages and interactive booking widgets) must be marked with `'use client'` at the top of the file.

---

## Environment variables

Move all API base URLs and keys to `.env.local`. Prefix any variable that must be accessible in the browser with `NEXT_PUBLIC_`. Never expose secret keys with `NEXT_PUBLIC_`.

---

## Deployment target

Deploy to Vercel. The following must work after deployment:

- `bananaaquapark.com` resolves to the Next.js app
- All previous CRA routes return HTTP 200 (no broken links)
- `next/image` serves optimized images via Vercel's image CDN
- ISR revalidation works without manual redeploys

---

## Language Selection

Along with the migration to Next.js, we also want to update the language display mechanism on the website for SEO improvements.

Currently, the site uses a simple toggle that allows users to switch between English and Spanish, and the react-i18next library handles the translations.

1. We want to implement path-based path-based internationalization (/en/, /es/) so Google indexes each version separately, improving SEO for both languages. Also making sure we are using server-side rendering (SSR) for the initial page load to ensure that search engines can crawl the content in both languages effectively.
2. This will apply only to the public-facing booking engine at `bananaaquapark.com`. The admin panel at `app.bananaaquapark.com` will continue to use the existing toggle mechanism without path-based routing, as it is not indexed by search engines and is only used by internal staff.
3. Implement automatic language detection based on the user's browser settings, while still allowing manual override through the toggle.
4. Ensure that the language selection persists across sessions using cookies or local storage, so users don't have to reselect their preferred language on each visit.
5. Update the sitemap and hreflang tags to reflect the new path-based language structure, helping search engines understand the relationship between the different language versions of the site.
