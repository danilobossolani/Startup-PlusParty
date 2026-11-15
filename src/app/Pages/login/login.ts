import { REGRA_SENHA, VALIDADORES_SENHA_NOVA } from '../../senha';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmarCodigo } from '../../components/confirmar-codigo/confirmar-codigo';
import { Logo } from '../../components/logo/logo';
import { emailNaoConfirmado, traduzirErroAuth } from '../../erros-auth';
import { AuthService } from '../../services/auth.service';
import { EquipeService, ROTA_CONVITE } from '../../services/equipe.service';

type Modo = 'login' | 'cadastro' | 'recuperar';

@Component({
  selector: 'app-login',
  imports: [ConfirmarCodigo, Logo, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private equipeService = inject(EquipeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected readonly modo = signal<Modo>('login');
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(
    // Volta da tela Minha conta depois de excluir a conta.
    this.route.snapshot.queryParamMap.get('conta') === 'excluida' ? 'Sua conta foi excluída.' : null,
  );
  /**
   * E-mail esperando o código de confirmação: o formulário dá lugar à tela
   * do código. Acontece logo depois do cadastro e quando alguém tenta entrar
   * numa conta que ainda não confirmou.
   */
  protected readonly emailParaConfirmar = signal<string | null>(null);
  protected readonly senhaVisivel = signal(false);
  protected readonly regraSenha = REGRA_SENHA;

  protected readonly form = this.fb.nonNullable.group({
    nome: [''],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  constructor() {
    // "Criar conta" vindo de fora do app (a landing page) abre direto no
    // cadastro. Passa pelo mudarModo para o nome e a regra de senha valerem.
    // Qualquer outro valor é ignorado e a tela abre no login, como sempre.
    if (this.route.snapshot.queryParamMap.get('modo') === 'cadastro') {
      this.mudarModo('cadastro');
    }
    // /login?modo=cadastro abre direto no cadastro (botões da landing page).
    if (this.route.snapshot.queryParamMap.get('modo') === 'cadastro') this.mudarModo('cadastro');
  }

  /** Cada modo exige campos diferentes: nome só no cadastro, senha só fora do "recuperar". */
  protected mudarModo(modo: Modo): void {
    this.erro.set(null);
    this.aviso.set(null);
    this.modo.set(modo);

    const { nome, senha } = this.form.controls;
    nome.setValidators(modo === 'cadastro' ? [Validators.required] : []);
    senha.setValidators(
      modo === 'recuperar'
        ? []
        : modo === 'cadastro'
          ? VALIDADORES_SENHA_NOVA
          : [Validators.required],
    );
    nome.updateValueAndValidity();
    senha.updateValueAndValidity();
  }

  protected async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.erro.set(null);
    this.aviso.set(null);
    this.carregando.set(true);
    const { nome, email, senha } = this.form.getRawValue();

    try {
      if (this.modo() === 'recuperar') {
        await this.authService.pedirRedefinicaoSenha(email);
        // Mesma mensagem exista ou não a conta, para não revelar quem é cadastrado.
        this.aviso.set('Se esse e-mail estiver cadastrado, enviamos um link para criar uma nova senha.');
        return;
      }

      if (this.modo() === 'login') {
        await this.authService.login(email, senha);
      } else {
        const { precisaConfirmar } = await this.authService.cadastrar(nome, email, senha);
        if (precisaConfirmar) {
          this.emailParaConfirmar.set(email);
          return;
        }
      }

      await this.entrar();
    } catch (erro) {
      if (emailNaoConfirmado(erro)) {
        await this.pedirCodigoDeNovo(email);
        return;
      }
      this.erro.set(traduzirErroAuth(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  /** O código conferiu: a conta está confirmada e a sessão, aberta. */
  protected async aoConfirmar(): Promise<void> {
    await this.entrar();
  }

  /** "Usar outro e-mail": volta ao formulário de onde a pessoa veio. */
  protected voltarDoCodigo(): void {
    this.emailParaConfirmar.set(null);
    this.form.controls.senha.reset('');
  }

  private async entrar(): Promise<void> {
    // replaceUrl tira o login do histórico: o "voltar" não cai de novo aqui.
    await this.router.navigateByUrl(await this.destino(), { replaceUrl: true });
  }

  /**
   * Tentou entrar numa conta que não confirmou o e-mail (fechou o app antes
   * de digitar o código, por exemplo): manda um código novo e abre a tela
   * dele. Se o envio for recusado por ser cedo demais, o código anterior
   * ainda vale e a própria tela mostra quando dá para pedir outro.
   */
  private async pedirCodigoDeNovo(email: string): Promise<void> {
    try {
      await this.authService.reenviarCodigo(email);
    } catch {
      // Segue para a tela do código mesmo assim.
    }
    this.emailParaConfirmar.set(email);
  }

  /**
   * Volta para a página que pediu login, se for uma página que o cliente pode
   * abrir. Senão, vai para a tela inicial de quem entrou.
   */
  private async destino(): Promise<string> {
    const voltar = this.route.snapshot.queryParamMap.get('voltar');
    const tipo = await this.authService.buscarTipoAtual();

    // Telas do cliente e o link de convite (quem entrou para aceitar um convite volta para ele).
    const abertaAoCliente = voltar?.startsWith('/cliente/') || voltar?.startsWith(ROTA_CONVITE);
    if (tipo === 'cliente' && voltar && abertaAoCliente) return voltar;

    return (await this.equipeService.telaInicial()) ?? this.authService.telaInicial(tipo);
  }
}
