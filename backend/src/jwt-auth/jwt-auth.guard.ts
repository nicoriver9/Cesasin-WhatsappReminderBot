// jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Añade tu lógica de guardia personalizada aquí, si es necesario

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Lanzar un error si hay un problema
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    //console.log(user)
    return user; // Aquí retornamos el usuario, que se añadirá al contexto de la solicitud
  }
}