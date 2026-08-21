import { SetMetadata } from '@nestjs/common';
import { REQUIRE_AUTH_KEY } from '../auth.constants';

export const RequireAuth = () => SetMetadata(REQUIRE_AUTH_KEY, true);
