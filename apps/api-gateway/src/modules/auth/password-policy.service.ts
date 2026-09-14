import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PasswordPolicyService {
  private readonly minLength = 8;
  private readonly maxLength = 72;

  validate(password: string): void {
    if (!password) {
      throw new BadRequestException('Password is required');
    }
    if (password.length < this.minLength) {
      throw new BadRequestException(`Password must be at least ${this.minLength} characters long`);
    }
    if (password.length > this.maxLength) {
      throw new BadRequestException(`Password must be at most ${this.maxLength} characters long`);
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }
  }
}
