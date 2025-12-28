/*
  Solitary Fitness — UX helpers
  - Injects consistent header navigation & footer socials
  - Wraps consecutive images into responsive galleries
  - Adds click-to-zoom modal for exercise images
  - Adds previous/next day navigation automatically
*/

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function getPathConfig() {
    // Heuristic: pages/* include ../css/styles.css, index uses css/styles.css
    const isInPages = !!document.querySelector('link[href^="../css/"]');
    const indexHref = isInPages ? '../index.html' : 'index.html';
    const pagesBase = isInPages ? '' : 'pages/';
    return { isInPages, indexHref, pagesBase };
  }

  function getPageLabel() {
    const h1 = $('header h1');
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();
    return (document.title || 'Solitary Fitness').replace(' | Solitary Fitness', '').trim();
  }

  function injectSkipLink() {
    if ($('.skip-link')) return;
    const a = document.createElement('a');
    a.className = 'skip-link';
    a.href = '#main';
    a.textContent = 'Saltar al contenido';
    document.body.prepend(a);

    const main = $('main');
    if (main && !main.id) main.id = 'main';
  }

  function ensureHeaderNav() {
    const header = $('header');
    if (!header) return;

    // Wrap all header content into .header-inner for consistent layout
    let inner = $('.header-inner', header);
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'header-inner';

      while (header.firstChild) {
        inner.appendChild(header.firstChild);
      }
      header.appendChild(inner);
    }

    const { indexHref, pagesBase } = getPathConfig();

    // Build left title block
    let title = $('.site-title', inner);
    if (!title) {
      title = document.createElement('div');
      title.className = 'site-title';

      const brand = document.createElement('a');
      brand.href = indexHref;
      brand.className = 'brand';
      brand.textContent = 'Solitary Fitness';

      const page = document.createElement('span');
      page.className = 'page';
      page.textContent = getPageLabel();

      title.appendChild(brand);
      title.appendChild(page);

      inner.insertBefore(title, inner.firstChild);

      // Keep existing h1 for semantics (screen readers), but hide visually
      const h1 = $('h1', inner);
      if (h1) h1.classList.add('visually-hidden');
    }

    // Build nav
    let nav = $('nav.site-nav', inner);
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'site-nav';

      const links = [
        { label: 'Inicio', href: indexHref },
        { label: 'Programa', href: `${pagesBase}program.html` },
        { label: 'Día 1', href: `${pagesBase}day01.html` },
        { label: 'Respiración', href: `${pagesBase}breathing.html` },
        { label: 'Calentamiento', href: `${pagesBase}warmup.html` },
      ];

      links.forEach(({ label, href }) => {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = label;
        nav.appendChild(a);
      });

      inner.appendChild(nav);
    }

    // Remove legacy navs (e.g., <nav><ul>...) to avoid duplicate menus
    $$('nav', inner).forEach(n => {
      if (!n.classList.contains('site-nav')) n.remove();
    });

    // Active link highlight
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('nav.site-nav a', inner).forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
      if (href && href === current) a.classList.add('active');
    });
  }

  function wrapConsecutiveImages() {
    const main = $('main');
    if (!main) return;

    const sections = $$('section', main);
    sections.forEach(section => {
      if (section.dataset.imgGrouped === '1') return;
      section.dataset.imgGrouped = '1';

      const nodes = Array.from(section.childNodes);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Find a run of IMG elements (allowing whitespace text nodes between)
        if (node && node.nodeType === 1 && node.tagName === 'IMG') {
          const imgs = [];
          let j = i;

          while (j < nodes.length) {
            const n = nodes[j];
            if (n.nodeType === 1 && n.tagName === 'IMG') {
              imgs.push(n);
              j++;
              continue;
            }
            if (n.nodeType === 3 && !n.textContent.trim()) {
              j++;
              continue;
            }
            break;
          }

          const wrapper = document.createElement('div');
          wrapper.className = 'img-group';

          // Insert wrapper where first image used to be (before moving images)
          const anchor = nodes[i];
          section.insertBefore(wrapper, anchor);

          imgs.forEach(img => {
            img.classList.add('zoomable');
            wrapper.appendChild(img);
          });

          // Continue after the run
          i = j - 1;
        }
      }

      // Mark any remaining images inside the section as zoomable
      $$('img', section).forEach(img => img.classList.add('zoomable'));
    });
  }

  function setupImageModal() {
    if ($('.img-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'img-modal';
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="modal-bar">
        <div class="modal-title"></div>
        <button class="close" type="button" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <img alt="" />
      </div>
    `;

    document.body.appendChild(modal);

    const imgEl = $('img', modal);
    const titleEl = $('.modal-title', modal);
    const closeBtn = $('.close', modal);

    let lastFocus = null;

    function openModal(src, alt) {
      lastFocus = document.activeElement;
      imgEl.src = src;
      imgEl.alt = alt || '';
      titleEl.textContent = alt || 'Imagen';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      imgEl.src = '';
      document.body.style.overflow = '';
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      // click background or the image closes it
      if (e.target === modal || e.target === imgEl) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    document.addEventListener('click', (e) => {
      const img = e.target.closest('img.zoomable');
      if (!img) return;
      // ignore images without a usable src
      const src = img.currentSrc || img.getAttribute('src');
      if (!src) return;
      e.preventDefault();
      openModal(src, img.getAttribute('alt') || '');
    }, true);
  }

  function addDayNavigation() {
    const main = $('main');
    if (!main) return;

    // Try to detect day number from title or first heading
    const label = (document.title || '') + ' ' + getPageLabel();
    const m = label.match(/D[íi]a\s*(\d{1,2})/i);
    if (!m) return;

    const day = parseInt(m[1], 10);
    if (!Number.isFinite(day)) return;

    const { pagesBase } = getPathConfig();

    const clampDay = (d) => Math.min(28, Math.max(1, d));
    const toHref = (d) => `${pagesBase}day${String(clampDay(d)).padStart(2, '0')}.html`;

    const nav = document.createElement('div');
    nav.className = 'day-nav';

    const left = document.createElement('div');
    left.className = 'left';

    const right = document.createElement('div');
    right.className = 'right';

    const program = document.createElement('a');
    program.className = 'btn secondary';
    program.href = `${pagesBase}program.html`;
    program.textContent = '📅 Programa';

    left.appendChild(program);

    if (day > 1) {
      const prev = document.createElement('a');
      prev.className = 'btn';
      prev.href = toHref(day - 1);
      prev.textContent = `← Día ${day - 1}`;
      right.appendChild(prev);
    }

    if (day < 28) {
      const next = document.createElement('a');
      next.className = 'btn';
      next.href = toHref(day + 1);
      next.textContent = `Día ${day + 1} →`;
      right.appendChild(next);
    }

    nav.appendChild(left);
    nav.appendChild(right);

    // Put nav right after the intro section (if present), else on top of main
    const intro = $('.day-intro', main);
    if (intro && intro.parentNode === main) {
      intro.insertAdjacentElement('afterend', nav);
    } else {
      main.prepend(nav);
    }
  }

  function ensureFooterSocials() {
    // Use existing footer if present; otherwise create one.
    let footer = $('footer');
    if (!footer) {
      footer = document.createElement('footer');
      document.body.appendChild(footer);
    }

    footer.classList.add('site-footer');

    let inner = $('.footer-inner', footer);
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'footer-inner';
      while (footer.firstChild) inner.appendChild(footer.firstChild);
      footer.appendChild(inner);
    }

    if (!$('.socials', footer)) {
      const socials = document.createElement('section');
      socials.className = 'socials';
      socials.innerHTML = `
        <h2>Mis redes sociales y mensajeros</h2>
        <div class="socials-list">
          <a href="#" aria-label="Facebook">📘 Facebook</a>
          <a href="#" aria-label="Instagram">📸 Instagram</a>
          <a href="#" aria-label="X">𝕏 X</a>
          <a href="#" aria-label="TikTok">🎵 TikTok</a>
          <a href="#" aria-label="YouTube">▶️ YouTube</a>
          <a href="#" aria-label="WhatsApp">💬 WhatsApp (chat)</a>
          <a href="#" aria-label="Telegram">✈️ Telegram (chat)</a>
        </div>
        <div class="footer-note">(Por ahora hay enlaces de ejemplo. Luego puedes reemplazarlos por tus links reales.)</div>
      `;
      inner.prepend(socials);
    }

    if (!$('.footer-note.global', footer)) {
      const note = document.createElement('div');
      note.className = 'footer-note global';
      note.textContent = `© ${new Date().getFullYear()} Solitary Fitness`;
      inner.appendChild(note);
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    injectSkipLink();
    ensureHeaderNav();
    wrapConsecutiveImages();
    setupImageModal();
    addDayNavigation();
    ensureFooterSocials();
  });
})();
