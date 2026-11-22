/** Composition root for admin services: the only place that picks an implementation. */
import type { AdminUserService } from './adminUser.service';
import { httpAdminUserService } from './httpAdminUser.service';

export const adminUserService: AdminUserService = httpAdminUserService;
