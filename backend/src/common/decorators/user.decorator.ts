import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    // Super admin can scope operational requests to a selected tenant by sending
    // the x-impersonate-tenant header ("sirkete gir"); everyone else uses their own.
    const impersonated = request.headers?.['x-impersonate-tenant'];
    if (impersonated && user?.role === 'super_admin') {
      return Array.isArray(impersonated) ? impersonated[0] : impersonated;
    }
    return user?.tenantId;
  },
);
