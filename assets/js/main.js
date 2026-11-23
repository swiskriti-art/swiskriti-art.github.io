/* Amber Terminal on the template kit: a dark instrument panel with amber signal light.
 *
 * The kit fills the page from the contract. This script adds the panel's own touches, each one
 * derived from contract fields:
 * - the brand plate (the initials), and the name fitted to its column;
 * - the status readout: the panel's boot lines, built from the name, hero.title and
 *   hero.location, and a record line that only counts what the data holds;
 * - module numbers in section order, and module notes that count the data;
 * - roles: the "Now" lamp on current roles, monograms when others have a logo, logo mounts by
 *   tone;
 * - projects: numbers by order, a scope trace where a project has no picture, and a drawing's
 *   caption with its full-size link;
 * - plates and meters that always close their rows, and each contact channel labelled.
 *
 * Motion (the boot and the scope beam) runs only when the visitor has not asked for reduced
 * motion. Text goes in only through textContent; every data value placed in a link or an image
 * goes through kit.url or kit.src. */
(() => {
  'use strict';

  const kit = window.kit;
  if (!kit) return;

  const root = document.documentElement;
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const list = (v) => (Array.isArray(v) ? v : []);
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  // a current role: a start date, and no end or an end that reads "Present"
  const isCurrent = (role) =>
    !!str(role.start) && (!str(role.end) || /^present$/i.test(str(role.end)));
  // at and below this width the bar is always the compact one, with the menu button
  const NARROW = '(max-width: 860px)';
  const SVG = 'http://www.w3.org/2000/svg';

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG, tag);
    for (const k of Object.keys(attrs || {})) node.setAttribute(k, attrs[k]);
    return node;
  }

  function icon(name) {
    const svg = svgEl('svg', { class: 'kit-icon', 'aria-hidden': 'true' });
    svg.append(svgEl('use', { href: `#kit-${name}` }));
    return svg;
  }

  const setText = (sel, value, scope) => {
    for (const node of $$(sel, scope)) node.textContent = value;
  };

  const onResize = (fn) => {
    let raf = 0;
    addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fn);
    });
    // and again once the web fonts arrive, which can be after the page is ready
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fn);
    document.fonts?.addEventListener?.('loadingdone', () => fn());
    matchMedia('print').addEventListener?.('change', fn);
  };

  /* -------------------------------------------------------------- the scope traces */
  // A decorative signal for a screen with no picture, in one of four families (sine, square, saw,
  // pulse) so neighbouring screens never look alike, seeded by a name so each screen has its own
  // trace. No axis, no scale, no number.
  function seedOf(text) {
    let h = 2166136261;
    for (const ch of text) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 1;
  }

  const FAMILIES = ['sine', 'square', 'saw', 'pulse'];

  function wave(text, family) {
    let x = seedOf(text);
    const kind = FAMILIES[(Number.isInteger(family) ? family : x) % FAMILIES.length];
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
    const TAU = Math.PI * 2;
    const frac = (v) => v - Math.floor(v);
    const ph = rnd();
    const f = kind === 'sine' ? 2 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 3);
    const f2 = 7 + Math.floor(rnd() * 7);
    const a2 = 0.1 + rnd() * 0.14;
    const y = (t) => {
      const p = f * t + ph;
      const s = frac(p);
      if (kind === 'square') return 0.6 * Math.tanh(5 * Math.sin(TAU * p));
      // a slow ramp and a quick fall
      if (kind === 'saw') return 0.62 * (s < 0.9 ? -1 + (2 * s) / 0.9 : 1 - (2 * (s - 0.9)) / 0.1);
      // a spike with a small undershoot on a low baseline
      if (kind === 'pulse')
        return (
          0.95 * Math.exp(-(((s - 0.3) / 0.03) ** 2)) -
          0.3 * Math.exp(-(((s - 0.38) / 0.04) ** 2)) -
          0.3
        );
      const env = 0.5 + 0.5 * Math.sin(Math.PI * t);
      return env * (0.62 * Math.sin(TAU * p) + a2 * Math.sin(TAU * (f2 * t + ph * 1.7)));
    };
    const pts = [];
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      pts.push(`${(t * 400).toFixed(1)} ${(50 - y(t) * 36).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  }

  function drawTrace(svg, text, family) {
    if (!svg) return;
    svg.setAttribute('viewBox', '0 0 400 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.textContent = '';
    const d = wave(text || 'signal', family);
    svg.append(svgEl('path', { class: 'trace-ghost', d }), svgEl('path', { d }));
  }

  // a scope screen, built for a project with no picture
  function traceScreen(text, family) {
    const box = el('div', 'scope-trace');
    box.setAttribute('aria-hidden', 'true');
    const screen = el('div', 'screen');
    const svg = svgEl('svg', { class: 'trace', focusable: 'false' });
    screen.append(svg);
    box.append(screen);
    drawTrace(svg, text, family);
    return box;
  }

  /* ------------------------------------------------- plates that always close their rows */
  // --max (set per width in styles.css) caps the plates a row, and the rows are as even as
  // possible, larger rows first (7 at most 4 a row: 4 + 3) on a 60-column grid, so 5 a row fits
  function plates() {
    const node = $('.plates');
    if (!node) return;
    const items = [...node.children].filter((c) => c.tagName !== 'TEMPLATE');
    if (!items.length) return;
    let was = '';
    const apply = () => {
      const max = parseInt(getComputedStyle(node).getPropertyValue('--max'), 10) || 1;
      const rows = Math.ceil(items.length / max);
      const base = Math.floor(items.length / rows);
      const extra = items.length % rows;
      const sizes = [];
      for (let r = 0; r < rows; r++) sizes.push(base + (r < extra ? 1 : 0));
      const key = sizes.join(',');
      if (key === was) return;
      was = key;
      node.style.gridTemplateColumns = 'repeat(60, minmax(0, 1fr))';
      let i = 0;
      for (const size of sizes)
        for (let j = 0; j < size; j++) items[i++].style.gridColumn = `span ${60 / size}`;
    };
    apply();
    onResize(apply);
  }

  /* ------------------------------------------------------------ the brand and the name */
  function brand(name) {
    setText('.js-initials', name ? kit.util.initials(name) : '');
  }

  function fitName() {
    const h1 = $('.js-name');
    const name = h1 ? h1.textContent.trim() : '';
    if (!h1 || !name) return;
    if (name.length > 26) h1.classList.add('is-long');
    // the longest unbreakable piece (a word, or a hyphenated word up to its hyphen) sets the size
    const pieces = name.split(/\s+/).flatMap((w) => w.split(/(?<=-)/));
    const fit = () => {
      h1.style.fontSize = '';
      const probe = el('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0';
      h1.append(probe);
      let widest = 0;
      for (const p of pieces) {
        probe.textContent = p;
        widest = Math.max(widest, probe.getBoundingClientRect().width);
      }
      probe.remove();
      const room = h1.clientWidth;
      if (!room || widest <= room) return;
      const base = parseFloat(getComputedStyle(h1).fontSize);
      h1.style.fontSize = `${Math.max(26, Math.floor((base * room * 0.96) / widest))}px`;
    };
    fit();
    onResize(fit);
  }

  /* ---------------------------------------------------------------------- the hero */
  function hero(data) {
    const h = obj(data.hero);
    const where = $('.js-where');
    if (where && !where.querySelector('[data-kit-text]')) where.remove();
    // the eyebrow's lamp and the identity divider go when nothing stands beside them
    const eyebrow = $('.eyebrow');
    if (eyebrow && !eyebrow.querySelector('[data-kit-text]')) eyebrow.remove();
    const foot = $('.ident-foot');
    if (foot && !foot.children.length) foot.remove();
    const body = $('.front-body');
    const meters = $('.js-meters');
    if (meters && !meters.querySelector('[data-kit="readouts"]')) {
      meters.remove();
      body?.classList.add('no-meters');
    }
    const photo = !!$('.scope--photo img');
    const trace = $('.js-hero-trace');
    if (photo) trace?.remove();
    else drawTrace($('.js-trace', trace || document), str(h.name), 0);
    status(data);
    fitReadouts();
  }

  // The status readout: the panel's boot lines. Each value is the page's own data: the name,
  // the title and the location, then a record line that counts roles, projects and
  // certifications. Nothing else is claimed.
  function status(data) {
    const box = $('.js-status');
    const lines = $('.js-boot', box || document);
    if (!box || !lines) return;
    const h = obj(data.hero);
    const roles = list(obj(data.experience).roles).length;
    const projects = list(obj(data.projects).projects).length;
    const certs = list(obj(data.certifications).items).length;
    const record = [
      roles && plural(roles, 'role', 'roles'),
      projects && plural(projects, 'project', 'projects'),
      certs && plural(certs, 'certificate', 'certificates'),
    ].filter(Boolean);
    const rows = [
      ['Ident', str(h.name)],
      ['Function', str(h.title)],
      ['Station', str(h.location)],
      ['Record', record],
    ].filter(([, v]) => v.length);
    if (!rows.length) return box.remove();
    for (const [k, v] of rows) {
      const li = el('li', 'status-line');
      const lamp = el('span', 'lamp');
      lamp.setAttribute('aria-hidden', 'true');
      const value = el('span', 'status-v', Array.isArray(v) ? '' : v);
      // each count keeps its separator at its end, so no line ever starts with one
      if (Array.isArray(v))
        v.forEach((c, i) => {
          if (i) value.append(' ');
          value.append(el('span', 'status-count', i < v.length - 1 ? `${c} ·` : c));
        });
      li.append(lamp, el('span', 'status-k', k), value);
      lines.append(li);
    }
  }

  // Every readout value stays whole inside its window, and the values of a row share one size.
  // When that size would fall under the floor, the meters take more room and fit again: first
  // two a row (4 as 2 x 2; with 3 the odd one spans the row), then one a row. Only if even that
  // is too narrow may a value break, and then only at a space. Nothing is ever clipped.
  const READOUT_FLOOR = 16;
  function fitReadouts() {
    const box = $('.readouts');
    const vals = $$('.readouts .kit-readout__value');
    if (!box || !vals.length) return;
    const glyphs = (v) => {
      const r = document.createRange();
      r.selectNodeContents(v);
      return r.getBoundingClientRect().width;
    };
    const room = (v) => {
      const cs = getComputedStyle(v);
      return v.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    };
    const measure = () => {
      for (const v of vals) v.style.fontSize = '';
      const base = parseFloat(getComputedStyle(vals[0]).fontSize);
      let size = base;
      for (const v of vals) {
        const w = glyphs(v);
        const r = room(v);
        if (r > 0 && w > r) size = Math.min(size, (base * r * 0.97) / w);
      }
      return { base, size };
    };
    const fit = () => {
      box.classList.remove('is-tight', 'is-single', 'is-wrap');
      let m = measure();
      for (const step of ['is-tight', 'is-single']) {
        if (m.size >= READOUT_FLOOR || vals.length < 2) break;
        box.classList.remove('is-tight', 'is-single');
        box.classList.add(step);
        m = measure();
      }
      if (m.size < READOUT_FLOOR) {
        box.classList.add('is-wrap');
        m.size = READOUT_FLOOR;
      }
      if (m.size < m.base) for (const v of vals) v.style.fontSize = `${Math.floor(m.size)}px`;
    };
    fit();
    onResize(fit);
  }

  /* --------------------------------------------- module numbers and module notes */
  function modules(data) {
    $$('section.mod').forEach((sec, i) => setText('.js-mod', kit.util.pad(i + 1), sec));
    const note = (id, text) => {
      const n = $(`#${id} .js-note`);
      if (n) n.textContent = text;
    };
    const roles = list(obj(data.experience).roles).length;
    if (roles) note('experience', plural(roles, 'role', 'roles'));
    const projects = list(obj(data.projects).projects).length;
    if (projects) note('projects', plural(projects, 'project', 'projects'));
    const groups = list(obj(data.skills).groups).map(obj);
    const items = groups.reduce((n, g) => n + list(g.items).filter((x) => str(x)).length, 0);
    if (groups.length)
      note(
        'skills',
        `${plural(groups.length, 'group', 'groups')} · ${plural(items, 'skill', 'skills')}`
      );
  }

  /* -------------------------------------------- roles: current, monograms, logos */
  function logoMount(img, wrap) {
    const read = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w && h && w / h > 1.6) wrap.classList.add('is-wide');
      try {
        const size = 40;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, size, size);
        const px = g.getImageData(0, 0, size, size).data;
        let opaque = 0;
        let weight = 0;
        let light = 0;
        for (let i = 0; i < px.length; i += 4) {
          const a = px[i + 3] / 255;
          if (a < 0.1) continue;
          opaque++;
          weight += a;
          light += ((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255) * a;
        }
        if (!weight) return;
        // a logo on its own plate shows edge to edge; a dark mark on a transparent ground gets a
        // light mount, so it never vanishes into the dark panel; any other mark gets a margin
        if (opaque / (size * size) >= 0.82) return;
        wrap.classList.add('is-mounted');
        if (light / weight < 0.3) wrap.classList.add('is-light');
      } catch {
        wrap.classList.add('is-mounted');
      }
    };
    if (img.complete && img.naturalWidth) read();
    else img.addEventListener('load', read, { once: true });
  }

  function roles(data) {
    const all = list(obj(data.experience).roles).map(obj);
    const items = $$('[data-kit-list="roles"] > .unit');
    const anyLogo = items.some((item) => item.dataset.kitLogo === '1');
    items.forEach((item, i) => {
      const role = all[i] || {};
      const state = $('.js-state', item);
      if (isCurrent(role) && state) {
        item.classList.add('is-current');
        $('.lamp', state)?.classList.add('is-on');
        setText('.js-state-text', 'Now', state);
      } else state?.remove();
      const mono = $('.js-mono', item);
      // a monogram keeps a role without a logo in step with the ones that have one
      if (mono && item.dataset.kitLogo === '0' && anyLogo && str(role.company)) {
        mono.textContent = kit.util.initials(str(role.company));
      } else mono?.remove();
      const mark = $('.unit-mark', item);
      if (mark && !mark.children.length) mark.remove();
      const earlier = $('.js-earlier', item);
      if (earlier && !earlier.querySelector('.kit-earlier')) earlier.remove();
      const side = $('.js-unit-side', item);
      if (side && !side.querySelector('.patch')) {
        side.remove();
        item.classList.add('no-side');
      }
      const meta = $('.unit-meta', item);
      if (meta && !meta.children.length) {
        meta.remove();
        item.classList.add('no-meta');
      }
      const img = $('.unit-logo img', item);
      if (img) logoMount(img, img.parentElement);
    });
  }

  /* -------------------------------------------- projects: numbers, traces, drawings */
  // a caption's text sits in its own span, which gives way (ellipsis or wrap) so the link
  // beside it never breaks or clips
  function captionText(fig) {
    const cap = fig && fig.querySelector('.kit-caption');
    if (!cap || cap.querySelector('.cap-text')) return;
    const span = el('span', 'cap-text');
    for (const n of [...cap.childNodes]) if (n.nodeType === 3) span.append(n);
    if (span.textContent.trim()) cap.prepend(span);
  }

  function drawingCaption(fig, href) {
    if (!fig) return;
    let cap = fig.querySelector('.kit-caption');
    if (!cap) {
      cap = el('figcaption', 'kit-caption', 'Schematic');
      fig.append(cap);
    }
    if (!href || cap.querySelector('a')) return;
    const a = el('a', 'fig-open', 'Full size');
    a.setAttribute('href', href);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    cap.append(a);
  }

  function projects(data) {
    const all = list(obj(data.projects).projects).map(obj);
    const featList = $('[data-kit-list="featured"]');
    const on = !!featList && /^(split|stack)$/.test(root.dataset.kitFeaturedLayout || '');
    const isFeat = (p) => on && p.featured === true;
    const groups = [
      [$$('[data-kit-list="featured"] > .feat'), all.filter(isFeat)],
      [$$('[data-kit-list="projects"] > .row'), all.filter((p) => !isFeat(p))],
    ];
    for (const [cards, items] of groups) {
      cards.forEach((card, i) => {
        const p = items[i] || {};
        setText('.js-pn', `P-${kit.util.pad(all.indexOf(p) + 1)}`, card);
        const side = $('.row-side', card);
        if (side && !side.children.length) {
          side.remove();
          card.classList.add('no-side');
        }
        const fig = $('[data-kit="project-media"]', card);
        if (card.dataset.kitMedia === '0' || !fig) {
          fig?.remove();
          const host = $('.feat-screen, .row-screen', card);
          // the large screens (featured) keep the sine; rows cycle square, saw, pulse, sine
          const row = card.classList.contains('row');
          host?.append(traceScreen(str(p.name), row ? (i + 1) % FAMILIES.length : 0));
          card.classList.add('no-media');
          return;
        }
        if (fig.classList.contains('kit-media--schematic')) {
          drawingCaption(fig, kit.url(p.image));
          captionText(fig);
          return;
        }
        // a render and a drawing: the drawing opens at full size from the render's caption
        const drawing = kit.url(p.image);
        if (drawing && kit.src(p.image)) {
          let cap = fig.querySelector('.kit-caption');
          if (!cap) {
            cap = el('figcaption', 'kit-caption', 'Render');
            fig.append(cap);
          }
          const a = el('a', 'fig-open', 'Schematic');
          a.setAttribute('href', drawing);
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          cap.append(a);
        }
        captionText(fig);
      });
    }
    const label = $('.js-rows-label');
    const rows = groups[1][0].length;
    const feats = groups[0][0].length;
    if (label && (!rows || !feats)) label.remove();
  }

  /* ---------------------------------------------------------- skills and the log */
  function skills(data) {
    const groups = list(obj(data.skills).groups).map(obj);
    $$('[data-kit-list="groups"] > .bay-row').forEach((row, i) => {
      const n = list(obj(groups[i]).items).filter((x) => str(x)).length;
      setText('.js-qty', n ? kit.util.pad(n) : '', row);
    });
  }

  function logs() {
    // "MA, Interaction Design": the comma stays only between a degree and a field
    for (const sep of $$('.log-sep')) {
      const a = sep.previousElementSibling;
      const b = sep.nextElementSibling;
      if (!a || !b || !a.matches('.log-degree') || !b.matches('.log-field')) sep.remove();
    }
    for (const sub of $$('.log-sub')) if (!sub.textContent.trim()) sub.remove();
    for (const log of $$('.log'))
      if (!log.querySelector('.log-date')) log.classList.add('no-dates');
    const pair = $('.pair');
    if (pair && !pair.querySelector('section')) pair.remove();
  }

  /* ---------------------------------------------------------------------- contact */
  const CHANNELS = {
    mail: 'Email',
    phone: 'Phone',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    globe: 'Website',
  };

  // a long address breaks after a slash, before an @, or after a dot that leaves a long part,
  // before it breaks inside a word
  function breakHints(node) {
    const text = node.textContent;
    const parts = text.split(/(?<=\/)|(?=@)|(?<=\.)(?=[^./@]{6,})/);
    if (parts.length < 2) return;
    node.textContent = '';
    for (const part of parts) {
      if (node.childNodes.length) node.append(document.createElement('wbr'));
      node.append(part);
    }
  }

  function contact(data) {
    for (const a of $$('.tx-list .kit-contact')) {
      const use = a.querySelector('use');
      const kind = use ? (use.getAttribute('href') || '').replace('#kit-', '') : '';
      // the kit puts the visible value in a plain span after the icon
      const value = [...a.children].find((c) => c.tagName === 'SPAN');
      if (!value) continue;
      value.classList.add('ch-value');
      breakHints(value);
      if (CHANNELS[kind]) a.insertBefore(el('span', 'ch-label', CHANNELS[kind]), value);
    }
    const avail = $('.js-avail');
    if (avail && !avail.querySelector('[data-kit-text]')) avail.remove();
    // the résumé key again, beside the channels
    const box = $('.js-tx-ctas');
    if (!box) return;
    const cta = list(obj(data.hero).ctas)
      .map(obj)
      .find((c) => c.kind === 'resume');
    const href = cta ? kit.url(cta.href) : '';
    if (!href || !$('#hero .kit-cta--resume')) return box.remove();
    const a = el('a', 'kit-cta kit-cta--resume');
    a.setAttribute('href', href);
    a.append(icon('file'), el('span', '', str(cta.label)));
    box.append(a);
  }

  /* ------------------------------------------------------------------- the nav */
  function nav() {
    const bar = $('#bar');
    const btn = bar && $('.menu-btn', bar);
    const menu = bar && $('.menu', bar);
    if (!btn) return;
    if (!menu || !menu.querySelector('.kit-nav__link')) {
      btn.remove();
      return;
    }
    const inner = $('.bar-inner', bar);
    const navEl = $('.nav', bar);
    const set = (open) => {
      bar.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    const fit = () => {
      bar.classList.remove('is-compact');
      let compact = matchMedia(NARROW).matches;
      if (!compact) {
        const cs = getComputedStyle(inner);
        const room = inner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        // the brand keeps at least its plate and a readable part of the name
        compact = navEl.getBoundingClientRect().width + 250 > room;
      }
      bar.classList.toggle('is-compact', compact);
      if (!compact) set(false);
    };
    fit();
    onResize(fit);
    btn.addEventListener('click', () => set(!bar.classList.contains('is-open')));
    bar.addEventListener('click', (e) => {
      if (e.target.closest('.kit-nav__link')) set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && bar.classList.contains('is-open')) {
        set(false);
        btn.focus();
      }
    });
    // the channel selector lights the module in view
    const links = $$('.kit-nav__link', menu);
    const byId = new Map();
    for (const a of links) {
      const id = (a.getAttribute('href') || '').slice(1);
      const sec = id && document.getElementById(id);
      if (sec) byId.set(sec, a);
    }
    if (!('IntersectionObserver' in window) || !byId.size) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          for (const a of links) a.classList.toggle('is-active', a === byId.get(e.target));
        }
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    for (const sec of byId.keys()) io.observe(sec);
    // the front panel has no channel: while it is in view no lamp is lit
    const front = document.getElementById('hero');
    if (front) io.observe(front);
  }

  /* ------------------------------------------------- pictures for a printed page */
  // pictures load lazily; once the page has loaded and is idle the rest follow, and all of them
  // when the visitor prints, so a printed page is never missing one it never scrolled to
  function eagerLater() {
    const go = () => {
      for (const img of $$('img[loading="lazy"]')) img.loading = 'eager';
    };
    addEventListener('beforeprint', go);
    const idle = () =>
      'requestIdleCallback' in window
        ? requestIdleCallback(go, { timeout: 4000 })
        : setTimeout(go, 2500);
    if (document.readyState === 'complete') idle();
    else addEventListener('load', idle, { once: true });
  }

  /* --------------------------------------------------------------------- motion */
  function motion() {
    if (kit.reducedMotion) return;
    root.classList.add('motion-ok');
    let t = 260;
    for (const line of $$('.status-line')) {
      setTimeout(() => line.classList.add('is-up'), t);
      t += 200;
    }
    for (const lamp of $$('.status-lamps .lamp')) {
      setTimeout(() => lamp.classList.add('is-up'), t);
      t += 140;
    }
  }

  kit.on('ready', (data) => {
    brand(str(obj(data.hero).name));
    hero(data);
    modules(data);
    roles(data);
    projects(data);
    skills(data);
    logs();
    contact(data);
    plates();
    for (const a of $$('a[href^="http"]')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    fitName();
    nav();
    eagerLater();
    motion();
  });
})();
