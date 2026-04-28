# Plan: Consolidate CRA + Next.js into Single Next.js App

## TL;DR

Merge the CRA frontend (`/frontend`) and the Next.js booking app (`/nextjs-booking`) into a **single Next.js project** that serves both the public booking site (bananaaquapark.com) and the admin panel (app.bananaaquapark.com) using **subdomain-based routing in Next.js middleware**. The public booking pages are already migrated; only the admin app needs porting. After consolidation, `/frontend` (CRA) is deleted and `/nextjs-booking` becomes the sole frontend.

---

## Phase 1: Middleware & Subdomain Routing

**Goal:** A single Next.js middleware that detects the subdomain and routes accordingly.

1. **Create `middleware.ts`** at `nextjs-booking/middleware.ts` (the standard Next.js middleware entry point).
   - Merge logic from the existing `proxy.ts` (i18n redirect) with new subdomain detection.
   - **Admin subdomain** (`app.*`): skip i18n redirects, allow `/admin/*` routes, redirect `/` → `/admin`.
   - **Public domain** (`bananaaquapark.com` / `localhost:3000`): apply existing i18n redirect to `/{lang}/...`, block `/admin/*` with 404.
   - Use `request.headers.get('host')` to detect subdomain (works with Vercel and `app.localhost`).
   - Export `config.matcher` to cover all routes except `_next`, static assets.

2. **Delete `proxy.ts`** after its logic is absorbed into `middleware.ts`.

