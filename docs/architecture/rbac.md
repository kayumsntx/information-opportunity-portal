# Role-Based Access Control (RBAC) Architecture

This document describes the design, implementation, and operational procedures for the Role-Based Access Control (RBAC) system in the Information & Opportunity Portal backend.

---

## 1. System Roles

The platform implements three primary global roles:

### 1.1 `SUPER_ADMIN`
* **Purpose:** Complete administrative oversight of the entire portal.
* **Capabilities:** Full platform access with a safe wildcard bypass in guards. Can manage users, roles, permissions, categories, author profiles, posts, approvals, system settings, and audit logs.
* **Safety Invariant:** The system prevents the accidental revocation or deletion of the last active `SUPER_ADMIN`.

### 1.2 `CATEGORY_AUTHOR`
* **Purpose:** Content creators assigned to create and manage opportunities within designated categories.
* **Capabilities:**
  * Create, edit, and delete their own posts.
  * Submit draft posts for administrative review and approval.
  * Update their own author profile.
  * Cannot approve, publish, or modify other authors' content.
  * Cannot access user or role administration.

### 1.3 `REGISTERED_USER`
* **Purpose:** Standard authenticated user on the platform.
* **Capabilities:**
  * Access registered-user resources, browse posts, categories, and author profiles.
  * Prepare for community features (groups, conversations) in future modules.
  * Cannot access author or administration endpoints.

### 1.4 `Guest` (Unauthenticated)
* Any unauthenticated visitor accessing public endpoints (e.g. public post feeds, general categories). Cannot access any endpoints guarded by `JwtAuthGuard`.

> [!NOTE]
> Group-level roles such as **Group Owner** and **Group Moderator** are scoped strictly to individual groups within the Community module and are not global system roles.

---

## 2. Permission Naming Conventions

Permissions follow a clean, hierarchical format:
```
<resource>.<action>
```

### 2.1 Defined System Permissions

| Module | Permission Name | Description |
|---|---|---|
| **USER** | `users.read` | View users list and user profiles |
| | `users.update` | Update user account information |
| | `users.suspend` | Suspend user accounts |
| | `users.ban` | Ban user accounts |
| | `users.delete` | Delete user accounts |
| | `users.assign_role` | Assign or revoke roles to users |
| **ROLE** | `roles.read` | View roles and their details |
| | `roles.create` | Create custom roles |
| | `roles.update` | Update role details |
| | `roles.delete` | Delete custom roles |
| | `permissions.read` | View available permissions |
| | `permissions.assign` | Assign permissions to roles |
| **CATEGORY** | `categories.read` | Browse and view categories |
| | `categories.create` | Create new categories |
| | `categories.update` | Update category details |
| | `categories.delete` | Delete categories |
| | `categories.assign_author` | Assign authors to categories |
| **AUTHOR** | `authors.read` | View author profiles |
| | `authors.create` | Create author profiles |
| | `authors.update` | Update author profile details |
| | `authors.suspend` | Suspend author privileges |
| | `authors.assign_category` | Assign categories to author profiles |
| **POST** | `posts.create` | Create new post drafts |
| | `posts.read` | Read posts |
| | `posts.update_own` | Update own authored posts |
| | `posts.update_any` | Update any post on platform |
| | `posts.delete_own` | Delete own authored posts |
| | `posts.delete_any` | Delete any post on platform |
| | `posts.submit` | Submit draft post for approval |
| | `posts.approve` | Approve submitted post revisions |
| | `posts.reject` | Reject submitted post revisions |
| | `posts.publish` | Publish approved posts |
| | `posts.archive` | Archive existing posts |
| **SYSTEM** | `settings.read` | Read platform system settings |
| | `settings.update` | Update platform system settings |
| | `audit_logs.read` | Read platform audit logs |

---

## 3. Role-Permission Mapping

```
┌────────────────────────────────────────────────────────┐
│                      SUPER_ADMIN                       │
│    (Wildcard bypass: ALL permissions granted)          │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     CATEGORY_AUTHOR     │ │     REGISTERED_USER     │
│ ─────────────────────── │ │ ─────────────────────── │
│ categories.read         │ │ posts.read              │
│ authors.read            │ │ categories.read         │
│ authors.update          │ │ authors.read            │
│ posts.create            │ └─────────────────────────┘
│ posts.read              │
│ posts.update_own        │
│ posts.delete_own        │
│ posts.submit            │
└─────────────────────────┘
```

---

## 4. RBAC Decorators & Guards

### 4.1 `@Roles(...roles)` & `RolesGuard`
* Attaches required roles metadata via `SetMetadata`.
* `RolesGuard` verifies that `req.user.roles` contains at least one of the required roles.
* `SUPER_ADMIN` automatically passes.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.SUPER_ADMIN, SystemRole.CATEGORY_AUTHOR)
@Get('dashboard')
getAuthorDashboard() { ... }
```

### 4.2 `@Permissions(...permissions)` & `PermissionsGuard`
* Attaches required permissions metadata.
* `PermissionsGuard` verifies that `req.user.permissions` includes all required permissions.
* `SUPER_ADMIN` automatically passes via wildcard privilege.

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('users.assign_role')
@Post('users/:userId/roles')
assignRole() { ... }
```

---

## 5. User Role Management API

All endpoints are prefixed with `/api/v1/admin` and require JWT Bearer authentication.

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/roles` | `roles.read` | List all system roles with assigned permissions and user counts |
| `GET` | `/api/v1/admin/roles/:id` | `roles.read` | Get detailed information for a specific role |
| `GET` | `/api/v1/admin/permissions` | `permissions.read` | List all available system permissions grouped by module |
| `POST` | `/api/v1/admin/users/:userId/roles` | `users.assign_role` | Assign a role to a user. Recorded in `AuditLog` |
| `DELETE` | `/api/v1/admin/users/:userId/roles/:roleId` | `users.assign_role` | Revoke a role from a user. Recorded in `AuditLog` |

---

## 6. Super Admin Bootstrap

Public registration never allows creating `SUPER_ADMIN` or `CATEGORY_AUTHOR` accounts. Initial Super Admin accounts can only be provisioned using one of two secure mechanisms:

### Method 1: CLI Bootstrap Command
Run the dedicated bootstrap script in `apps/api`:
```bash
pnpm --filter api bootstrap:admin <email> <password>
```
* Uses Argon2id to hash the password securely.
* Guarantees role assignment to `SUPER_ADMIN`.
* Never exposes or prints the password in logs.

### Method 2: Environment Variables with Database Seed
Provide credentials in `.env` or Render environment settings:
```env
SUPER_ADMIN_EMAIL=admin@informationportal.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```
Then run the seed:
```bash
pnpm --filter api seed
```
* Idempotent: Re-running will not recreate duplicates.
* If the user already exists, verifies they hold the `SUPER_ADMIN` role.

---

## 7. Security Invariants

1. **Last Super Admin Protection:**
   The `RolesService.revokeRoleFromUser` method checks active Super Admin count and throws `BadRequestException` if attempting to revoke the role from the sole remaining active Super Admin.
2. **Audit Logging:**
   All role assignments (`ROLE_ASSIGNED`) and revocations (`ROLE_REVOKED`) are recorded atomically in `AuditLog` with target user details, role information, timestamp, and executing administrator ID.
3. **Server-Side Authorization:**
   Roles and permissions are never read from request payloads or client tokens. They are loaded exclusively from database records in `JwtStrategy`.
4. **Registration Isolation:**
   Public registration (`POST /api/v1/auth/register`) strictly assigns `REGISTERED_USER` inside a database transaction and ignores any client-supplied role parameters.
