import { SetMetadata } from '@nestjs/common';
import { REQUIRED_MODULE_KEY } from '../auth.constants';

export const RequireModule = (moduleCode: string) =>
  SetMetadata(REQUIRED_MODULE_KEY, moduleCode);
