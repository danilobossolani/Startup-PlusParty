import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EquipeService } from '../services/equipe.service';

/** Endereço raiz: quem está logado vai para a sua tela inicial; visitante, para o Início público. */
export const inicioGuard: CanActivateFn = async () => {
  const equipeService = inject(EquipeService);
  const router = inject(Router);

  const telaInicial = await equipeService.telaInicial().catch(() => null);
  return router.parseUrl(telaInicial ?? '/cliente/home');
};
