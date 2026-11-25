# Architecture Guide: Category & Author Management

## Overview

The **Category & Author Management** module represents the structural backbone of the Information & Opportunity Portal. It establishes hierarchical multi-lingual content taxonomy and enforces strict administrative onboarding and scoping for content authors.

---

## 1. Category Structure & Hierarchy

Categories are modeled with a recursive self-referential relationship (`parentId -> id`), supporting multi-level taxonomy trees (e.g. `Jobs -> Government Jobs`, `Study Abroad -> Germany -> Ausbildung`).

```
Category
  ├── id (UUID)
  ├── name (Base English/Primary)
  ├── slug (Unique kebab-case)
  ├── description (Optional text)
  ├── iconUrl (Optional SVG/icon URL)
  ├── imageUrl (Optional banner URL)
  ├── order (Sorting priority integer)
  ├── isActive (Soft activation flag)
  ├── parentId (Nullable UUID -> Category)
  └── relations
        ├── parent (Category)
        ├── children (Category[])
        ├── translations (CategoryTranslation[])
        └── categoryAuthors (CategoryAuthor[])
```

### Business Rules & Safeguards:
1. **Self-Parenting Prevention**: A category cannot have its own ID as `parentId`.
2. **Circular Ancestor Validation**: When moving or updating a category's `parentId`, the system traverses up the ancestor chain to ensure the target parent is not already a descendant of the category.
3. **Safe Deletion Strategy**:
   - Hard deletion is blocked if the category has subcategories (`children.length > 0`).
   - Hard deletion is blocked if published or draft posts reference the category (`postCategories.length > 0`).
   - Soft deactivation (`isActive: false`) is enforced to preserve data integrity and SEO indexing.
4. **Ordering & Tree Construction**: The tree builder groups top-level root categories (`parentId === null`) and nests children recursively, sorted by `order ASC, name ASC`.

---

## 2. Multilingual Category Handling

Multilingual support is decoupled from category instances via the `CategoryTranslation` model.

```
CategoryTranslation
  ├── id (UUID)
  ├── categoryId (UUID -> Category)
  ├── language ('bn' | 'en' | 'de')
  ├── name (Translated Title)
  └── description (Translated Description)
  
  Unique Constraint: @@unique([categoryId, language])
```

### Fallback & Resolution Strategy:
- When a public or admin consumer requests categories with `?lang=<lang_code>`:
  1. The service checks for an existing translation matching `<lang_code>` (case-insensitive).
  2. If found, the category `name` and `description` are dynamically projected from the translation.
  3. If missing, it transparently falls back to the canonical base `Category` attributes without failing.
- Admin can independently add, update, or preview translations via `PUT /api/v1/admin/categories/:id/translations`.

---

## 3. Author Architecture & Roles

Authors are represented by `AuthorProfile`, linked 1-to-1 with a registered `User`.

```
AuthorProfile
  ├── id (UUID)
  ├── userId (UUID -> User, Unique)
  ├── displayName (Public Author Name)
  ├── bio (Expertise and background)
  ├── profileImage (Avatar URL)
  ├── country (Country of residence/expertise)
  ├── location (City or region)
  ├── language (Primary writing language, default 'en')
  ├── website (Personal / organizational portal)
  ├── socialLinks (JSON map of social accounts)
  ├── authorType ('LOCAL' | 'INTERNATIONAL')
  └── status ('ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED' | 'INACTIVE')
```

### Onboarding Workflow:
1. **Controlled Admin Promotion**: Authors cannot self-register publicly. An Administrator promotes an existing registered user via `POST /api/v1/admin/authors`.
2. **Atomic Role Assignment**: Inside a database transaction (`prisma.$transaction`):
   - Creates the `AuthorProfile` record.
   - Automatically assigns the `CATEGORY_AUTHOR` system role in `user_roles`.
   - Optionally assigns initial authorized categories in `category_authors`.
3. **Audit Log Recording**: Logs `AUTHOR_PROMOTED` with administrative attribution (`adminId`).

---

## 4. Author Statuses & Lifecycle

| Status | Content Submission | Visible on Portal | Post Status on Suspend |
|---|---|---|---|
| `PENDING_REVIEW` | ❌ Blocked | ❌ Hidden | N/A |
| `ACTIVE` | ✅ Allowed (in assigned categories) | ✅ Visible | Published posts remain visible |
| `SUSPENDED` | ❌ Blocked from submitting revisions | ⚠️ Profile flagged | Published posts remain intact |
| `INACTIVE` | ❌ Blocked | ❌ Hidden | Archived |

