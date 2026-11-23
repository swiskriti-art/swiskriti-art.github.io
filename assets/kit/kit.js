/* SlateGit template kit v1 (docs/template-kit/contract.md), a module. Data is untrusted: text
 * goes in by textContent, URLs pass HREF or SRC, and only DEFAULTS is parsed. */
const STEMS = 'site hero about experience projects skills education certifications contact';
const pairs = (s) => Object.fromEntries(s.split(' ').map((p) => p.split(':')));
const LISTS = pairs(
  'paragraphs:about highlights:about roles:experience projects:projects featured:projects ' +
    'groups:skills entries:education items:certifications'
);
// object items need this key (as in the schema)
const NEEDS = pairs(
  'readouts:value roles:company earlier:title projects:name groups:name entries:institution ' +
    'items:name'
);

// item markup for lists without a <template>
const f = (key, tag = 'span') => `<${tag} data-kit-field="${key}"></${tag}>`;
const ul = (key, cls = '') => `<ul class="${cls}" data-kit-each="${key}"><li></li></ul>`;
const META = `<p class="kit-meta"><span data-kit="role-dates"></span> ${f('location')}</p>`;
const DEFAULTS = {
  paragraphs: '<p class="kit-paragraph"></p>',
  highlights: `<div class="kit-highlight">${f('label')} ${f('value')}</div>`,
  roles: `<article class="kit-role"><div data-kit="role-logo"></div>${f('title', 'h3')}<a data-kit-field="company" data-kit-href="companyUrl"></a>${META}${f('description', 'p')}${ul('highlights')}${ul('technologies', 'kit-tags')}<ul data-kit="role-earlier"></ul></article>`,
  projects: `<article class="kit-project"><figure data-kit="project-media"></figure>${f('category', 'p')}${f('name', 'h3')}${f('description', 'p')}${ul('highlights')}${ul('technologies', 'kit-tags')}<div data-kit="project-links"></div></article>`,
  groups: `<div class="kit-group">${f('name', 'h3')}${ul('items', 'kit-tags')}</div>`,
  entries: `<article class="kit-entry">${f('institution', 'h3')}<p>${f('degree')} ${f('field')}</p>${META}${ul('details')}</article>`,
  items: `<div class="kit-cert"><a data-kit-field="name" data-kit-href="url"></a> ${f('issuer')} ${f('date')}</div>`,
};

// the only URL forms allowed (kit.url and kit.src)
const HREF = /^(https?:\/\/\S+|mailto:[^\s<>"]+|tel:\+?\d+|#[\w-]+|assets\/(?!.*\.\.)[\w./-]+)$/;
const SRC = /^assets\/(?!.*\.\.)[\w./-]+$/;

const root = document.documentElement;
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const own = (el, sel) => (el.matches(sel) ? [el] : []).concat($$(sel, el));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v.trim() : Number.isFinite(v) ? String(v) : '');
const at = (v, k) => (v && typeof v === 'object' && Object.hasOwn(v, k) ? v[k] : '');
const get = (o, path) => path.split('.').reduce(at, o);
const href = (v) => (HREF.test(str(v)) ? str(v) : '');
const web = (v) => (/^http/.test(href(v)) ? href(v) : '');
const src = (v) => (SRC.test(str(v)) ? str(v) : '');
const iconName = (n) => /^[a-z0-9-]+$/.test(n ?? '');
const isList = (el) => /^[OU]L$/.test(el.tagName);
const dates = (o) => [str(o.start), str(o.end)].filter(Boolean).join(' – ');
const count = (el, n = el.children.length) => (el.dataset.kitCount = n);
const keep = (el) => (el.children.length ? count(el) : el.remove());
const text = (el, v) => (str(v) ? (el.textContent = str(v)) : el.remove());
const layout = () => root.dataset.kitFeaturedLayout;
const featured = (p) => /^(split|stack)$/.test(layout()) && p.featured === true;

function make(tag, cls, ...content) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.append(...content);
  return el;
}

// one child per entry; an empty slot goes
function fill(slot, entries, build) {
  for (const e of entries) (isList(slot) ? slot.appendChild(make('li')) : slot).append(build(e));
  keep(slot);
}

