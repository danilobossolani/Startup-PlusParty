import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BarNoMapa, Mapa } from '../../components/mapa/mapa';
import { GoogleMapsService } from '../../services/google-maps.service';
import { NavCliente } from '../../components/nav-cliente/nav-cliente';
import { NotaBar } from '../../components/nota-bar/nota-bar';
import { formatarHora, statusHorario } from '../../horario-funcionamento';
import { Estabelecimento } from '../../models';
import { EstabelecimentosService } from '../../services/estabelecimentos.service';
import { HomeService } from '../../services/home.service';
import { Carregando } from '../../components/carregando/carregando';
import { ErroCarregar } from '../../components/erro-carregar/erro-carregar';

type Filtro = 'aberto' | 'evento' | 'quente';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'aberto', rotulo: 'Aberto agora' },
  { valor: 'evento', rotulo: 'Evento hoje' },
  { valor: 'quente', rotulo: 'Quente agora' },
];

/** Um bar como o cartão do Descobrir mostra. */
interface BarDescoberto extends Estabelecimento {
  aberto: boolean;
  /** "Aberto até 2h", "Fechado · abre hoje às 18h"... null sem horário cadastrado. */
  horario: string | null;
  eventoHoje: boolean;
  quente: boolean;
}

/**
 * Descobrir: os bares do +party, com busca pelo nome e filtros rápidos.
 * Ordem: abertos primeiro, depois os com evento hoje, depois a nota.
 */
@Component({
  selector: 'app-discovery',
  standalone: true,
  imports: [Carregando, ErroCarregar, FormsModule, Mapa, NavCliente, NotaBar],
  templateUrl: './discovery.html',
  styleUrls: ['./discovery.scss', './discovery.filtros.scss'],
})
export class DiscoveryPage implements OnInit {
  private readonly router = inject(Router);
  private readonly estabelecimentosService = inject(EstabelecimentosService);
  private readonly homeService = inject(HomeService);

  protected readonly filtros = FILTROS;
  protected readonly carregando = signal(true);
  protected readonly erroCarregar = signal(false);
  protected readonly bares = signal<BarDescoberto[]>([]);
  protected readonly ativos = signal<ReadonlySet<Filtro>>(new Set());
  protected readonly busca = signal('');
  protected readonly modo = signal<'lista' | 'mapa'>('lista');
  /** Sem a chave do Google o mapa não abre: a troca Lista/Mapa nem aparece. */
  protected readonly temMapa = inject(GoogleMapsService).temChave;

  /** Os bares filtrados que marcaram o ponto no mapa (Configurações do gerente). */
  protected readonly noMapa = computed<BarNoMapa[]>(() =>
    this.visiveis()
      .filter((bar) => bar.latitude !== null && bar.longitude !== null)
      .map((bar) => ({
        id: bar.id,
        nome: bar.nome,
        latitude: bar.latitude!,
        longitude: bar.longitude!,
        foto_url: bar.foto_url,
        detalhe: bar.horario ?? undefined,
      })),
  );

  protected readonly visiveis = computed(() => {
    const termo = this.busca().trim().toLocaleLowerCase();
    const ativos = this.ativos();

    return this.bares().filter(
      (bar) =>
        (!termo || bar.nome.toLocaleLowerCase().includes(termo)) &&
        (!ativos.has('aberto') || bar.aberto) &&
        (!ativos.has('evento') || bar.eventoHoje) &&
        (!ativos.has('quente') || bar.quente),
    );
  });

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  protected async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarregar.set(false);

    try {
      // Evento hoje e lotação são detalhes: se falharem, a lista abre sem os selos.
      const [lista, eventos, lotacao] = await Promise.all([
        this.estabelecimentosService.listar(),
        this.estabelecimentosService.baresComEventoHoje().catch(() => new Set<string>()),
        this.homeService.contarComandasAbertasPorBar().catch(() => new Map<string, number>()),
      ]);
      this.bares.set(ordenar(lista.map((bar) => this.descobrir(bar, eventos, lotacao))));
    } catch {
      this.erroCarregar.set(true);
    } finally {
      this.carregando.set(false);
    }
  }

  protected alternar(filtro: Filtro): void {
    this.ativos.update((ativos) => {
      const novos = new Set(ativos);
      if (!novos.delete(filtro)) novos.add(filtro);
      return novos;
    });
  }

  protected abrirPerfil(estabelecimento: Estabelecimento): void {
    void this.router.navigate(['/cliente/estabelecimento', estabelecimento.id]);
  }

  protected iniciais(nome: string): string {
    const palavras = nome.trim().split(/\s+/).filter(Boolean);

    if (palavras.length === 1) {
      return palavras[0].charAt(0).toUpperCase();
    }

    return `${palavras[0].charAt(0)}${palavras[palavras.length - 1].charAt(0)}`.toUpperCase();
  }

  private descobrir(bar: Estabelecimento, eventos: Set<string>, lotacao: Map<string, number>): BarDescoberto {
    const status = statusHorario(bar);
    const aberto = status?.aberto ?? false;
    const lotado =
      this.homeService.calcularLotacao(lotacao.get(bar.id) ?? 0, bar.capacidade) === 'quente';

    return {
      ...bar,
      aberto,
      horario:
        aberto && bar.horario_fecha
          ? `Aberto até ${formatarHora(bar.horario_fecha)}`
          : (status?.texto ?? null),
      eventoHoje: eventos.has(bar.id),
      quente: aberto && lotado,
    };
  }
}

/** Abertos primeiro, depois quem tem evento hoje, depois a maior nota; empate pelo nome. */
export function ordenar<T extends Pick<BarDescoberto, 'aberto' | 'eventoHoje' | 'nota_media' | 'nome'>>(
  bares: T[],
): T[] {
  return [...bares].sort(
    (a, b) =>
      Number(b.aberto) - Number(a.aberto) ||
      Number(b.eventoHoje) - Number(a.eventoHoje) ||
      (b.nota_media ?? 0) - (a.nota_media ?? 0) ||
      a.nome.localeCompare(b.nome),
  );
}