3. **Update `utils/subdomain.ts`** — add `isAdminSubdomain()` and `getSubdomain()` helpers (port from CRA's `frontend/src/utils/subdomain.ts`). The existing `getAdminUrl()` already works.

**Relevant files:**

- `nextjs-booking/proxy.ts` — absorb into middleware, then delete
- `nextjs-booking/middleware.ts` — create (new)
- `nextjs-booking/utils/subdomain.ts` — enhance with `isAdminSubdomain()`, `getSubdomain()`
- `frontend/src/utils/subdomain.ts` — reference for `isAdminSubdomain()` logic

---

## Phase 2: Admin Page Structure & Layout

**Goal:** Create the admin route group with its own layout (sidebar, admin theme).

4. **Create `app/admin/layout.tsx`** — Admin root layout.
   - Wrap with `ThemeRegistry` using admin theme (port `frontend/src/adminTheme.ts` → `nextjs-booking/lib/adminTheme.ts`).
   - Wrap with `AuthProvider` (reuse existing `contexts/AuthContext.tsx`).
   - Wrap with `ToastWrapper`.
   - Include the `AdminLayout` component (sidebar + main area).
   - Mark as `'use client'` or split into server/client parts as needed.
   - **No** `I18nProvider` or `[lang]` segment — admin uses simple i18next toggle, not path-based.

5. **Create admin route pages** under `app/admin/`:
   Each page is a thin `'use client'` wrapper that imports the existing CRA component.

   | Route                     | Page file                             | CRA source                                          |
   | ------------------------- | ------------------------------------- | --------------------------------------------------- |
   | `/admin`                  | `app/admin/page.tsx`                  | `AdminDashboard.tsx`                                |
   | `/admin/rooms`            | `app/admin/rooms/page.tsx`            | `RoomsManagement.tsx`                               |
   | `/admin/reservations`     | `app/admin/reservations/page.tsx`     | `ReservationManagement.tsx`                         |
   | `/admin/schedule`         | `app/admin/schedule/page.tsx`         | `ScheduleSummary.tsx`                               |
   | `/admin/booking-calendar` | `app/admin/booking-calendar/page.tsx` | `BookingCalendar.tsx`                               |
   | `/admin/pricing`          | `app/admin/pricing/page.tsx`          | `PriceManagement.tsx`                               |
   | `/admin/media`            | `app/admin/media/page.tsx`            | `MediaManagement.tsx`                               |
   | `/admin/revenue`          | `app/admin/revenue/page.tsx`          | `Revenue.tsx`                                       |
   | `/admin/commissions`      | `app/admin/commissions/page.tsx`      | `Commissions.tsx`                                   |
   | `/admin/wristbands`       | `app/admin/wristbands/page.tsx`       | `WristbandControl.tsx`                              |
   | `/admin/guests`           | `app/admin/guests/page.tsx`           | `GuestsManagement.tsx`                              |
   | `/admin/accommodations`   | `app/admin/accommodations/page.tsx`   | `Accommodations.tsx`                                |
   | `/admin/settings`         | `app/admin/settings/page.tsx`         | `Settings.tsx`                                      |
   | `/admin/roles`            | `app/admin/roles/page.tsx`            | `RolesManagement.tsx`                               |
   | `/admin/users`            | `app/admin/users/page.tsx`            | `UsersManagement.tsx`                               |
   | `/admin/event-types`      | `app/admin/event-types/page.tsx`      | `EventTypesManagement.tsx`                          |
   | `/admin/profile`          | `app/admin/profile/page.tsx`          | `ProfilePage.tsx`                                   |
   | `/admin/amenities`        | `app/admin/amenities/page.tsx`        | `AmenitiesManagement.tsx`                           |
   | `/login`                  | `app/login/page.tsx`                  | `LoginPage.tsx` (admin login, outside admin layout) |
   | `/forgot-password`        | `app/forgot-password/page.tsx`        | `ForgotPasswordPage.tsx`                            |
   | `/reset-password`         | `app/reset-password/page.tsx`         | `PasswordResetPage.tsx`                             |

   The auth pages (`/login`, `/forgot-password`, `/reset-password`) sit outside `/admin` because they don't use AdminLayout.  
   Middleware ensures these only render on the admin subdomain.

---

## Phase 3: Migrate Admin Components

**Goal:** Port all admin-specific React components and shared dependencies into the Next.js project.

6. **Copy admin components** from CRA to Next.js:
   - `frontend/src/components/admin/*` → `nextjs-booking/components/admin/`
     - `AdminLayout.tsx`, `SectionTitle.tsx`, `ReservationDetails.tsx`, `CreateReservationDialog.tsx`, `MediaPicker.tsx`, `ImageUpload.tsx`
   - `frontend/src/pages/admin/*` → `nextjs-booking/components/admin/pages/` (as client components, imported by the `app/admin/*/page.tsx` route files)
   - `frontend/src/pages/customer/ProfilePage.tsx` → `nextjs-booking/components/admin/pages/ProfilePage.tsx` (used in admin profile route)
   - `frontend/src/pages/customer/LoginPage.tsx`, `ForgotPasswordPage.tsx`, `PasswordResetPage.tsx` → `nextjs-booking/components/auth/` (shared between admin auth routes)

7. **Port `ProtectedRoute` component** — adapt from CRA's `frontend/src/components/common/ProtectedRoute.tsx`.
   - Replace React Router's `<Navigate>` with Next.js `redirect()` or `useRouter().push()`.
   - The guard checks `isAuthenticated`, `requiredRole`, `requiredPermission` from `useAuth()`.
   - Create as `nextjs-booking/components/common/ProtectedRoute.tsx` (client component).

8. **Port shared UI components** not yet in Next.js:
   - `DateRangePicker.tsx`, `NumberField.tsx`, `SingleDatePicker.tsx` → `nextjs-booking/components/common/`
   - These are used by admin pages (booking forms, pricing, etc.).

9. **Port admin theme** `frontend/src/adminTheme.ts` → `nextjs-booking/lib/adminTheme.ts`.

10. **Expand API service layer** (`nextjs-booking/lib/api.ts`):
    - The Next.js api.ts already has public-facing services (auth, rooms, reservations, amenities, media, contact, eventTypes, pricing, roles).
    - **Add missing admin services**: `adminService` (dashboard stats, revenue, commissions, users CRUD, contact messages, backup), `wristbandsService`, `guestsService`, and admin CRUD operations for existing services (e.g., `amenitiesService.createAmenity`, `roomsService.createRoom`).
    - Reference `frontend/src/services/api.ts` for the complete list of admin endpoints.

11. **Update TypeScript types** (`nextjs-booking/types/index.ts`):
    - Add missing types present in CRA but not yet in Next.js: `WristbandDelivery`, `Guest`, `DashboardStats`, `RevenueData`, `CommissionData`, plus any additional admin-specific interfaces.

---

## Phase 4: Adapt for Next.js Patterns

**Goal:** Replace React Router patterns with Next.js equivalents throughout migrated code.

12. **Replace `react-router-dom` usage** in all migrated components:
    - `useNavigate()` → `useRouter()` from `next/navigation`
    - `useParams()` → `useParams()` from `next/navigation`
    - `useSearchParams()` → `useSearchParams()` from `next/navigation`
    - `useLocation()` → `usePathname()` from `next/navigation`
    - `<Link to="...">` → `<Link href="...">` from `next/link`
    - `<Navigate to="..." replace>` → `redirect()` from `next/navigation`

13. **Add `'use client'` directive** to all migrated admin components (they rely heavily on `useState`, `useEffect`, MUI interactive components, browser APIs).

14. **Update environment variable prefixes**:
    - CRA uses `REACT_APP_*` → Next.js uses `NEXT_PUBLIC_*`
    - Ensure all admin components reference `NEXT_PUBLIC_API_URL` instead of `REACT_APP_API_URL`.
    - The Next.js api.ts already uses `NEXT_PUBLIC_API_URL`, so components importing from `lib/api.ts` are fine.

---

## Phase 5: i18n Handling for Admin

**Goal:** Admin uses a simple language toggle (not path-based URLs).

15. **Initialize i18n for admin** — create a simple `AdminI18nProvider` or reuse `I18nProvider` with a fixed/cookie-based locale (no URL segment).
    - Admin pages call `initI18n(locale)` based on localStorage/cookie preference.
    - No `[lang]` segment in admin URLs.
    - The existing `useTranslation()` hook works the same way — only the locale source differs.

16. **Reuse existing translation files** — `locales/en/translation.json` and `locales/es/translation.json` already contain admin-related keys from the CRA. Verify completeness and merge any missing keys from `frontend/src/locales/`.

---

## Phase 6: Dependency Alignment & Package Configuration

**Goal:** Ensure all required packages are available.

17. **Install missing dependencies** in `nextjs-booking/package.json`:
    - Compare CRA `frontend/package.json` with `nextjs-booking/package.json`.
    - Key packages already present: MUI, axios, i18next, react-hook-form, yup, date-fns, dayjs, react-toastify, swiper, react-image-gallery.
    - Likely missing or version-mismatched: check for any admin-specific MUI components or packages (`@mui/x-data-grid` if used, etc.)
    - **Remove `react-router-dom`** since Next.js handles routing.

18. **Update `next.config.ts`** if needed:
    - Ensure `images.remotePatterns` covers all domains used by admin (already covers localhost and bananaaquapark.com).
    - No additional changes expected.

---

## Phase 7: Cleanup & Deduplication

**Goal:** Eliminate the old CRA frontend and any duplicated code.

19. **Delete the entire `/frontend` directory** — all its functionality is now in `/nextjs-booking`.
    - The CRA build output (`frontend/build/`) is also deleted.
    - Public assets (`frontend/public/images/`) → ensure they're copied to `nextjs-booking/public/images/` first.

20. **Delete duplicated public booking pages from CRA** — these were already migrated to Next.js, so the CRA versions are the duplicates.

21. **Rename `/nextjs-booking` → `/frontend`** (optional but recommended for consistency and to avoid Vercel reconfiguration of root directory).

22. **Update workspace config** — `banana-ranch.code-workspace` if it references `/frontend`.

23. **Update `booking-engine-migration.md`** — mark as completed or archive.

24. **Clean up backend static paths** — the backend serves images from `frontend/public/images/`. After rename, this path still works. Verify in `backend/src/index.ts`.

---

## Phase 8: Vercel Deployment Configuration

**Goal:** Deploy the unified Next.js app from a single Vercel project.

25. **Update Vercel project settings:**
    - **Root Directory:** Change from `frontend` to `nextjs-booking` (or keep as `frontend` if renamed in step 21).
    - **Build Command:** `npm run build` (Next.js default).
    - **Output Directory:** Leave as default (`.next`).
    - **Framework Preset:** Next.js (should auto-detect).
    - **Node.js Version:** Ensure compatible with Next.js 16 (Node 20+).

26. **Configure domains in Vercel:**
    - **Primary domain:** `bananaaquapark.com` (public booking)
    - **Additional domain:** `app.bananaaquapark.com` (admin panel)
    - Both domains point to the **same** Vercel deployment. The middleware handles routing.

27. **Update environment variables in Vercel:**
    - Keep existing: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CURRENCY_SYMBOL`, `NEXT_PUBLIC_LOCALE`
    - Add: `NEXT_PUBLIC_APP_SUBDOMAIN=app` (already in .env.local)
    - Remove any `REACT_APP_*` variables (CRA leftovers)

28. **Verify Vercel deployment:**
    - `bananaaquapark.com` → public booking with i18n path routing
    - `app.bananaaquapark.com` → admin panel
    - `bananaaquapark.com/admin/*` → 404 (blocked by middleware)
    - All API calls to backend work from both subdomains (CORS already configured)

---

## Verification

1. **Build verification:** `cd nextjs-booking && npm run build` — no TypeScript errors, all pages build successfully.
2. **Public booking smoke test:**
   - `localhost:3000` → redirects to `/es` (or detected locale)
   - `/es/rooms`, `/en/daypass`, `/es/events`, `/es/contact`, `/es/gallery` all render
   - Language switcher works, cookie persists choice
   - Booking flow works end-to-end (room reservation, daypass)
3. **Admin smoke test:**
   - `app.localhost:3000` → redirected to `/admin` → login page (if not authenticated)
   - Login → admin dashboard renders with sidebar
   - Navigate through all admin routes: reservations, rooms, pricing, settings, etc.
   - Permission-based route guards work (restricted routes redirect/block)
   - CRUD operations work: create/edit/delete for rooms, users, amenities, pricing, etc.
4. **Cross-subdomain isolation:**
   - Public domain cannot access `/admin/*`
   - Admin subdomain cannot access `/es/rooms` etc.
5. **Vercel deployment test:**
   - Deploy to preview branch
   - Test both domains in Vercel preview
   - Verify CORS with backend API
   - Verify image optimization works for both subdomains
6. **Backend CORS check:** Ensure `CORS_ORIGINS` in backend includes both `bananaaquapark.com` and `app.bananaaquapark.com`.

---

## Decisions

- **Admin pages are all client-side rendered** (`'use client'`): Admin CRUD pages rely heavily on interactive state (forms, dialogs, tables). No SSR/SSG benefit for admin.
- **No path-based i18n for admin**: As specified. Admin uses cookie/localStorage toggle.
- **Single Vercel project, two domains**: Both subdomains share the same deployment. Middleware handles routing. No need for a second Vercel project.
- **Admin auth routes sit outside `/admin` layout**: `/login`, `/forgot-password`, `/reset-password` on admin subdomain don't need the sidebar.
- **Rename `nextjs-booking` → `frontend`**: Recommended for minimal Vercel config change and consistency, but optional.

## Further Considerations

1. **MUI version difference:** CRA uses MUI v5 (`@mui/material 5.18.0`), Next.js uses MUI v9 (`@mui/material 9.0.0`). Admin components may need API adjustments if MUI 9 has breaking changes from v5. **Recommendation:** Migrate admin components to MUI v9 to keep a single version. Check migration guide for breaking changes.
2. **Backend CORS:** Currently `CORS_ORIGINS` may only include the CRA frontend URL. After this migration, ensure it includes both the public and admin subdomains. **Recommendation:** Verify and update `CORS_ORIGINS` env var in backend deployment (Render).
3. **Public assets:** Some admin pages may reference images from `frontend/public/images/`. Ensure all are copied to `nextjs-booking/public/` before deleting `/frontend`. **Recommendation:** Diff the `public/` directories of both projects.
