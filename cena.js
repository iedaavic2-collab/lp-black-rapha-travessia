/* cena.js (Rota): a travessia em movimento. Só visual: não envia nada.
 * Capa com areia levada pelo vento e foto que afunda devagar; na faixa, a linha anda do Egito até o
 * "você está aqui"; nas três paradas, a caminhada se desenha com a rolagem e cada parada acende quando
 * a linha chega; títulos acendem palavra por palavra; a foto do Rapha se revela.
 * 17/11 (velocidade): cada parte abaixo da capa só monta quando chega perto da tela (Mov.quandoPerto). */
(function () {
  var M = window.Mov;
  if (!M) return;
  var g = M.gsap, perto = M.quandoPerto;
  var hero = document.querySelector('.hero');

  M.particulas(hero, { n: M.celular ? 26 : 46, cor: '236,190,128', tam: [0.6, 2], vel: [0.25, 0.7], modo: 'vento', alfa: [0.2, 0.7], halo: false });
  g.fromTo(hero.querySelector('.hero-capa img'), { scale: 1, yPercent: 0 }, { scale: 1.15, yPercent: 8, transformOrigin: '50% 100%', ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

  var mapa = document.querySelector('.rota-mapa');
  if (mapa) perto(mapa, function () {
    var andou = document.createElement('i'); andou.className = 'rota-andou'; andou.setAttribute('aria-hidden', 'true');
    mapa.appendChild(andou);
    g.to(andou, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: mapa, start: 'top 96%', end: 'top 55%', scrub: 0.6 } });
  });

  var paradas = document.querySelector('.paradas');
  if (paradas) { paradas.setAttribute('data-cena', '1'); perto(paradas, function () {
    var linha = document.createElement('i'); linha.className = 'caminho-andou'; linha.setAttribute('aria-hidden', 'true');
    var ponto = document.createElement('i'); ponto.className = 'caminho-ponto'; ponto.setAttribute('aria-hidden', 'true');
    paradas.append(linha, ponto);
    var itens = Array.prototype.filter.call(paradas.children, function (el) { return el.tagName === 'LI'; });
    var vertical = function () { return matchMedia('(max-width: 600px)').matches; };
    g.set(itens, { opacity: 0.32 });
    var estado = { p: 0 };
    g.to(estado, { p: 1, ease: 'none',
      scrollTrigger: { trigger: paradas, start: 'top 78%', end: 'bottom 58%', scrub: 0.5 },
      onUpdate: function () {
        var p = estado.p, v = vertical();
        var total = v ? paradas.offsetHeight : paradas.offsetWidth;
        linha.style.transform = v ? 'scaleY(' + p + ')' : 'scaleX(' + p + ')';
        ponto.style.transform = v ? 'translateY(' + (p * total) + 'px)' : 'translateX(' + (p * total) + 'px)';
        itens.forEach(function (li) {
          var marco = ((v ? li.offsetTop : li.offsetLeft) + 20) / total;
          var chegou = p >= marco;
          if (chegou !== li.classList.contains('chegou')) {
            li.classList.toggle('chegou', chegou);
            g.to(li, { opacity: chegou ? 1 : 0.32, duration: 0.45, overwrite: true });
          }
        });
      } });
  }); }

  var areas = document.querySelector('.areas');
  if (areas) { areas.setAttribute('data-cena', '1'); perto(areas, function () {
    areas.querySelectorAll('article').forEach(function (a, i) {
      g.from(a, { x: i % 2 ? 44 : -44, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: a, start: 'top 90%', once: true } });
    });
  }); }
  var pilares = document.querySelector('.pilares');
  if (pilares) { pilares.setAttribute('data-cena', '1'); perto(pilares, function () {
    g.from(pilares.querySelectorAll('li'), { y: 46, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.16, scrollTrigger: { trigger: pilares, start: 'top 86%', once: true } });
    g.from(pilares.querySelectorAll('b'), { letterSpacing: '0.3em', duration: 1.2, ease: 'power3.out', stagger: 0.16, scrollTrigger: { trigger: pilares, start: 'top 86%', once: true } });
  }); }

  ['#areas-titulo', '#trajeto-titulo', '#mentor-titulo', '#oferta-titulo', '#final-titulo', '.mentor-texto blockquote'].forEach(function (s) {
    M.palavrasPerto(document.querySelector(s));
  });
  var foto = document.querySelector('.mentor-foto');
  if (foto) perto(foto, function () { M.revelar(foto.querySelector('img'), { gatilho: foto }); });
})();
