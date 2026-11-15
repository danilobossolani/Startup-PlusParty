import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NavCliente } from '../../components/nav-cliente/nav-cliente';
import { NotaBar } from '../../components/nota-bar/nota-bar';
import { Comanda, Estabelecimento } from '../../models';
import { statusHorario } from '../../horario-funcionamento';
import { AuthService } from '../../services/auth.service';
import { HomeService } from '../../services/home.service';
import { Carregando } from '../../components/carregando/carregando';
import { ErroCarregar } from '../../components/erro-carregar/erro-carregar';

interface EstabelecimentoComLotacao extends Estabelecimento {
  lotacao: 'normal' | 'quente';
  aberto: boolean;
  /** "Fechado · abre hoje às 18h"... null sem horário cadastrado. */
  horario: string | null;
}

@Component({
  selector: 'app-home',
  imports: [Carregando, ErroCarregar, RouterLink, NavCliente, NotaBar],
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './home.conta.scss'],
  host: { '(document:keydown.escape)': 'menuConta.set(false)' },
})
export class HomePage implements OnInit {
  private authService = inject(AuthService);
  private homeService = inject(HomeService);
  private router = inject(Router);

  protected readonly carregando = signal(true);
  protected readonly erroCarregar = signal(false);
  protected readonly logado = signal(false);
  protected readonly nome = signal('');
  protected readonly comandaAtiva = signal<Comanda | null>(null);
  /** Menu da foto do topo (só no celular; no desktop a conta fica no menu lateral). */
  protected readonly menuConta = signal(false);
  protected readonly estabelecimentos = signal<EstabelecimentoComLotacao[]>([]);

  protected readonly favoritos = computed(() => this.estabelecimentos().slice(0, 2));
  protected readonly abertos = computed(() => this.estabelecimentos().filter((e) => e.aberto));
  protected readonly fechados = computed(() => this.estabelecimentos().filter((e) => !e.aberto));

  protected readonly rotuloComanda = computed(() => {
    switch (this.comandaAtiva()?.status) {
      case 'aguardando_liberacao':
        return 'Aguardando liberação...';
      case 'aberta':
      case 'aguardando_pagamento':
        return 'Visualizar comanda';
      default:
        return 'Abrir comanda';
    }
  });

  protected readonly iconeComanda = computed(() => {
    switch (this.comandaAtiva()?.status) {
      case 'aguardando_liberacao':
        return '⏳';
      case 'aberta':
      case 'aguardando_pagamento':
        return '👁';
      default:
        return '+';
    }
  });

  protected readonly linkComanda = computed<string[]>(() => {
    const comanda = this.comandaAtiva();
    return comanda ? ['/cliente/comanda', comanda.id] : ['/cliente/discovery'];
  });

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  protected async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarregar.set(false);

    try {
      const user = await this.authService.usuarioAtual();

      const [nome, comandaAtiva, estabelecimentos, comandasAbertas] = await Promise.all([
        user ? this.authService.buscarNomeAtual() : Promise.resolve('Visitante'),
        user ? this.homeService.buscarComandaAtiva(user.id) : Promise.resolve(null),
        this.homeService.listarEstabelecimentos(),
        // O selo "Quente" é um detalhe: se a contagem falhar, a Home abre com
        // todos os bares em "Normal" em vez de não abrir.
        this.homeService.contarComandasAbertasPorBar().catch(() => new Map<string, number>()),
      ]);

      this.logado.set(user !== null);
      this.nome.set(nome);
      this.comandaAtiva.set(comandaAtiva);
      this.estabelecimentos.set(
        estabelecimentos.map((estabelecimento) => ({
          ...estabelecimento,
          aberto: statusHorario(estabelecimento)?.aberto ?? false,
          horario: statusHorario(estabelecimento)?.texto ?? null,
          lotacao: this.homeService.calcularLotacao(
            comandasAbertas.get(estabelecimento.id) ?? 0,
            estabelecimento.capacidade,
          ),
        })),
      );
    } catch {
      this.erroCarregar.set(true);
    } finally {
      this.carregando.set(false);
    }
  }

  protected async sair(): Promise<void> {
    this.menuConta.set(false);
    await this.authService.sair();
    await this.router.navigateByUrl('/login');
  }

  protected inicial(nome: string): string {
    return nome.charAt(0).toUpperCase();
  }
}
