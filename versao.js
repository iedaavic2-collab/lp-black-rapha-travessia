/* versao.js: só tela. Não envia nada; o envio do formulário continua inteiro no app.js.
 *
 * 1. Contagem regressiva: qualquer elemento com data-contagem="2026-11-21T15:00:00-03:00".
 *    data-modo="dias" mostra só os dias (para quando o horário ainda não foi confirmado).
 *    Quando a hora chega, a contagem dá lugar ao texto de .contagem-fim.
 *    O número que muda ganha a classe .tique (desce no lugar, pelo CSS).
 * 2. Cartas que viram (.carta): toque ou Enter vira a carta; no computador vira no hover pelo CSS.
 * 3. Formulários sincronizados (16/11/2026, pedido do Rapha): o que a pessoa digita num formulário
 *    (nome, e-mail, WhatsApp) aparece nos outros da página, inclusive no pop-up de saída. Não dispara
 *    eventos nos outros campos: só copia o valor. O campo-isca (website) nunca é copiado.
 */
(() => {
  const dois = n => String(n).padStart(2, '0');
  const muda = (el, v) => {
    if (!el || el.textContent === String(v)) return;
    el.textContent = v;
    el.classList.remove('tique'); void el.offsetWidth; el.classList.add('tique');
  };

  document.querySelectorAll('[data-contagem]').forEach(caixa => {
    const alvo = Date.parse(caixa.dataset.contagem);
    if (Number.isNaN(alvo)) return;
    const soDias = caixa.dataset.modo === 'dias';
    const campo = nome => caixa.querySelector('[data-' + nome + ']');
    const fim = caixa.querySelector('.contagem-fim');
    let relogio = null;

    function tique() {
      const falta = alvo - Date.now();
      if (falta <= 0) {
        caixa.classList.add('acabou');
        if (fim) fim.hidden = false;
        caixa.querySelectorAll('.contagem-numeros').forEach(n => { n.hidden = true; });
        if (relogio) window.clearInterval(relogio);
        return;
      }
      const dias = Math.floor(falta / 864e5);
      if (soDias) {
        // conta dias de calendário até a data: no próprio dia aparece "É hoje" pelo .contagem-fim
        const d = Math.ceil(falta / 864e5);
        muda(campo('dias'), d);
        const rotulo = campo('rotulo-dias');
        if (rotulo) rotulo.textContent = d === 1 ? 'dia' : 'dias';
        return;
      }
      const h = Math.floor(falta % 864e5 / 36e5);
      const m = Math.floor(falta % 36e5 / 6e4);
      const s = Math.floor(falta % 6e4 / 1e3);
      const pares = { dias: dois(dias), horas: dois(h), minutos: dois(m), segundos: dois(s) };
      Object.entries(pares).forEach(([k, v]) => muda(campo(k), v));
    }
    tique();
    relogio = window.setInterval(tique, soDias ? 60000 : 1000);
  });

  document.querySelectorAll('.carta').forEach(carta => {
    const virar = () => {
      const virada = carta.classList.toggle('virada');
      carta.setAttribute('aria-pressed', virada ? 'true' : 'false');
    };
    carta.addEventListener('click', virar);
    carta.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); virar(); }
    });
  });

  // 4. Primeira dobra no celular: o CSS já deixa a foto com o que sobra da tela depois do botão.
  //    Se num aparelho o texto ficar mais alto que o previsto (fonte grande, tela estreita), a foto
  //    encolhe o que faltar, pra o botão continuar na primeira tela. Só no carregamento, no topo.
  const ajustarDobra = () => {
    const capa = document.querySelector('.hero .hero-capa');
    const botao = document.querySelector('.hero .lead-form button[type="submit"]');
    if (!capa || !botao || !window.matchMedia('(max-width: 900px)').matches || window.scrollY > 10) return;
    const passou = botao.getBoundingClientRect().bottom - (window.innerHeight - 8);
    if (passou > 0) capa.style.height = Math.max(64, capa.offsetHeight - passou) + 'px';
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(ajustarDobra, 50)); else window.addEventListener('load', ajustarDobra);

  const forms = Array.from(document.querySelectorAll('form.lead-form'));
  const CAMPOS = ['name', 'email', 'phone'];
  if (forms.length > 1) {
    const copiar = origem => {
      if (!origem.form || !forms.includes(origem.form) || !CAMPOS.includes(origem.name)) return;
      forms.forEach(f => {
        if (f === origem.form) return;
        const outro = f.elements[origem.name];
        if (outro && outro.value !== origem.value) outro.value = origem.value;
      });
    };
    // input: digitação e preenchimento automático; change: o que alguns navegadores mandam no autocompletar
    document.addEventListener('input', e => copiar(e.target));
    document.addEventListener('change', e => copiar(e.target));
  }
})();