const duo = (cls, a, b, x = '__value', y = '__label') =>
  make('div', cls, make('span', cls + x, a), ' ', make('span', cls + y, b));
const earlier = (e) => duo('kit-earlier', str(e.title), dates(e), '__title', '__dates');

const link = (url, cls, ...content) => Object.assign(make('a', cls, ...content), { href: url });

function icon(name, label) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'kit-icon');
  if (label) svg.setAttribute('role', 'img');
  svg.setAttribute(label ? 'aria-label' : 'aria-hidden', label || 'true');
  svg.appendChild(document.createElementNS(NS, 'use')).setAttribute('href', '#kit-' + name);
  return svg;
}

// 6. images: sized, async, lazy but the hero photo
function image(slot, url, alt, [width, height], caption) {
  const img = slot.appendChild(make('img'));
  const loading = slot.dataset.kit === 'hero-photo' ? 'eager' : 'lazy';
  const attrs = { src: url, alt: alt || 'Image', width, height, decoding: 'async', loading };
  for (const k in attrs) img.setAttribute(k, attrs[k]);
  const tag = slot.tagName === 'FIGURE' ? 'figcaption' : 'span';
  if (str(caption)) slot.append(make(tag, 'kit-caption', str(caption)));
}

// drops empties, and object items lacking their key
function clean(v, key) {
  if (typeof v === 'string') return v.trim() ? v : undefined;
  if (typeof v === 'boolean' || Number.isFinite(v)) return v;
  if (Array.isArray(v)) {
    const ok = (x) => x !== undefined && !(isObj(x) && NEEDS[key] && !(NEEDS[key] in x));
    const out = v.map((x) => clean(x)).filter(ok);
    return out.length ? out : undefined;
  }
  const out = {};
  for (const k of isObj(v) ? Object.keys(v) : []) {
    const c = k === '__proto__' ? undefined : clean(v[k], k);
    if (c !== undefined) out[k] = c;
  }
  return Object.keys(out).length ? out : undefined;
}

const D = {};
for (const s of STEMS.split(' ')) D[s] = {};

// hero.social as [icon, label, url, shown text]
function contacts() {
  const s = D.hero.social || {};
  const site = (kind, label, url) => [kind, label, url, url.replace(/^https?:\/\/|\/$/g, '')];
  return [
    ['mail', 'Email', /@/.test(s.email) && href('mailto:' + str(s.email)), str(s.email)],
    ['phone', 'Phone', href('tel:' + str(s.phone).replace(/[^\d+]/g, '')), str(s.phone)],
    site('github', 'GitHub', web(s.github)),
    site('linkedin', 'LinkedIn', web(s.linkedin)),
    site('globe', 'Website', web(s.website)),
  ].filter((c) => c[2]);
}

const full = (s) => Object.keys(D[s] || {}).length || (s === 'contact' && contacts().length);

// slots inside a list item
const ITEM = {
  'role-logo': (el, r) =>
    src(r.logo) ? image(el, src(r.logo), str(r.company) + ' logo', [64, 64]) : el.remove(),
  'role-dates': (el, r) => text(el, dates(r)),
  'role-earlier': (el, r) => fill(el, arr(r.earlier), earlier),
  'project-media': (el, p) => {
    const render = src(at(p.hero, 'src'));
    const url = render || src(p.image);
    el.classList.add('kit-media--' + (render ? 'render' : 'schematic'));
    const alt = render ? str(p.hero.alt) || str(p.name) : str(p.name) + ' architecture diagram';
    if (url) image(el, url, alt, render ? [1280, 720] : [640, 360], render && p.hero.caption);
    else el.remove();
  },
  'project-links': (el, p) => {
    const keys = ['source', 'demo'].filter((k) => web(at(p.links, k)));
    fill(el, keys, (k) => {
      const url = web(at(p.links, k));
      const name = k === 'demo' ? 'external-link' : /github\.com/i.test(url) ? 'github' : 'code';
      return link(url, 'kit-link', icon(name), k === 'demo' ? 'Live demo' : 'Source');
    });
  },
};

