(function () {
  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}`);
    return response.json();
  }

  function logoForItem(item) {
    const org = (item.org || '').toLowerCase();
    if (org.includes('diagnostics for the real world')) return 'images/logos/drw.png';
    if (org.includes('cancer research uk') || org.includes('cruk')) return 'images/logos/crukci.png';
    if (org.includes('university of cambridge')) return 'images/logos/camuni.png';
    return null;
  }

  function createCareerItem(item) {
    const descMarkup = item.desc ? `<div class="career-desc">${item.desc}</div>` : '';
    const tagMarkup = item.tag ? `<span class="career-tag">${item.tag}</span>` : '';
    const logoSrc = item.logo || logoForItem(item);
    const logoMarkup = logoSrc ? `<img class="career-logo" src="${logoSrc}" alt="${item.org} logo" loading="lazy" decoding="async">` : '';
    return `
      <div class="career-item">
        <span class="career-dates">${item.dates}</span>
        <div class="career-entry">
          ${logoMarkup}
          <div>
            <div class="career-role">${item.role}</div>
            <div class="career-org">${item.org}</div>
            ${descMarkup}
            ${tagMarkup}
          </div>
        </div>
      </div>`;
  }

  function renderExperience(experience, education) {
    const expList = document.getElementById('experience-list');
    const eduList = document.getElementById('education-list');

    if (expList) {
      expList.innerHTML = (experience || []).map(createCareerItem).join('');
    }

    if (eduList) {
      eduList.innerHTML = (education || []).map(createCareerItem).join('');
    }
  }

  function renderPapers(papers, citationMap) {
    const statusRank = {
      in_press: 0,
      published: 1,
      accepted: 2,
      under_review: 3,
      preprint: 4,
      thesis: 1   // sort with published work, by year
    };

    const getStatusRank = (paper) => {
      const status = (paper.status || 'published').toLowerCase();
      return statusRank[status] ?? 99;
    };

    const getYearValue = (paper) => {
      if (typeof paper.year === 'number') return paper.year;
      if (typeof paper.year === 'string') {
        const match = paper.year.match(/(\d{4})/);
        return match ? Number(match[1]) : 0;
      }
      return 0;
    };

    const sorted = [...papers].sort((a, b) => {
      const statusA = getStatusRank(a);
      const statusB = getStatusRank(b);
      if (statusA !== statusB) return statusA - statusB;

      const yearA = getYearValue(a);
      const yearB = getYearValue(b);
      if (yearB !== yearA) return yearB - yearA;
      return (b.firstAuthor ? 1 : 0) - (a.firstAuthor ? 1 : 0);
    });

    return sorted.map((paper, index) => {
      const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : null;
      const preprintUrl = paper.preprintDoi ? `https://doi.org/${paper.preprintDoi}` : null;
      const status = paper.status || 'published';
      const isUnderReview = status === 'under_review';
      const isInPress = status === 'in_press';
      const isAccepted = status === 'accepted';
      const isThesis = status === 'thesis';
      const isPublished = status === 'published' || isInPress || isAccepted;

      let metaHtml = '';
      if (paper.doi) {
        metaHtml += `<span class="pub-badge pub-badge-wide"><span class="__dimensions_badge_embed__" data-doi="${paper.doi}" data-hide-zero-citations="true" data-style="small_circle"></span></span>`;
      }
      if (isUnderReview && preprintUrl) {
        metaHtml += `<a href="${preprintUrl}" target="_blank" class="pub-cite-pre">Preprint</a>`;
      }

      let tags = '';
      if (paper.firstAuthor) tags += '<span class="pub-tag tag-first">First author</span>';
      if (isUnderReview) {
        tags += '<span class="pub-tag tag-review">Under review</span>';
        if (preprintUrl) tags += `<a href="${preprintUrl}" target="_blank" class="pub-tag tag-preprint">Link to preprint</a>`;
      } else {
        if (isInPress) {
          tags += '<span class="pub-tag tag-in-press">In press</span>';
        }
        if (isAccepted) {
          tags += '<span class="pub-tag tag-accepted">Accepted</span>';
        }
        if (isThesis) {
          tags += '<span class="pub-tag tag-first">Thesis</span>';
        }
        if (preprintUrl && (status === 'published' || isAccepted || isInPress)) {
          tags += `<a href="${preprintUrl}" target="_blank" class="pub-tag tag-preprint">Link to preprint</a>`;
        }
      }

      // Mobile: compact "Citations | n" pill sits with the tags; CSS shows it or the round badge
      if (paper.doi) {
        tags += `<span class="pub-badge pub-badge-compact"><span class="__dimensions_badge_embed__" data-doi="${paper.doi}" data-hide-zero-citations="true" data-style="small_rectangle" data-legend="never"></span></span>`;
      }

      // last in the row, directly above the abstract it opens
      const abstractId = `abstract-${index}`;
      if (paper.abstract) {
        tags += `<button class="pub-tag tag-abstract" type="button" aria-expanded="false" aria-controls="${abstractId}">Abstract</button>`;
      }

      const titleHtml = doiUrl ? `<a href="${doiUrl}" target="_blank">${paper.title}</a>` : paper.title;
      const abstractMarkup = paper.abstract ? `<div class="pub-abstract" id="${abstractId}">${paper.abstract}</div>` : '';

      return `
        <div class="pub-item${paper.abstract ? ' has-abstract' : ''}">
          <span class="pub-year">${paper.year}</span>
          <div class="pub-content">
            <div class="pub-title">${titleHtml}</div>
            <div class="pub-authors">${paper.authors}</div>
            ${!isUnderReview ? `<div class="pub-journal">${paper.journal}</div>` : ''}
            ${tags ? `<div class="pub-tags">${tags}</div>` : ''}
            ${abstractMarkup}
          </div>
          <div class="pub-meta">${metaHtml}</div>
        </div>`;
    }).join('');
  }

  function formatHighlightAuthors(authorsHtml) {
    if (!authorsHtml) return '';
    const authors = authorsHtml.split(/,\s*/).map((author) => author.trim()).filter(Boolean);
    if (authors.length <= 5) return authors.join(', ');

    const authorText = authorsHtml.replace(/<[^>]+>/g, '');
    const georgeStarred = /george\s+wood\*/i.test(authorText);
    if (georgeStarred) {
      const starredAuthors = authors.filter((author) => author.includes('*'));
      if (!starredAuthors.length) return authors.join(', ');
      const hasExtra = starredAuthors.length < authors.length;
      return `${starredAuthors.join(', ')}${hasExtra ? ', et al.' : ''}`;
    }

    const georgeIndex = authors.findIndex((author) => /george\s+wood/i.test(author.replace(/<[^>]+>/g, '')));
    const cutoff = georgeIndex >= 0 ? Math.min(georgeIndex + 1, 5) : 5;
    const truncated = authors.slice(0, cutoff).join(', ');
    return `${truncated}, et al.`;
  }

  function renderHighlightedWork(papers) {
    const row = document.querySelector('.highlighted-work-row');
    if (!row) return;

    const highlighted = (papers || []).filter((paper) => Array.isArray(paper.tags) && paper.tags.includes('highlighted'));
    const rowHtml = highlighted.map((paper, index) => {
      const titleHtml = paper.title;
      // the first three cards show on load (desktop hero); load the rest lazily
      const loading = index < 3 ? '' : ' loading="lazy"';
      const imageMarkup = paper.graphicalAbstract ? `<div class="highlight-card-image"><img src="${paper.graphicalAbstract}" alt="graphical abstract" decoding="async"${loading}></div>` : '';
      const summaryMarkup = paper.summary ? `<div class="highlight-card-summary">${paper.summary}</div>` : '';
      const authorsText = formatHighlightAuthors(paper.authors);
      const readUrl = paper.preprintDoi ? `https://doi.org/${paper.doi}` : paper.doi ? `https://doi.org/${paper.doi}` : null;
      const readLink = readUrl ? `<a class="highlight-card-link" href="${readUrl}" target="_blank">Read paper</a>` : '';

      return `
        <article class="highlight-card swiper-slide">
          ${imageMarkup}
          <div class="highlight-card-title">${titleHtml}</div>
          <div class="highlight-card-authors">${authorsText}<br><em>${paper.journal}</em>, ${paper.year}</div>
          ${summaryMarkup}
          ${readLink}
        </article>`;
    }).join('');

    row.innerHTML = rowHtml;
    const prevButton = document.querySelector('.highlight-slide-button-prev');
    const nextButton = document.querySelector('.highlight-slide-button-next');
    if (prevButton && nextButton) {
      const empty = highlighted.length === 0;
      prevButton.style.visibility = empty ? 'hidden' : 'visible';
      nextButton.style.visibility = empty ? 'hidden' : 'visible';
      prevButton.disabled = empty;
      nextButton.disabled = empty;
    }
  }

  async function init() {
    const list = document.getElementById('pub-list');

    try {
      const [workExperience, papers] = await Promise.all([
        loadJson('data/work-experience.json'),
        loadJson('data/papers.json')
      ]);

      renderExperience(workExperience.experience || [], workExperience.education || []);
      renderHighlightedWork(papers || []);
      initHighlightedCarousel();

      list.innerHTML = renderPapers(papers || []);
      // content changed section heights: re-check which section is under the nav
      window.dispatchEvent(new Event('resize'));
      initPubAbstracts(list);
      loadDimensionsWhenNear(list);
    } catch (error) {
      console.error(error);
      if (list) {
        list.innerHTML = '<div class="pub-loading">Unable to load publications data.</div>';
      }
    }
  }

  // Abstracts preview on hover (desktop) and stay open once an item is
  // clicked or tapped; clicking again closes. The "Abstract" button is the
  // accessible control (aria-expanded; keyboard via Enter/Space). Each item's
  // --abs-h holds its abstract's full height so opening never cuts text off.
  function initPubAbstracts(list) {
    const items = [...list.querySelectorAll('.pub-item.has-abstract')];
    if (!items.length) return;

    let queued = false;
    const measure = () => {
      queued = false;
      items.forEach((item) => {
        const abstract = item.querySelector('.pub-abstract');
        item.style.setProperty('--abs-h', `${abstract.scrollHeight}px`);
      });
    };
    const queueMeasure = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener('resize', queueMeasure);
    if (document.fonts) document.fonts.ready.then(queueMeasure);

    list.addEventListener('click', (event) => {
      const item = event.target.closest('.pub-item.has-abstract');
      if (!item || event.target.closest('a, .pub-badge')) return;
      const viaButton = event.target.closest('.tag-abstract');
      if (!viaButton && String(window.getSelection())) return;   // selecting text, not toggling
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      item.querySelector('.tag-abstract').setAttribute('aria-expanded', String(open));
      // closing while the pointer is still over the item shouldn't fall back to the hover preview
      item.classList.toggle('dismissed', !open);
    });

    items.forEach((item) => {
      item.addEventListener('mouseleave', () => item.classList.remove('dismissed'));
    });
  }

  // Dimensions' badge.js (~0.5 MB) scans the page for badge placeholders once,
  // when it loads. Load it only after the publications are rendered, and only
  // as they approach the viewport, so the placeholders always exist by then.
  function loadDimensionsWhenNear(target) {
    let started = false;
    const load = () => {
      if (started) return;
      started = true;
      if (window.__dimensions_embed_installed__) {
        window.__dimensions_embed.addBadges();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://badge.dimensions.ai/badge.js';
      script.async = true;
      document.head.appendChild(script);
    };

    if (!('IntersectionObserver' in window) || !target) {
      load();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: '800px 0px' });
    observer.observe(target);
  }

  function initEmail() {
    const parts = ['georgedwood', '@', 'live', '.', 'co.uk'];
    const address = parts.join('');
    const contactEmail = document.getElementById('contact-email');
    if (contactEmail) contactEmail.href = 'mailto:' + address;
  }

  function initHighlightedCarousel() {
    if (typeof Swiper === 'undefined') return;

    const highlighted = document.querySelectorAll('.highlight-card');
    const prevButton = document.querySelector('.highlight-slide-button-prev');
    const nextButton = document.querySelector('.highlight-slide-button-next');
    const empty = highlighted.length === 0;

    if (prevButton && nextButton) {
      prevButton.style.visibility = empty ? 'hidden' : 'visible';
      nextButton.style.visibility = empty ? 'hidden' : 'visible';
      prevButton.disabled = empty;
      nextButton.disabled = empty;
    }

    // The row bleeds past the content column to the screen edge. Give Swiper
    // enough trailing space that its last stop puts a card flush with the
    // column's left edge, instead of pinning the last card to the screen edge.
    const alignEnd = (swiper) => {
      const sizes = swiper.slidesSizesGrid;
      const grid = swiper.slidesGrid;
      const n = sizes.length;
      if (!n) return;
      const bleed = -parseFloat(getComputedStyle(swiper.el).marginRight) || 0;
      const column = swiper.size - bleed;
      const end = grid[n - 1] + sizes[n - 1];
      let k = n - 1;
      while (k > 0 && end - grid[k - 1] <= column + 1) k--;
      const offset = Math.max(0, Math.round(grid[k] + swiper.size - end));
      if (offset !== swiper.params.slidesOffsetAfter) {
        swiper.params.slidesOffsetAfter = offset;
        swiper.update();
      }
    };

    new Swiper('.highlighted-work-frame', {
      loop: true,
      on: {
        init: (swiper) => { if (!swiper.params.loop) alignEnd(swiper); },
        resize: (swiper) => { if (!swiper.params.loop) alignEnd(swiper); },
      },
      slidesPerView: 'auto',
      spaceBetween: 20,
      mousewheel: {
        forceToAxis: true,
        sensitivity: 10,
        },
      grabCursor: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      a11y: true,
      breakpoints: {
        0: {
          spaceBetween: 10,
        },
        768: {
          spaceBetween: 15
        },
        900: {
          spaceBetween: 20
        }
      }
    });
  }

  function setMenu(open, { restoreFocus = false } = {}) {
    const button = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (!button || !menu) return;
    button.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      const first = menu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else if (restoreFocus) {
      button.focus({ preventScroll: true });
    }
  }

  function initHamburger() {
    const button = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (!button || !menu) return;

    button.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('open')) setMenu(false, { restoreFocus: true });
    });
  }

  // Colour the nav to match whichever section sits directly under its bottom
  // edge. Checked on scroll/resize (one rAF per frame) rather than with an
  // IntersectionObserver, whose batched entries could leave the wrong colour
  // when two sections met under the nav.
  function initNavColour() {
    const root = document.documentElement;
    const nav = document.querySelector('nav');
    const sections = [
      { element: document.querySelector('header'), dark: true },
      { element: document.querySelector('#career'), dark: false },
      { element: document.querySelector('#publications'), dark: false },
      { element: document.querySelector('#contact'), dark: false }
    ].filter((section) => section.element);
    if (!nav || !sections.length) return;

    let current = null;
    let queued = false;

    const update = () => {
      queued = false;
      const probe = nav.getBoundingClientRect().bottom;
      const hit = sections.find(({ element }) => {
        const rect = element.getBoundingClientRect();
        return rect.top <= probe && rect.bottom > probe;
      });
      const dark = hit ? hit.dark : true;
      if (dark === current) return;
      current = dark;
      nav.classList.toggle('past-hero', !dark);
      root.style.setProperty('--nav-fg', dark ? 'var(--mist)' : 'var(--forest)');
      root.style.setProperty('--nav-bg', dark ? 'var(--ink)' : 'var(--paper)');
    };

    const queue = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    initNavColour();
    initHamburger();
    initEmail();
  });

})();
