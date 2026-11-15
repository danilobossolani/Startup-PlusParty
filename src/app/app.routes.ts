import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { semSessaoGuard } from './guards/sem-sessao.guard';
import { staffGuard } from './guards/staff.guard';
import { gerenteGuard } from './guards/gerente.guard';
import { inicioGuard } from './guards/inicio.guard';

// Navegar pelos bares (discovery, perfil, cardápio em modo visualizar, home)
// não exige login, para demonstrar sem conta. Abrir e usar uma comanda exige.
export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar | +party',
    loadComponent: () => import('./Pages/login/login').then((m) => m.LoginPage),
    canActivate: [semSessaoGuard],
  },
  {
    path: 'redefinir-senha',
    title: 'Redefinir senha | +party',
    loadComponent: () =>
      import('./Pages/redefinir-senha/redefinir-senha').then((m) => m.RedefinirSenhaPage),
  },
  // Política de Privacidade e Termos de Uso: abertos para todos, com ou sem login.
  {
    path: 'privacidade',
    title: 'Política de Privacidade | +party',
    loadComponent: () => import('./Pages/legal/legal').then((m) => m.LegalPage),
    data: { documento: 'privacidade' },
  },
  {
    path: 'termos',
    title: 'Termos de Uso | +party',
    loadComponent: () => import('./Pages/legal/legal').then((m) => m.LegalPage),
    data: { documento: 'termos' },
  },
  {
    path: 'cliente/discovery',
    title: 'Descobrir | +party',
    loadComponent: () => import('./Pages/discovery/discovery').then((m) => m.DiscoveryPage),
  },
  {
    path: 'cliente/estabelecimento/:id',
    title: 'Perfil do bar | +party',
    loadComponent: () =>
      import('./Pages/estabelecimento/estabelecimento').then((m) => m.EstabelecimentoPage),
  },
  {
    path: 'cliente/estabelecimento/:id/cardapio',
    title: 'Cardápio | +party',
    loadComponent: () => import('./Pages/cardapio/cardapio').then((m) => m.CardapioPage),
    data: { modo: 'visualizar' },
  },
  {
    path: 'cliente/home',
    title: 'Início | +party',
    loadComponent: () => import('./Pages/home/home').then((m) => m.HomePage),
  },
  // Promoções e eventos dos bares: aberto sem login, como o Discovery.
  {
    path: 'cliente/novidades',
    title: 'Novidades | +party',
    loadComponent: () => import('./Pages/feed/feed').then((m) => m.FeedPage),
  },
  // Endereço antigo da aba: links e notificações já enviadas continuam funcionando.
  { path: 'cliente/feed', redirectTo: 'cliente/novidades' },
  {
    path: 'cliente/notificacoes',
    title: 'Notificações | +party',
    loadComponent: () =>
      import('./Pages/notificacoes/notificacoes').then((m) => m.NotificacoesPage),
    canActivate: [authGuard],
  },
  {
    path: 'cliente/conta',
    title: 'Minha conta | +party',
    loadComponent: () => import('./Pages/conta/conta').then((m) => m.ContaPage),
    canActivate: [authGuard],
  },
  {
    path: 'cliente/abrir-comanda/:id',
    title: 'Abrir comanda | +party',
    loadComponent: () =>
      import('./Pages/abrir-comanda/local/local').then((m) => m.AbrirComandaLocalComponent),
    canActivate: [authGuard],
  },
  {
    path: 'cliente/comanda/:id',
    title: 'Minha comanda | +party',
    loadComponent: () => import('./Pages/comanda/comanda').then((m) => m.ComandaPage),
    canActivate: [authGuard],
  },
  {
    path: 'cliente/cardapio/:id',
    title: 'Fazer pedido | +party',
    loadComponent: () => import('./Pages/cardapio/cardapio').then((m) => m.CardapioPage),
    data: { modo: 'pedir' },
    canActivate: [authGuard],
  },
  // Link de convite do gerente: a única porta de entrada para a equipe de um
  // bar. Quem aceita espera a aprovação do gerente na tela seguinte.
  {
    path: 'convite/:codigo',
    title: 'Convite para a equipe | +party',
    loadComponent: () => import('./Pages/convite/convite').then((m) => m.ConvitePage),
  },
  {
    path: 'atendente/aguardando',
    title: 'Aguardando aprovação | +party',
    loadComponent: () =>
      import('./Pages/atendente-aguardando/atendente-aguardando').then(
        (m) => m.AtendenteAguardandoPage,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'atendente/pedidos',
    title: 'Pedidos | +party',
    loadComponent: () =>
      import('./Pages/atendente-pedidos/atendente-pedidos').then((m) => m.AtendentePedidos),
    canActivate: [staffGuard],
  },
  {
    path: 'atendente/comandas',
    title: 'Comandas | +party',
    loadComponent: () =>
      import('./Pages/atendente-comandas/atendente-comandas').then((m) => m.AtendenteComandas),
    canActivate: [staffGuard],
  },
  {
    path: 'gerente',
    canActivate: [gerenteGuard],
    loadComponent: () => import('./Pages/gerente/gerente-layout/gerente-layout').then(m => m.GerenteLayout),
    children: [
      { path: '', redirectTo: 'movimento', pathMatch: 'full' },
      { path: 'movimento', title: 'Movimento | +party', loadComponent: () => import('./Pages/gerente/movimento/movimento').then(m => m.Movimento) },
      { path: 'movimento/resumo', title: 'Resumo da noite | +party', loadComponent: () => import('./Pages/gerente/resumo/resumo').then(m => m.Resumo) },
      { path: 'resultados', title: 'Resultados | +party', loadComponent: () => import('./Pages/gerente/resultados/resultados').then(m => m.Resultados) },
      { path: 'postagens', title: 'Postagens | +party', loadComponent: () => import('./Pages/gerente/postagens/postagens').then(m => m.Postagens) },
      { path: 'cardapio', title: 'Cardápio do bar | +party', loadComponent: () => import('./Pages/gerente/cardapio/cardapio-gerente').then(m => m.CardapioGerente) },
      { path: 'agenda', title: 'Agenda | +party', loadComponent: () => import('./Pages/gerente/agenda/agenda').then(m => m.AgendaGerente) },
      { path: 'avaliacoes', title: 'Avaliações | +party', loadComponent: () => import('./Pages/gerente/avaliacoes/avaliacoes').then(m => m.AvaliacoesGerente) },
      { path: 'divulgar', title: 'Divulgar meu bar | +party', loadComponent: () => import('./Pages/gerente/divulgar/divulgar').then(m => m.Divulgar) },
      // O convite vem antes da Equipe: senão "convite" seria lido como o id de um atendente.
      { path: 'equipe/convite', title: 'Convidar para a equipe | +party', loadComponent: () => import('./Pages/gerente/equipe-convite/equipe-convite').then(m => m.EquipeConvite) },
      // O perfil do atendente abre dentro da Equipe: ao lado da lista no
      // desktop, no lugar dela no celular.
      {
        path: 'equipe',
        title: 'Equipe | +party',
        loadComponent: () => import('./Pages/gerente/equipe/equipe').then(m => m.Equipe),
        children: [
          { path: ':id', title: 'Perfil do atendente | +party', loadComponent: () => import('./Pages/gerente/equipe-perfil/equipe-perfil').then(m => m.EquipePerfil) },
        ],
      },
      // Aberta pela engrenagem do topo (celular) e pelo menu lateral (desktop).
      // O endereço antigo continua valendo.
      { path: 'configuracoes', title: 'Configurações | +party', loadComponent: () => import('./Pages/gerente/perfil-bar/perfil-bar').then(m => m.PerfilBarComponent) },
      { path: 'perfil-bar', redirectTo: 'configuracoes', pathMatch: 'full' }
    ]
  },
  {
    path: 'cliente',
    redirectTo: 'cliente/discovery',
    pathMatch: 'full',
  },
  // A raiz e endereços desconhecidos: quem já está logado vai para a própria
  // tela inicial; visitante, para o Início público (inicioGuard).
  {
    path: '',
    pathMatch: 'full',
    canActivate: [inicioGuard],
    children: [],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