function fillItem(node, item, list) {
  if (!isObj(item)) return ((own(node, '[data-kit-field]')[0] || node).textContent = str(item));
  for (const el of own(node, '[data-kit-field]')) text(el, get(item, el.dataset.kitField));
  for (const el of own(node, '[data-kit-each]')) {
    const proto = el.firstElementChild || make(isList(el) ? 'li' : 'span');
    el.textContent = '';
    for (const v of arr(get(item, el.dataset.kitEach)).map(str).filter(Boolean)) {
      el.appendChild(proto.cloneNode()).textContent = v;
    }
    keep(el);
  }
  for (const el of own(node, '[data-kit-href]')) {
    const url = web(get(item, el.dataset.kitHref));
    url ? el.setAttribute('href', url) : el.removeAttribute('href');
  }
  for (const el of own(node, '[data-kit]')) ITEM[el.dataset.kit]?.(el, item);
  if (list === 'roles') node.dataset.kitLogo = src(item.logo) ? 1 : 0;
  if (LISTS[list] === 'projects') {
    node.dataset.kitMedia = src(at(item.hero, 'src')) || src(item.image) ? 1 : 0;
    if (featured(item)) node.classList.add('kit-project--featured', 'kit-project--' + layout());
  }
}

function renderList(el) {
  const name = el.dataset.kitList;
  const key = name === 'featured' ? 'projects' : name;
  const split = document.querySelector('[data-kit-list="featured"]');
  const items = arr(at(D[LISTS[name]], key)).filter(
    (p) => key !== 'projects' || (name === 'featured' ? featured(p) : !(split && featured(p)))
  );
  const custom = [...el.children].find((c) => c.tagName === 'TEMPLATE');
  const tpl = custom || document.createElement('template');
  if (!custom) tpl.innerHTML = DEFAULTS[key] || ''; // the kit's own static markup, never data
  const proto = tpl.content.firstElementChild;
  for (const item of proto ? items : []) {
    const node = proto.cloneNode(true);
    fillItem(node, item, name);
    (!custom && isList(el) ? el.appendChild(make('li')) : el).append(node);
  }
  count(el, proto ? items.length : 0);
}

// page-level slots
const contactLinks = (shown) => (el) =>
  fill(el, contacts(), ([name, label, url, value]) => {
    const span = make('span', shown ? '' : 'kit-social__label', shown ? value : label);
    return link(url, shown ? 'kit-contact' : 'kit-social__link', icon(name), span);
  });
const PAGE = {
  'hero-photo': (el, p = D.hero.photo || {}) =>
    src(p.src)
      ? image(el, src(p.src), str(p.alt) || str(D.hero.name), [640, 800], p.caption)
      : el.remove(),
  readouts: (el) =>
    fill(el, arr(D.hero.readouts), (r) => duo('kit-readout', str(r.value), str(r.label))),
  ctas: (el) => {
    const ctas = arr(D.hero.ctas).filter((c) => href(c.href) && str(c.label));
    fill(el, ctas, (c) => {
      const kind = /^(primary|secondary|resume)$/.test(c.kind) ? c.kind : 'secondary';
      const a = link(href(c.href), 'kit-cta kit-cta--' + kind, str(c.label));
      if (kind === 'resume') a.prepend(icon('file'));
      return a;
    });
  },
  social: contactLinks(false),
  'contact-list': contactLinks(true),
  nav: (el) => {
    // site.nav, else every section in page order
    const secs = $$('[data-kit-section]');
    const all = secs.map((s) => ({ section: s.dataset.kitSection }));
    const label = (s) => (/^(hero|site)$/.test(s) ? '' : s[0].toUpperCase() + s.slice(1));
    const links = (arr(D.site.nav).length ? D.site.nav : all).map((n) => {
      const sec = secs.find((s) => s.dataset.kitSection === n.section);
      const name = sec && (str(n.label) || sec.dataset.kitLabel || label(n.section));
      return name && [sec, name];
    });
    const to = ([sec, name]) =>
      link('#' + (sec.id ||= sec.dataset.kitSection), 'kit-nav__link', name);
    fill(el, links.filter(Boolean), to);
  },
  footer: (el) => {
    const name = str(D.hero.name);
    text(el, str(D.site.footer) || (name && `© ${new Date().getFullYear()} ${name}`));
  },
  icon: (el) => {
    if (!iconName(el.dataset.icon)) return el.remove();
    const svg = icon(el.dataset.icon, el.getAttribute('aria-label'));
    svg.classList.add(...el.classList);
    el.replaceWith(svg);
  },
};

