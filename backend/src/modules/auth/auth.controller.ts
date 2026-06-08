import { Controller, Post, Body } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(@Body() data: any) {
    // New tenants are created INACTIVE for review by Super Admin
    return this.authService.registerTenant({
      ...data,
      isActive: false, 
      subscriptionPlan: 'review_pending'
    });
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }
}
