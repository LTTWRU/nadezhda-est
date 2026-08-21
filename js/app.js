/* ==========================================================================
   НАДЕЖДА ЕСТЬ · частный пансионат — поведение интерфейса
   Ноль внешних библиотек. Всё работает без интернета, кроме отправки заявки.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- 1-2. Контрол «Вид»: тема и размер текста ---------- */
  var root = document.documentElement;

  var savedTheme = store.get('ne-theme');
  if (savedTheme) {
    root.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }
  var savedSize = store.get('ne-size');
  if (savedSize === 'lg' || savedSize === 'xl') root.setAttribute('data-size', savedSize);

  var pop = $('#view-pop');
  var viewBtn = $('#view-btn');

  var syncView = function () {
    var size = root.getAttribute('data-size') || 'md';
    var theme = root.getAttribute('data-theme') || 'light';
    $$('[data-size]', pop).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-size') === size); });
    $$('[data-theme]', pop).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-theme') === theme); });
  };

  var openView = function (open) {
    if (!pop || !viewBtn) return;
    pop.hidden = !open;
    viewBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  if (pop && viewBtn) {
    syncView();
    viewBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openView(pop.hidden);
    });
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { openView(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openView(false); });

    $$('[data-size]', pop).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-size');
        if (v === 'md') root.removeAttribute('data-size'); else root.setAttribute('data-size', v);
        store.set('ne-size', v);
        syncView();
        toast(v === 'md' ? 'Обычный размер текста' : (v === 'lg' ? 'Крупный текст' : 'Очень крупный текст'));
      });
    });
    $$('[data-theme]', pop).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-theme');
        root.setAttribute('data-theme', v);
        store.set('ne-theme', v);
        syncView();
      });
    });
  }

  /* ---------- 3. Шапка ---------- */
  var hdr = $('.hdr');
  var onScroll = function () {
    if (hdr) hdr.classList.toggle('stuck', window.scrollY > 10);
    var up = $('.up');
    if (up) up.classList.toggle('show', window.scrollY > 900);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 4. Мобильное меню ---------- */
  var drawer = $('.drawer');
  var openDrawer = function (open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    document.body.classList.toggle('is-locked', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    var btn = $('.burger');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  var burger = $('.burger');
  if (burger) burger.addEventListener('click', function () { openDrawer(true); });
  $$('[data-act="close-drawer"]').forEach(function (b) {
    b.addEventListener('click', function () { openDrawer(false); });
  });
  if (drawer) $$('a', drawer).forEach(function (a) {
    a.addEventListener('click', function () { openDrawer(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') openDrawer(false);
  });

  /* ---------- 5. Появление блоков ---------- */
  var reveals = $$('.rv');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Страховка: если наблюдатель по какой-то причине не сработал,
  // через 2,5 секунды показываем всё — контент важнее анимации.
  setTimeout(function () {
    if (document.querySelectorAll('.rv.in').length > 2) return;
    reveals.forEach(function (el) { el.classList.add('in'); });
  }, 2500);

  /* ---------- 6. Счётчики ---------- */
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        co.unobserve(el);
        var to = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) { el.textContent = to + suffix; return; }
        var start = null, dur = 1400;
        var tick = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- 7. FAQ: открыт только один ---------- */
  var qs = $$('.q');
  qs.forEach(function (q) {
    q.addEventListener('toggle', function () {
      if (!q.open) return;
      qs.forEach(function (o) { if (o !== q) o.open = false; });
    });
  });

  /* ---------- 8. Кнопки, ведущие к форме, подставляют тему обращения ---------- */
  $$('[data-topic]').forEach(function (b) {
    b.addEventListener('click', function () {
      var val = b.getAttribute('data-topic');
      var sel = $('#care');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === val) { sel.selectedIndex = i; break; }
        }
      }
    });
  });

  /* ---------- 9. Маска телефона ---------- */
  var phone = $('#phone');
  if (phone) {
    var format = function (v) {
      var d = v.replace(/\D/g, '');
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 4) out += ') ' + d.slice(4, 7);
      if (d.length >= 7) out += '-' + d.slice(7, 9);
      if (d.length >= 9) out += '-' + d.slice(9, 11);
      return out;
    };
    var handle = function () { phone.value = format(phone.value); };
    phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
    phone.addEventListener('input', handle);
    phone.addEventListener('blur', function () {
      if (phone.value.replace(/\D/g, '').length < 2) phone.value = '';
    });
  }

  /* ---------- 10. Отправка заявки ---------- */
  var form = $('#lead-form');
  if (form) {
    var card = form.closest('.form-card');
    var fail = function (field, msg) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.add('err');
      var m = $('.msg', wrap);
      if (m) m.textContent = msg;
      field.addEventListener('input', function () { wrap.classList.remove('err'); }, { once: true });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.field.err', form).forEach(function (f) { f.classList.remove('err'); });

      var name = $('#name', form);
      var tel = $('#phone', form);
      var agree = $('#agree', form);
      var ok = true;

      if (name.value.trim().length < 2) { fail(name, 'Напишите, как к вам обращаться'); ok = false; }
      if (tel.value.replace(/\D/g, '').length < 11) { fail(tel, 'Нужен полный номер: +7 (___) ___-__-__'); ok = false; }
      if (!agree.checked) { toast('Отметьте согласие на обработку данных'); ok = false; }
      if (!ok) return;

      var btn = $('button[type="submit"]', form);
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Отправляем…'; }

      var payload = {
        name: name.value.trim(),
        phone: tel.value.trim(),
        who: ($('#care', form) || {}).value || '',
        msg: ($('#msg', form) || {}).value || '',
        company: ($('#company', form) || {}).value || '',
        page: location.pathname
      };

      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) throw new Error(res.j.error || 'fail');
          if (card) card.classList.add('done');
          form.reset();
          if (history.replaceState) history.replaceState(null, '', '#spasibo');
        })
        .catch(function () {
          toast('Не удалось отправить. Позвоните нам: 8 923 44-111-22');
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
        });
    });
  }

  /* ---------- 11. Наверх ---------- */
  var up = $('.up');
  if (up) up.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 12. Тост ---------- */
  var toastEl = null, toastTimer = null;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3600);
  }

  /* ---------- 14. Фото, которых ещё нет ---------- */
  // Пока клиент не загрузил снимки, вместо «битой» картинки остаётся
  // аккуратная заглушка с подписью, какой файл сюда положить.
  var drop = function (img) { if (img && img.parentNode) img.parentNode.removeChild(img); };
  $$('img[data-ph]').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) { drop(img); return; }
    img.addEventListener('error', function () { drop(img); });
  });

  /* ---------- 15. «Сейчас в доме»: часы Новосибирска ---------- */
  // Родственники ищут пансионат ночью. Сайт показывает им реальное
  // время в доме и то, что дежурная смена в этот момент делает.
  var nowBox = $('#now');
  var tlItems = $$('.tl[data-from]');
  if (nowBox || tlItems.length) {
    var schedule = [
      { at: '07:30', title: 'Подъём и утренняя гигиена', sub: 'Помогаем умыться и одеться' },
      { at: '08:30', title: 'Завтрак и лекарства', sub: 'Приём препаратов под контролем' },
      { at: '10:00', title: 'Зарядка, ЛФК, прогулка', sub: 'Кто может — во дворе' },
      { at: '13:00', title: 'Обед', sub: 'Готовим на своей кухне' },
      { at: '14:00', title: 'Тихий час', sub: 'Отдых, смена положения тела' },
      { at: '16:00', title: 'Полдник и звонки родным', sub: 'Поможем набрать номер' },
      { at: '18:30', title: 'Ужин', sub: 'Вечерние лекарства по назначению' },
      { at: '20:00', title: 'Вечерние процедуры', sub: 'Гигиена, измерения, подготовка ко сну' },
      { at: '21:30', title: 'Ночной обход', sub: 'Дежурная смена не спит: обход каждые 2 часа' }
    ];

    var localTime = function () {
      try {
        var parts = new Intl.DateTimeFormat('ru-RU', {
          timeZone: 'Asia/Novosibirsk', hour: '2-digit', minute: '2-digit', hour12: false
        }).formatToParts(new Date());
        var h = 0, m = 0;
        parts.forEach(function (p) {
          if (p.type === 'hour') h = parseInt(p.value, 10);
          if (p.type === 'minute') m = parseInt(p.value, 10);
        });
        return { h: h, m: m };
      } catch (e) {
        var d = new Date();
        return { h: d.getHours(), m: d.getMinutes() };
      }
    };

    var tick = function () {
      var t = localTime();
      var mins = t.h * 60 + t.m;
      var idx = schedule.length - 1;            // до 07:30 идёт ночной обход
      for (var i = 0; i < schedule.length; i++) {
        var p = schedule[i].at.split(':');
        if (mins >= parseInt(p[0], 10) * 60 + parseInt(p[1], 10)) idx = i;
      }
      var cur = schedule[idx];

      var timeEl = $('#now-time');
      if (timeEl) timeEl.textContent = (t.h < 10 ? '0' : '') + t.h + ':' + (t.m < 10 ? '0' : '') + t.m;
      var titleEl = $('#now-title');
      if (titleEl) titleEl.textContent = cur.title;
      var subEl = $('#now-sub');
      if (subEl) subEl.textContent = cur.sub;

      tlItems.forEach(function (el, i) { el.classList.toggle('is-now', i === idx); });
    };

    tick();
    setInterval(tick, 20000);
  }

  /* ---------- 16. Расчёт стоимости ----------
     Цифра меняется сразу при выборе — человек не заполняет форму,
     чтобы узнать цену. Это и есть прозрачность, о которой мы пишем. */
  var calc = $('#calc');
  if (calc) {
    var included = {
      base: [
        'Проживание, четырёхразовое питание, уборка и стирка',
        'Гигиена, контроль лекарств, наблюдение 24/7',
        'Прогулки, досуг, помощь в звонках родным'
      ],
      strong: [
        'Всё из базового ухода',
        'Противопролежневый матрас, смена положения каждые 2 часа',
        'Кормление, подгузники и пелёнки, ЛФК по назначению врача'
      ],
      special: [
        'Всё из усиленного ухода',
        'Усиленное наблюдение днём и ночью, безопасная среда',
        'Индивидуальный режим, питание и сопровождение к врачу'
      ]
    };

    var money = function (n) {
      return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    };

    var recalc = function () {
      var sum = 0, key = 'base';
      ['care', 'term'].forEach(function (name) {
        var el = calc.querySelector('input[name="' + name + '"]:checked');
        if (!el) return;
        sum += parseInt(el.value, 10);
        if (name === 'care') key = el.getAttribute('data-inc') || 'base';
      });

      var day = $('#calc-day'), month = $('#calc-month'), list = $('#calc-inc');
      if (day) day.textContent = money(sum);
      if (month) month.textContent = money(Math.round(sum * 30 / 100) * 100);
      if (list) {
        list.innerHTML = included[key].map(function (t) {
          return '<li><svg><use href="#i-check"/></svg> ' + t + '</li>';
        }).join('');
      }
    };

    calc.addEventListener('change', recalc);
    recalc();
  }

  /* ---------- 17. Панель действий на десктопе ---------- */
  var bar = $('.actionbar');
  if (bar) {
    var footTop = function () {
      var f = $('.foot');
      return f ? f.getBoundingClientRect().top + window.scrollY : Infinity;
    };
    var toggleBar = function () {
      var y = window.scrollY;
      // Показываем после первого экрана и убираем у подвала, где контакты и так на виду.
      bar.classList.toggle('show', y > window.innerHeight * 0.9 && y + window.innerHeight < footTop() + 120);
    };
    window.addEventListener('scroll', toggleBar, { passive: true });
    toggleBar();
  }

  /* ---------- 18. Мобильные свёртки ----------
     На большом экране списки открыты, на телефоне — свёрнуты:
     36 экранов прокрутки никто не осилит. */
  if (window.matchMedia('(max-width: 720px)').matches) {
    $$('.disc[open]').forEach(function (d, i) { if (i > 0) d.open = false; });
  }

  /* ---------- 19. Нижняя панель уступает форме ---------- */
  var zayavka = $('#zayavka');
  if (zayavka && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        document.body.classList.toggle('at-form', en.isIntersecting);
      });
    }, { threshold: 0.15 }).observe(zayavka);
  }

  /* ---------- 13. Год в подвале ---------- */
  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