// a throwing template callback is only logged
function safe(fn, ...args) {
  try {
    fn(...args);
  } catch (e) {
    console.error('kit:', e);
  }
}

function build(files, sprite) {
  Object.keys(D).forEach((s, i) => (D[s] = (isObj(files[i]) && clean(files[i])) || {}));
  if (!str(D.hero.name)) D.hero = {};
  // 2. the icon sprite, parsed as SVG
  const doc = new DOMParser().parseFromString(sprite || '<x/>', 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.localName === 'svg' && !doc.querySelector('parsererror')) {
    svg.classList.add('kit-sprite');
    svg.setAttribute('aria-hidden', 'true');
    document.body.prepend(document.importNode(svg, true));
  }
  // 3. section renderers, else the default lists
  for (const sec of $$('[data-kit-section]')) {
    const stem = sec.dataset.kitSection;
    if (renderers[stem] && full(stem)) safe(renderers[stem], sec, D, kit);
  }
  for (const el of $$('[data-kit-list]')) {
    if (!renderers[el.closest('[data-kit-section]')?.dataset.kitSection]) renderList(el);
  }
  // 4. text and page-level slots
  for (const el of $$('[data-kit-text]')) text(el, get(D, el.dataset.kitText));
  for (const el of $$('[data-kit]')) PAGE[el.dataset.kit]?.(el);
  // 5. empty sections, then links to them
  for (const sec of $$('[data-kit-section]')) {
    if (sec.dataset.kitSection in D && !full(sec.dataset.kitSection)) sec.remove();
  }
  for (const a of $$('a[href^="#"]')) {
    const id = a.getAttribute('href').slice(1);
    const li = a.parentElement;
    if (id && id !== 'top' && !document.getElementById(id))
      (li.matches('li') && li.children.length < 2 ? li : a).remove();
  }
  for (const el of $$('[data-kit=ctas], [data-kit=nav]')) keep(el);
  // 7. page attributes
  root.dataset.kitPhoto = src(at(D.hero.photo, 'src')) ? 1 : 0;
  const title = str(D.site.title) || str(D.hero.name);
  if (title && /^(Portfolio)?$/.test(document.title.trim())) document.title = title;
}

async function run({ fetch: fetchFn = (url) => window.fetch(url) } = {}) {
  const load = (url, as) =>
    new Promise((ok) => ok(fetchFn(url))).then((r) => r?.ok && r[as]()).catch(() => null);
  // 1. the nine stems in parallel (a failed one is {})
  const sprite = load('assets/kit/icons.svg', 'text');
  const files = await Promise.all(Object.keys(D).map((s) => load(`data/${s}.json`, 'json')));
  await parsed;
  safe(build, files, await sprite);
  // 8. ready handlers, 9. the ready flag
  ready = true;
  for (const fn of handlers.splice(0)) safe(fn, D);
  root.dataset.kitReady = '1';
}

const renderers = {};
const handlers = [];
let ready, started;
// after the template's deferred scripts, or on load if injected late
const parsed = new Promise((ok) => {
  if (document.readyState === 'complete') ok();
  addEventListener('DOMContentLoaded', ok);
  addEventListener('load', ok);
});

const kit = {
  data: D,
  start: (opts) => started || (started = run(opts)),
  on: (event, fn) => event === 'ready' && (ready ? safe(fn, D) : handlers.push(fn)),
  render: (stem, fn) => (renderers[stem] = fn),
  esc: (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
  url: href,
  src,
  icon: (name, label) => (iconName(name) ? icon(name, label).outerHTML : ''),
  util: {
    initials: (name) => {
      const w = str(name).split(/\s+/);
      return (w[0].charAt(0) + (w[1] ? w.pop()[0] : '')).toUpperCase();
    },
    firstName: (name) => str(name).split(/\s+/)[0],
    pad: (n, width = 2) => String(n).padStart(width, '0'),
  },
  reducedMotion: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
};
window.kit = kit;

if (!root.hasAttribute('data-kit-manual')) {
  const start = () => kit.start();
  if (document.readyState === 'loading')
    addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
