import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { EquipeService } from '../services/equipe.service';
import { inicioGuard } from './inicio.guard';

describe('inicioGuard', () => {
  let telaInicial: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    telaInicial = vi.fn();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: EquipeService, useValue: { telaInicial } }],
    });
  });

  async function rodarGuard(): Promise<string> {
    const resultado = await TestBed.runInInjectionContext(() =>
      inicioGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }

  it('manda o visitante para o Início público', async () => {
    telaInicial.mockResolvedValue(null);

    expect(await rodarGuard()).toBe('/cliente/home');
  });

  it('manda quem já está logado para a tela inicial dele', async () => {
    telaInicial.mockResolvedValue('/gerente/movimento');

    expect(await rodarGuard()).toBe('/gerente/movimento');
  });

  it('sem conseguir descobrir a tela inicial, abre o Início público', async () => {
    telaInicial.mockRejectedValue(new Error('sem rede'));

    expect(await rodarGuard()).toBe('/cliente/home');
  });
});
