import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EquipeService } from '../../services/equipe.service';
import { LoginPage } from './login';

describe('LoginPage — recuperar senha', () => {
  let fixture: ComponentFixture<LoginPage>;
  let authService: {
    pedirRedefinicaoSenha: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

  function tela(): HTMLElement {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function botao(texto: string): HTMLButtonElement {
    return Array.from(tela().querySelectorAll('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;
  }

  function preencherEmail(email: string): void {
    const campo = tela().querySelector<HTMLInputElement>('input[type=email]')!;
    campo.value = email;
    campo.dispatchEvent(new Event('input'));
  }

  async function enviar(): Promise<void> {
    tela().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    authService = {
      pedirRedefinicaoSenha: vi.fn().mockResolvedValue(undefined),
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: EquipeService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    botao('Esqueceu a senha').click();
  });

  it('mostra e oculta a senha pelo botão do olho', () => {
    botao('Entrar').click();
    const campo = () => tela().querySelector<HTMLInputElement>('input[formControlName=senha]')!;
    expect(campo().type).toBe('password');
    tela().querySelector<HTMLButtonElement>('.ver-senha')!.click();
    expect(campo().type).toBe('text');
    expect(tela().querySelector('.ver-senha')!.getAttribute('aria-label')).toBe('Ocultar senha');
    tela().querySelector<HTMLButtonElement>('.ver-senha')!.click();
    expect(campo().type).toBe('password');
  });

  it('no modo recuperar, pede só o e-mail', () => {
    expect(tela().querySelector('input[type=password]')).toBeNull();
    expect(tela().querySelector('input[type=email]')).not.toBeNull();
    expect(tela().textContent).toContain('Enviar link');
  });

  it('pede o link ao Supabase e mostra a mesma mensagem para qualquer e-mail', async () => {
    preencherEmail('alguem@party.app');

    await enviar();

    expect(authService.pedirRedefinicaoSenha).toHaveBeenCalledWith('alguem@party.app');
    expect(authService.login).not.toHaveBeenCalled();
    expect(tela().textContent).toContain('Se esse e-mail estiver cadastrado');
  });

  it('não envia com e-mail inválido', async () => {
    preencherEmail('nao-e-email');

    await enviar();

    expect(authService.pedirRedefinicaoSenha).not.toHaveBeenCalled();
    expect(tela().textContent).toContain('Informe um e-mail válido');
  });

  it('avisa quando o limite de envios foi atingido', async () => {
    authService.pedirRedefinicaoSenha.mockRejectedValueOnce(new Error('email rate limit exceeded'));
    preencherEmail('alguem@party.app');

    await enviar();

    expect(tela().textContent).toContain('Muitas tentativas');
  });

  it('voltar para o login traz o campo de senha de volta', () => {
    botao('Entrar').click();

    expect(tela().querySelector('input[type=password]')).not.toBeNull();
    expect(tela().querySelector('button[type=submit]')?.textContent).toContain('Entrar');
  });
});

describe('LoginPage — confirmação do e-mail com código', () => {
  let fixture: ComponentFixture<LoginPage>;
  let router: Router;
  let authService: {
    login: ReturnType<typeof vi.fn>;
    cadastrar: ReturnType<typeof vi.fn>;
    confirmarEmail: ReturnType<typeof vi.fn>;
    reenviarCodigo: ReturnType<typeof vi.fn>;
    buscarTipoAtual: ReturnType<typeof vi.fn>;
    telaInicial: ReturnType<typeof vi.fn>;
  };

  function tela(): HTMLElement {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function botao(texto: string): HTMLButtonElement {
    return Array.from(tela().querySelectorAll('button')).find((b) => b.textContent?.includes(texto))!;
  }

  function preencher(seletor: string, valor: string): void {
    const campo = tela().querySelector<HTMLInputElement>(seletor)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  async function assentar(): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
  }

  async function enviar(): Promise<void> {
    tela().querySelector('form')!.dispatchEvent(new Event('submit'));
    await assentar();
  }

  beforeEach(async () => {
    authService = {
      login: vi.fn().mockResolvedValue(undefined),
      cadastrar: vi.fn().mockResolvedValue({ precisaConfirmar: true }),
      confirmarEmail: vi.fn().mockResolvedValue(undefined),
      reenviarCodigo: vi.fn().mockResolvedValue(undefined),
      buscarTipoAtual: vi.fn().mockResolvedValue('cliente'),
      telaInicial: vi.fn().mockReturnValue('/cliente/home'),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: EquipeService, useValue: { telaInicial: () => Promise.resolve(null) } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  it('depois do cadastro pede o código, em vez de entrar direto', async () => {
    botao('Cadastre-se').click();
    preencher('input[type=text]', 'Gil');
    preencher('input[type=email]', 'gil@party.app');
    preencher('input[type=password]', 'senha123');

    await enviar();

    expect(authService.cadastrar).toHaveBeenCalledWith('Gil', 'gil@party.app', 'senha123');
    expect(tela().textContent).toContain('Confirme seu e-mail');
    expect(tela().querySelector('input[type=password]')).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('com o código certo, entra na conta', async () => {
    botao('Cadastre-se').click();
    preencher('input[type=text]', 'Gil');
    preencher('input[type=email]', 'gil@party.app');
    preencher('input[type=password]', 'senha123');
    await enviar();

    preencher('input[autocomplete=one-time-code]', '654321');
    await assentar();

    expect(authService.confirmarEmail).toHaveBeenCalledWith('gil@party.app', '654321');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cliente/home', { replaceUrl: true });
  });

  it('com a confirmação desligada no Supabase, o cadastro entra direto como antes', async () => {
    authService.cadastrar.mockResolvedValue({ precisaConfirmar: false });
    botao('Cadastre-se').click();
    preencher('input[type=text]', 'Gil');
    preencher('input[type=email]', 'gil@party.app');
    preencher('input[type=password]', 'senha123');

    await enviar();

    expect(tela().textContent).not.toContain('Confirme seu e-mail');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cliente/home', { replaceUrl: true });
  });

  it('quem tenta entrar sem ter confirmado recebe um código novo e vai para a tela dele', async () => {
    authService.login.mockRejectedValue(
      Object.assign(new Error('Email not confirmed'), { code: 'email_not_confirmed' }),
    );
    preencher('input[type=email]', 'gil@party.app');
    preencher('input[type=password]', 'senha123');

    await enviar();

    expect(authService.reenviarCodigo).toHaveBeenCalledWith('gil@party.app');
    expect(tela().textContent).toContain('Confirme seu e-mail');
  });

  it('"Voltar ao login" volta para o formulário', async () => {
    authService.login.mockRejectedValue(new Error('Email not confirmed'));
    preencher('input[type=email]', 'gil@party.app');
    preencher('input[type=password]', 'senha123');
    await enviar();

    botao('Voltar ao login').click();

    expect(tela().querySelector('input[type=password]')).not.toBeNull();
    expect(tela().textContent).not.toContain('Confirme seu e-mail');
  });
});
