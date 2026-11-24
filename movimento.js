/* movimento.js (v2.2, 17/11/2026): motor de movimento das LPs.
 *
 * v2.2 (velocidade no celular, pedido do Rapha: mínimo 90 no PageSpeed): cada seção monta as animações só
 * quando chega perto da tela (Mov.quandoPerto), em vez de tudo ao abrir; o Lenis só liga com mouse (no
 * celular a rolagem já é a do aparelho); as partículas começam depois de a página carregar.
 *
 * Regras de docs/bibliotecas-lp/REGRAS.md: um motor de animação só (GSAP + ScrollTrigger)
 * e Lenis em toda página. Expõe window.Mov para a cena de cada página (cena-*.js), que
 * roda logo depois deste arquivo. Só visual: não envia nada, não lê nem grava cadastro.
 *
 * Com "reduzir movimento" ligado no aparelho (ou sem GSAP), window.Mov fica null e a
 * página fica parada e completa.
 */
(function () {
  'use strict';
  var html = document.documentElement;
  window.Mov = null;
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduz || !window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  var celular = matchMedia('(max-width: 900px)').matches;
  var Mov = { gsap: gsap, ST: ST, lenis: null, celular: celular };

  // Monta uma parte da página só quando ela chega perto da tela (padrão: 3/4 de tela antes). Abrir a página
  // fica leve no celular, e quem rola não vê diferença: tudo fica pronto antes de aparecer.
  Mov.quandoPerto = function (el, fn, margem) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (!es.some(function (x) { return x.isIntersecting; })) return;
      io.disconnect();
      try { fn(); } catch (e) { if (window.console) console.error('[movimento]', e); }
    }, { rootMargin: '0px 0px ' + (margem || '75%') + ' 0px' });
    io.observe(el);
  };

  // 1. Lenis: rolagem suave só com mouse (no celular a rolagem continua a do aparelho, e o Lenis só gastaria)
  if (window.Lenis && matchMedia('(pointer: fine)').matches) {
    var lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    Mov.lenis = window.__lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('[role="dialog"], dialog, .saida').forEach(function (el) { el.setAttribute('data-lenis-prevent', ''); });
    // pop-up aberto: a página de trás para de rolar
    new MutationObserver(function () {
      if (html.classList.contains('saida-aberta')) lenis.stop(); else lenis.start();
    }).observe(html, { attributes: true, attributeFilter: ['class'] });
    // links internos com a mesma suavidade, e o cursor já no primeiro campo
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var alvo = id && document.getElementById(id);
      if (!alvo) return;
      e.preventDefault();
      lenis.scrollTo(alvo, { offset: -16 });
      var campo = alvo.querySelector('input:not([type="hidden"])');
      if (campo) setTimeout(function () { try { campo.focus({ preventScroll: true }); } catch (_) {} }, 900);
    });
  }

  // 2. Palavras que acendem conforme a pessoa rola (o texto continua o mesmo pra quem lê com leitor de tela)
  function quebrar(el) {
    var feitas = [];
    (function andar(no) {
      Array.prototype.slice.call(no.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span'); s.className = 'pal'; s.textContent = p;
            frag.appendChild(s); feitas.push(s);
          });
          no.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(BR|SVG|IMG)$/i.test(n.tagName) && !(n.classList && n.classList.contains('sr-only'))) {
          andar(n);
        }
      });
    })(el);
    return feitas;
  }
  var palavrasFeitas = [];
  Mov.palavras = function (el, cfg) {
    if (!el || el.getAttribute('data-palavras') === 'ok') return null;
    el.setAttribute('data-palavras', 'ok');
    var ps = quebrar(el);
    if (!ps.length) return null;
    cfg = cfg || {};
    var tw = gsap.fromTo(ps, { opacity: cfg.de != null ? cfg.de : 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: el, start: cfg.inicio || 'top 88%', end: cfg.fim || 'bottom 60%', scrub: cfg.scrub != null ? cfg.scrub : 0.6 }
    });
    var it = { el: el, tw: tw };
    palavrasFeitas.push(it);
    if (carregou) requestAnimationFrame(function () { conferirUm(it); });
    return tw;
  };
  // o mesmo, montado só quando o texto chega perto da tela (marca já, para a entrada genérica não pegar o texto)
  Mov.palavrasPerto = function (el, cfg) {
    if (!el || el.getAttribute('data-palavras') === 'ok') return;
    el.setAttribute('data-palavras', 'pendente');
    Mov.quandoPerto(el, function () { Mov.palavras(el, cfg); });
  };
  // texto perto do fim da página, que a rolagem não alcança: acende sozinho quando aparece
  var carregou = false;
  function conferirUm(it) {
    var st = it.tw.scrollTrigger;
    if (!st || st.end <= ST.maxScroll(window) - 4) return;
    st.kill(); it.tw.progress(0).pause();
    ST.create({ trigger: it.el, start: 'top 90%', once: true, onEnter: function () { gsap.to(it.tw, { progress: 1, duration: 1.3, ease: 'power1.out' }); } });
  }
  function conferirFim() { palavrasFeitas.forEach(conferirUm); }

  // 3. Partículas (areia, poeira de luz, bokeh) num canvas por cima da capa e por baixo do texto.
  //    Param quando a capa sai da tela; o desenho é simples (círculos), leve no celular.
  Mov.particulas = function (alvo, cfg) {
    if (!alvo) return null;
    cfg = Object.assign({ n: celular ? 22 : 40, cor: '255,214,150', tam: [0.8, 2.4], vel: [0.15, 0.45], modo: 'sobe', alfa: [0.25, 0.8], halo: true, zona: [0, 1] }, cfg || {});
    var c = document.createElement('canvas');
    c.className = 'particulas'; c.setAttribute('aria-hidden', 'true');
    alvo.appendChild(c);
    var ctx = c.getContext('2d');
    if (!ctx) return null;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, ps = [], visivel = true;
    var sorteio = function (a) { return a[0] + Math.random() * (a[1] - a[0]); };
    function medir() {
      W = alvo.clientWidth; H = alvo.clientHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function nasce(p, comeco) {
      p.x = (cfg.zona[0] + Math.random() * (cfg.zona[1] - cfg.zona[0])) * W;
      p.y = comeco ? Math.random() * H : (cfg.modo === 'sobe' ? H + 8 : Math.random() * H);
      if (!comeco && cfg.modo === 'vento') p.x = W + 8;
      p.r = sorteio(cfg.tam); p.v = sorteio(cfg.vel); p.a = sorteio(cfg.alfa); p.f = Math.random() * 6.283;
    }
    medir();
    for (var i = 0; i < cfg.n; i++) { var p = {}; nasce(p, true); ps.push(p); }
    // começa depois de a página carregar, para não disputar com a primeira pintura (aparece suave, pelo CSS)
    c.style.opacity = '0';
    var comecar = function () { setTimeout(function () { c.style.transition = 'opacity 1.2s'; c.style.opacity = '1'; gsap.ticker.add(desenha); }, 400); };
    if (document.readyState === 'complete') comecar(); else window.addEventListener('load', comecar);
    function desenha(t) {
      if (!visivel || !W) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgb(' + cfg.cor + ')';
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (cfg.modo === 'vento') {
          p.x -= p.v * 1.6; p.y += Math.sin(t * 0.8 + p.f) * 0.15 + p.v * 0.1;
          if (p.x < -8 || p.y > H + 8) nasce(p, false);
        } else {
          p.y -= p.v; p.x += Math.sin(t * 0.6 + p.f) * 0.25;
          if (p.y < -8) nasce(p, false);
        }
        var a = p.a * (0.65 + 0.35 * Math.sin(t * 1.4 + p.f));
        if (cfg.halo) { ctx.globalAlpha = a * 0.16; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.283); ctx.fill(); }
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; if (!visivel) ctx.clearRect(0, 0, W, H); }).observe(alvo);
    }
    var tm;
    window.addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(medir, 150); });
    return c;
  };

  // 4. Número que conta até o valor (data-conta="90")
  Mov.conta = function (el, cfg) {
    if (!el) return null;
    var fim = parseFloat(el.getAttribute('data-conta'));
    if (isNaN(fim)) return null;
    cfg = cfg || {};
    var o = { v: cfg.de || 0 };
    var fmt = function (v) { return Math.round(v).toLocaleString('pt-BR'); };
    return gsap.to(o, {
      v: fim, duration: cfg.dur || 1.4, ease: 'power2.out', delay: cfg.delay || 0,
      scrollTrigger: cfg.agora ? undefined : { trigger: el, start: 'top 92%', once: true },
      onStart: function () { el.textContent = fmt(o.v); },
      onUpdate: function () { el.textContent = fmt(o.v); }
    });
  };

  // 5. Foto que se revela e se aproxima conforme entra na tela
  Mov.revelar = function (img, cfg) {
    if (!img) return null;
    cfg = cfg || {};
    return gsap.fromTo(img, { clipPath: 'inset(' + (cfg.de || 22) + '% 0% 0% 0%)', scale: cfg.escala || 1.12 }, {
      clipPath: 'inset(0% 0% 0% 0%)', scale: 1, ease: 'none',
      scrollTrigger: { trigger: cfg.gatilho || img, start: 'top 95%', end: 'top 40%', scrub: 0.6 }
    });
  };

  // 6. Parallax (o elemento anda mais devagar que a página)
  Mov.parallax = function (el, quanto, gatilho) {
    if (!el) return null;
    return gsap.fromTo(el, { yPercent: -quanto / 2 }, { yPercent: quanto / 2, ease: 'none',
      scrollTrigger: { trigger: gatilho || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  };

  // 7. Transição do CSS em transform ou opacity (o hover de um botão, por exemplo) atrapalha a medida do
  //    GSAP quando o ScrollTrigger recalcula a página: o elemento ficava parado no meio do caminho
  //    (17/11/2026: o botão do fim do devocional, 26px abaixo do lugar, cobria o "100% gratuito").
  //    A transição fica desligada até a entrada terminar e depois volta.
  function semTransicao(els) {
    var presos = Array.prototype.filter.call(els, function (el) {
      var cs = getComputedStyle(el), ps = cs.transitionProperty.split(','), ds = cs.transitionDuration.split(',');
      return ps.some(function (prop, i) {
        return (parseFloat(ds[i % ds.length]) || 0) > 0 && /^(all|transform|opacity|translate|scale|rotate)$/.test(prop.trim());
      });
    });
    presos.forEach(function (el) { el.style.transition = 'none'; });
    return function () { presos.forEach(function (el) { el.style.transition = ''; }); };
  }
  Mov.semTransicao = semTransicao;

  // 8. Entradas das seções. Rodam no DOMContentLoaded, depois da cena da página, que marca
  //    com data-cena o que ela mesma anima. A capa não entra aqui: ela tem a entrada própria (CSS).
  function coletar(raiz, lista) {
    Array.prototype.forEach.call(raiz.children, function (c) {
      if (c.matches('[data-cena], [data-palavras], script, style')) return;
      if (c.querySelector('[data-cena], [data-palavras]')) { coletar(c, lista); return; }
      if (c.offsetParent !== null || c.tagName === 'IMG') lista.push(c);
    });
    return lista;
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.secao, .faixa, .versiculo, .bio, .final, .rota-faixa').forEach(function (sec) {
      if (sec.closest('.hero') || sec.matches('[data-cena]')) return;
      Mov.quandoPerto(sec, function () {
        var itens = coletar(sec, []);
        if (!itens.length) return;
        var solta = semTransicao(itens);
        gsap.from(itens, { opacity: 0, y: 26, duration: 0.8, ease: 'power3.out', stagger: 0.07, onComplete: solta,
          scrollTrigger: { trigger: sec, start: 'top 84%', once: true } });
      });
    });
  });
  window.addEventListener('load', function () { carregou = true; ST.refresh(); conferirFim(); });

  window.Mov = Mov;
})();
