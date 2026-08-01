(function () {
  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}`);
    return response.json();
  }

  function logoForItem(item) {
    const org = (item.org || '').toLowerCase();
    if (org.includes('diagnostics for the real world')) return 'images/logos/drw.jpg';
    if (org.includes('cancer research uk') || org.includes('cruk')) return 'images/logos/crukci.jpg';
    if (org.includes('university of cambridge')) return 'images/logos/camuni.png';
    return null;
  }

  function createCareerItem(item) {
    const descMarkup = item.desc ? `<div class="career-desc">${item.desc}</div>` : '';
    const tagMarkup = item.tag ? `<span class="career-tag">${item.tag}</span>` : '';
    const logoSrc = item.logo || logoForItem(item);
    const logoMarkup = logoSrc ? `<img class="career-logo" src="${logoSrc}" alt="${item.org} logo">` : '';
    return `
      <div class="career-item reveal">
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
      thesis: 5
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

    return sorted.map((paper) => {
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
        metaHtml += `<span class="__dimensions_badge_embed__" data-doi="${paper.doi}" data-hide-zero-citations="true" data-style="small_circle"></span>`;
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

      const titleHtml = doiUrl ? `<a href="${doiUrl}" target="_blank">${paper.title}</a>` : paper.title;
      const abstractMarkup = paper.abstract ? `<div class="pub-abstract">${paper.abstract}</div>` : '';

      return `
        <div class="pub-item reveal">
          <span class="pub-year">${paper.year}</span>
          <div class="pub-content">
            <div class="pub-title">${titleHtml}</div>
            <div class="pub-authors">${paper.authors}</div>
            ${!isUnderReview ? `<div class="pub-journal">${paper.journal}</div>` : ''}
            ${abstractMarkup}
            ${tags ? `<div class="pub-tags">${tags}</div>` : ''}
          </div>
          <div class="pub-meta">${metaHtml}</div>
        </div>`;
    }).join('');
  }

  function observeReveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal:not(.observed)').forEach((element) => {
      element.classList.add('observed');
      io.observe(element);
    });
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
    const rowHtml = highlighted.map((paper) => {
      const titleHtml = paper.title;
      const imageMarkup = paper.graphicalAbstract ? `<div class="highlight-card-image"><img src="${paper.graphicalAbstract}" alt="graphical abstract"></div>` : '';
      const summaryMarkup = paper.summary ? `<div class="highlight-card-summary">${paper.summary}</div>` : '';
      const authorsText = formatHighlightAuthors(paper.authors);
      const readUrl = paper.preprintDoi ? `https://doi.org/${paper.doi}` : paper.doi ? `https://doi.org/${paper.doi}` : null;
      const readLink = readUrl ? `<a class="highlight-card-link" href="${readUrl}" target="_blank">Read paper</a>` : '';

      return `
        <article class="highlight-card reveal">
          ${imageMarkup}
          <div class="highlight-card-title">${titleHtml}</div>
          <div class="highlight-card-authors">${authorsText} — <em>${paper.journal}</em>, ${paper.year}</div>
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
      observeReveals();

      const published = (papers || []).filter((paper) => paper.status === 'published' || paper.status === 'in_press');
      const heroPubCount = document.getElementById('hero-pub-count');
      const heroCitations = document.getElementById('hero-citations');
      const heroHIndex = document.getElementById('hero-hindex');

      if (heroPubCount) heroPubCount.textContent = published.length;
      if (heroHIndex) heroHIndex.textContent = '—';
      if (heroCitations) heroCitations.textContent = '—';
    } catch (error) {
      console.error(error);
      if (list) {
        list.innerHTML = '<div class="pub-loading">Unable to load publications data.</div>';
      }
    }
  }

  function initEmail() {
    const parts = ['georgedwood', '@', 'live', '.', 'co.uk'];
    const address = parts.join('');
    const contactEmail = document.getElementById('contact-email');
    const heroEmail = document.getElementById('hero-email');
    if (contactEmail) contactEmail.href = 'mailto:' + address;
    if (heroEmail) heroEmail.href = 'mailto:' + address;
  }

  function initHighlightedCarousel() {
    const row = document.querySelector('.highlighted-work-row');
    const frame = document.querySelector('.highlighted-work-frame');
    const prevButton = document.querySelector('.highlight-slide-button-prev');
    const nextButton = document.querySelector('.highlight-slide-button-next');
    if (!row || !frame || !prevButton || !nextButton) return;

    const originalCards = Array.from(row.querySelectorAll('.highlight-card'));
    if (!originalCards.length) return;

    const originalHtml = originalCards.map((card) => card.outerHTML);
    let cards = [];
    let visibleCount = 0;
    let slideWidth = 0;
    let gap = 0;
    let index = 0;
    let isTransitioning = false;
    let hasMovedRight = false;

    function getVisibleCount() {
      if (!slideWidth) return 1;
      const frameWidth = frame.getBoundingClientRect().width;
      return Math.max(1, Math.floor(frameWidth / (slideWidth + gap)));
    }

    function getOffset(slot) {
      return slot * (slideWidth + gap);
    }

    function buildCarousel() {
      row.innerHTML = '';
      const prefix = originalHtml.slice(-visibleCount);
      const suffix = originalHtml.slice(0, visibleCount);
      prefix.forEach((html) => row.insertAdjacentHTML('beforeend', html));
      originalHtml.forEach((html) => row.insertAdjacentHTML('beforeend', html));
      suffix.forEach((html) => row.insertAdjacentHTML('beforeend', html));
      cards = Array.from(row.querySelectorAll('.highlight-card'));
      index = visibleCount;
      setPosition(index, false);
    }

    function setPosition(slot, animate = true) {
      row.style.transition = animate ? 'transform 0.45s ease' : 'none';
      row.style.transform = `translateX(-${getOffset(slot)}px)`;
      if (!animate) {
        row.getBoundingClientRect();
        row.style.transition = 'transform 0.45s ease';
      }
    }

    function updateArrowVisibility() {
      const allVisible = originalHtml.length <= visibleCount;
      nextButton.disabled = allVisible;
      nextButton.style.opacity = allVisible ? '0' : '1';
      nextButton.style.visibility = allVisible ? 'hidden' : 'visible';

      if (allVisible) {
        prevButton.disabled = true;
        prevButton.style.opacity = '0';
        prevButton.style.visibility = 'hidden';
      } else if (hasMovedRight) {
        prevButton.disabled = false;
        prevButton.style.opacity = '1';
        prevButton.style.visibility = 'visible';
      } else {
        prevButton.disabled = true;
        prevButton.style.opacity = '0';
        prevButton.style.visibility = 'hidden';
      }
    }

    function refreshSizes() {
      const sampleCard = originalCards[0];
      if (!sampleCard) return;
      slideWidth = sampleCard.getBoundingClientRect().width;
      gap = parseFloat(getComputedStyle(row).gap) || 0;
      const newVisibleCount = getVisibleCount();
      if (newVisibleCount !== visibleCount) {
        visibleCount = newVisibleCount;
        buildCarousel();
      } else {
        setPosition(index, false);
      }
      updateArrowVisibility();
    }

    function jumpToSlot(slot) {
      index = slot;
      setPosition(index, false);
    }

    function moveSlides(delta) {
      if (isTransitioning) return;
      if (originalHtml.length <= visibleCount) return;
      isTransitioning = true;
      index += delta;
      setPosition(index);
    }

    row.addEventListener('transitionend', () => {
      if (!isTransitioning) return;
      isTransitioning = false;
      const total = originalHtml.length;
      if (index >= total + visibleCount) {
        jumpToSlot(visibleCount);
      } else if (index < visibleCount) {
        jumpToSlot(total + index);
      }
      updateArrowVisibility();
    });

    let touchStartX = null;
    let touchStartY = null;
    let touchCurrentX = null;
    let touchCurrentY = null;
    let touchDragging = false;

    function handleTouchStart(event) {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchCurrentX = touchStartX;
      touchCurrentY = touchStartY;
      touchDragging = false;
    }

function handleTouchMove(event) {
  if (touchStartX === null || touchStartY === null || event.touches.length !== 1) return;
  touchCurrentX = event.touches[0].clientX;
  touchCurrentY = event.touches[0].clientY;

  const deltaX = touchCurrentX - touchStartX;
  const deltaY = touchCurrentY - touchStartY;

  if (!touchDragging) {
    if (Math.abs(deltaX) > 24 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
      touchDragging = true;
    } else if (Math.abs(deltaY) > 10) {
      // it's a vertical scroll — stop checking, let the browser handle it
      touchStartX = null;
      touchStartY = null;
      return;
    }
  }

  if (touchDragging) {
    event.preventDefault();
  }
}

    function handleTouchEnd() {
      if (touchStartX === null || touchCurrentX === null) {
        touchStartX = null;
        touchStartY = null;
        touchCurrentX = null;
        touchCurrentY = null;
        touchDragging = false;
        return;
      }

      const deltaX = touchStartX - touchCurrentX;
      const threshold = 50;
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          hasMovedRight = true;
          moveSlides(1);
        } else {
          moveSlides(-1);
        }
        updateArrowVisibility();
      }

      touchStartX = null;
      touchStartY = null;
      touchCurrentX = null;
      touchCurrentY = null;
      touchDragging = false;
    }

    const touchTarget = frame || row;
    touchTarget.addEventListener('touchstart', handleTouchStart, { passive: false });
    touchTarget.addEventListener('touchmove', handleTouchMove, { passive: false });
    touchTarget.addEventListener('touchend', handleTouchEnd);
    touchTarget.addEventListener('touchcancel', handleTouchEnd);

    prevButton.addEventListener('click', () => moveSlides(-1));
    nextButton.addEventListener('click', () => {
      hasMovedRight = true;
      moveSlides(1);
      updateArrowVisibility();
    });

    refreshSizes();
    window.addEventListener('resize', refreshSizes);
  }

  function initHamburger() {
    const button = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (!button || !menu) return;

    button.addEventListener('click', () => {
      const isOpen = button.classList.toggle('open');
      menu.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  function closeMenu() {
    const button = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (button) button.classList.remove('open');
    if (menu) menu.classList.remove('open');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  function initNavColour() {
    const root = document.documentElement;
    const targets = [
      { element: document.querySelector('header'), dark: true },
      { element: document.querySelector('#career'), dark: false },
      { element: document.querySelector('#publications'), dark: false },
      { element: document.querySelector('#contact'), dark: false },
      { element: document.querySelector('footer'), dark: true }
    ].filter((target) => target.element);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const isDark = targets.find((target) => target.element === entry.target)?.dark ?? true;
          root.style.setProperty('--nav-fg', isDark ? 'var(--mist)' : 'var(--forest)');
          root.style.setProperty('--nav-bg', isDark ? 'rgba(26,46,38,0.82)' : 'rgba(245,242,238,0.82)');
        }
      });
    }, {
      rootMargin: '-80px 0px -80% 0px',
      threshold: 0
    });

    targets.forEach((target) => observer.observe(target.element));
  }

  document.addEventListener('DOMContentLoaded', () => {
    observeReveals();
    init();
    initNavColour();
    initHamburger();
    initEmail();
  });

  window.closeMenu = closeMenu;
})();
