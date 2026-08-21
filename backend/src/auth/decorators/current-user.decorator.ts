import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestConUsuario } from '../request-with-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<RequestConUsuario>().user,
);