- **Suspension Invariance**: When an author is suspended, their historical published posts remain visible to avoid breaking community resources and search engine indexation.
- **Posting Validation Rule (`canAuthorPostInCategory`)**: Before an author can create or revise content in a category:
  1. `AuthorProfile.status` must be `ACTIVE`.
  2. Target `Category.isActive` must be `true`.
  3. An explicit `CategoryAuthor` assignment must exist linking `(categoryId, userId)`.

---

## 5. Author Category Scoping

Categories are assigned to authors through the `CategoryAuthor` join model:

```
CategoryAuthor
  ├── id (UUID)
  ├── categoryId (UUID -> Category)
  ├── userId (UUID -> User)
  ├── assignedAt (Timestamp)
  └── assignedBy (UUID of Admin)

  Unique Constraint: @@unique([categoryId, userId])
```

- Prevents duplicate assignments using composite uniqueness.
- Authors can only draft and publish posts within their assigned categories.
- Admins can assign or revoke category authorizations dynamically at any time.

---

## 6. API Reference

### Category Endpoints

| Method | Endpoint | Auth Guard | Permissions | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/categories` | Public | None | List all active categories (flat) |
| `GET` | `/api/v1/categories/tree` | Public | None | Hierarchical active category tree |
| `GET` | `/api/v1/categories/:slug` | Public | None | Get active category details by slug |
| `GET` | `/api/v1/admin/categories` | Bearer JWT | `categories.read` | Admin view of all categories |
| `GET` | `/api/v1/admin/categories/stats` | Bearer JWT | `categories.read` | Total, active, inactive, root, child counts |
| `GET` | `/api/v1/admin/categories/:id` | Bearer JWT | `categories.read` | Category details by ID |
| `POST` | `/api/v1/admin/categories` | Bearer JWT | `categories.create` | Create category (auto-slug, parent check) |
| `PATCH` | `/api/v1/admin/categories/:id` | Bearer JWT | `categories.update` | Update details (circular hierarchy checks) |
| `PATCH` | `/api/v1/admin/categories/:id/status`| Bearer JWT | `categories.update` | Activate / deactivate category |
| `DELETE`| `/api/v1/admin/categories/:id` | Bearer JWT | `categories.delete` | Safe delete (blocks if children/posts exist)|
| `PUT` | `/api/v1/admin/categories/:id/translations`| Bearer JWT | `categories.update` | Upsert translation (bn, en, de) |

### Author Endpoints

| Method | Endpoint | Auth Guard | Permissions | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/admin/authors` | Bearer JWT | `authors.create` | Promote registered user to author |
| `GET` | `/api/v1/admin/authors` | Bearer JWT | `authors.read` | Paginated authors with search & filters |
| `GET` | `/api/v1/admin/authors/stats` | Bearer JWT | `authors.read` | Total, local, international, status metrics |
| `GET` | `/api/v1/admin/authors/:id` | Bearer JWT | `authors.read` | Author profile, assigned categories & user |
| `PATCH` | `/api/v1/admin/authors/:id` | Bearer JWT | `authors.update` | Update author profile attributes |
| `PATCH` | `/api/v1/admin/authors/:id/status`| Bearer JWT | `authors.suspend`| Update author status (Active/Suspended) |
| `POST` | `/api/v1/admin/authors/:id/categories`| Bearer JWT | `authors.assign_category` | Assign categories to author |
| `DELETE`| `/api/v1/admin/authors/:id/categories/:categoryId` | Bearer JWT | `authors.assign_category` | Remove category assignment |
| `GET` | `/api/v1/admin/authors/:id/categories` | Bearer JWT | `authors.read` | Get categories assigned to author |
| `GET` | `/api/v1/admin/categories/:categoryId/authors` | Bearer JWT | `categories.read` | Get authors assigned to category |
| `GET` | `/api/v1/author/profile` | Bearer JWT | `authors.read` | Authenticated author's own profile |
| `PATCH` | `/api/v1/author/profile` | Bearer JWT | `authors.update` | Update own author bio/displayName/links |
| `GET` | `/api/v1/author/categories` | Bearer JWT | `categories.read` | Authenticated author's assigned categories |

---

## 7. Frontend Admin Panel (`apps/web`)

The Next.js App Router admin application provides complete operational controls:
- **`/admin/categories`**: Interactive flat and tree hierarchy views, search, quick active toggling, parent assignment, deletion safeguards, and multilingual translation drawer.
- **`/admin/authors`**: Author directory with pagination, search, status pills (`ACTIVE`, `PENDING_REVIEW`, `SUSPENDED`), author type filtering (`LOCAL`/`INTERNATIONAL`), and user promotion wizard.
- **`/admin/authors/[id]`**: Deep author management console displaying linked user account details, authorized category assignments with instant add/remove controls, and status update actions.
