export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CATEGORY_AUTHOR = 'CATEGORY_AUTHOR',
  REGISTERED_USER = 'REGISTERED_USER',
}

export interface PermissionDefinition {
  name: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // USER
  { name: 'users.read', module: 'USER', description: 'View users list and profiles' },
  { name: 'users.update', module: 'USER', description: 'Update user account information' },
  { name: 'users.suspend', module: 'USER', description: 'Suspend user accounts' },
  { name: 'users.ban', module: 'USER', description: 'Ban user accounts' },
  { name: 'users.delete', module: 'USER', description: 'Delete user accounts' },
  { name: 'users.assign_role', module: 'USER', description: 'Assign or revoke roles to users' },

  // ROLE
  { name: 'roles.read', module: 'ROLE', description: 'View roles and their details' },
  { name: 'roles.create', module: 'ROLE', description: 'Create custom roles' },
  { name: 'roles.update', module: 'ROLE', description: 'Update role details' },
  { name: 'roles.delete', module: 'ROLE', description: 'Delete custom roles' },
  { name: 'permissions.read', module: 'ROLE', description: 'View available permissions' },
  { name: 'permissions.assign', module: 'ROLE', description: 'Assign permissions to roles' },

  // CATEGORY
  { name: 'categories.read', module: 'CATEGORY', description: 'Browse and view categories' },
  { name: 'categories.create', module: 'CATEGORY', description: 'Create new categories' },
  { name: 'categories.update', module: 'CATEGORY', description: 'Update category details' },
  { name: 'categories.delete', module: 'CATEGORY', description: 'Delete categories' },
  { name: 'categories.assign_author', module: 'CATEGORY', description: 'Assign authors to categories' },

  // AUTHOR
  { name: 'authors.read', module: 'AUTHOR', description: 'View author profiles' },
  { name: 'authors.create', module: 'AUTHOR', description: 'Create author profiles' },
  { name: 'authors.update', module: 'AUTHOR', description: 'Update author profile details' },
  { name: 'authors.suspend', module: 'AUTHOR', description: 'Suspend author privileges' },
  { name: 'authors.assign_category', module: 'AUTHOR', description: 'Assign categories to author profile' },

  // POST
  { name: 'posts.create', module: 'POST', description: 'Create new post drafts' },
  { name: 'posts.read', module: 'POST', description: 'Read posts' },
  { name: 'posts.update_own', module: 'POST', description: 'Update own authored posts' },
  { name: 'posts.update_any', module: 'POST', description: 'Update any post on platform' },
  { name: 'posts.delete_own', module: 'POST', description: 'Delete own authored posts' },
  { name: 'posts.delete_any', module: 'POST', description: 'Delete any post on platform' },
  { name: 'posts.submit', module: 'POST', description: 'Submit draft post for approval' },
  { name: 'posts.approve', module: 'POST', description: 'Approve submitted post revisions' },
  { name: 'posts.reject', module: 'POST', description: 'Reject submitted post revisions' },
  { name: 'posts.publish', module: 'POST', description: 'Publish approved posts' },
  { name: 'posts.archive', module: 'POST', description: 'Archive existing posts' },

  // SYSTEM
  { name: 'settings.read', module: 'SYSTEM', description: 'Read platform system settings' },
  { name: 'settings.update', module: 'SYSTEM', description: 'Update platform system settings' },
  { name: 'audit_logs.read', module: 'SYSTEM', description: 'Read platform audit logs' },
];

export const ROLE_PERMISSIONS_MAP: Record<SystemRole, string[]> = {
  [SystemRole.SUPER_ADMIN]: SYSTEM_PERMISSIONS.map((p) => p.name),
  [SystemRole.CATEGORY_AUTHOR]: [
    'categories.read',
    'authors.read',
    'authors.update',
    'posts.create',
    'posts.read',
    'posts.update_own',
    'posts.delete_own',
    'posts.submit',
  ],
  [SystemRole.REGISTERED_USER]: [
    'posts.read',
    'categories.read',
    'authors.read',
  ],
};
