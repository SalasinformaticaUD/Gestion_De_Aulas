import { SetMetadata } from '@nestjs/common';
import { REQUIRE_ADMINISTRATOR_KEY } from '../auth.constants';

/** Restringe una ruta a usuarios que tengan el rol institucional ADMINISTRADOR. */
export const RequireAdministrator = () =>
  SetMetadata(REQUIRE_ADMINISTRATOR_KEY, true);
