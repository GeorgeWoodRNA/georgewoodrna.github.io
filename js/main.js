(function () {
  const OA = 'https://api.openalex.org/works';
  const MAIL = 'georgedwood@live.co.uk';

  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url}`);
    return response.json();
  }

  async function fetchCitations(doi) {
    if (!doi) return null;
    try {
      const response = await fetch(`${OA}/doi:${doi}?mailto=${MAIL}&select=cited_by_count`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const data = await response.json();
      return typeof data.cited_by_count === 'number' ? data.cited_by_count : null;
    } catch (error) {
      return null;
    }
  }

  function createCareerItem(item) {
    const descMarkup = item.desc ? `<div class="career-desc">${item.desc}</div>` : '';
    const tagMarkup = item.tag ? `<span class="career-tag">${item.tag}</span>` : '';
    return `
      <div class="career-item reveal">
        <span class="career-dates">${item.dates}</span>
        <div>
          <div class="career-role">${item.role}</div>
          <div class="career-org">${item.org}</div>
          ${descMarkup}
          ${tagMarkup}
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
      const pubCite = citationMap[paper.doi] ?? null;
      const preCite = citationMap[paper.preprintDoi] ?? null;
      const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : null;
      const preprintUrl = paper.preprintDoi ? `https://doi.org/${paper.preprintDoi}` : null;
      const status = paper.status || 'published';
      const isUnderReview = status === 'under_review';
      const isInPress = status === 'in_press';
      const isAccepted = status === 'accepted';
      const isThesis = status === 'thesis';
      const isPublished = status === 'published' || isInPress || isAccepted;

      let metaHtml = '';
      if (isUnderReview) {
        if (preCite !== null && preCite > 0) {
          metaHtml = `<a href="${preprintUrl}" target="_blank" class="pub-cite-pre">${preCite} preprint citation${preCite !== 1 ? 's' : ''}</a>`;
        }
      } else if (isPublished) {
        if (pubCite !== null && pubCite > 0) {
          const link = doiUrl ? `href="${doiUrl}" target="_blank"` : '';
          metaHtml += `<a ${link} class="pub-cite">${pubCite} citation${pubCite !== 1 ? 's' : ''}</a>`;
        }
        if (preCite !== null && preCite > 0) {
          metaHtml += `<a href="${preprintUrl}" target="_blank" class="pub-cite-pre">${preCite} preprint citation${preCite !== 1 ? 's' : ''}</a>`;
        }
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

      return `
        <div class="pub-item reveal">
          <span class="pub-year">${paper.year}</span>
          <div class="pub-content">
            <div class="pub-title">${titleHtml}</div>
            <div class="pub-authors">${paper.authors}</div>
            ${!isUnderReview ? `<div class="pub-journal">${paper.journal}</div>` : ''}
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

  async function init() {
    const list = document.getElementById('pub-list');

    try {
      const [workExperience, papers] = await Promise.all([
        loadJson('data/work-experience.json'),
        loadJson('data/papers.json')
      ]);

      renderExperience(workExperience.experience || [], workExperience.education || []);

      list.innerHTML = renderPapers(papers || [], {});
      observeReveals();

      const allDois = (papers || []).flatMap((paper) => [paper.doi, paper.preprintDoi].filter(Boolean));
      const results = await Promise.all(allDois.map(async (doi) => [doi, await fetchCitations(doi)]));
      const citationMap = Object.fromEntries(results.filter(([, value]) => value !== null));

      list.innerHTML = renderPapers(papers || [], citationMap);
      observeReveals();

      const published = (papers || []).filter((paper) => paper.status === 'published' || paper.status === 'in_press');
      const combinedCites = (papers || []).map((paper) => (citationMap[paper.doi] || 0) + (citationMap[paper.preprintDoi] || 0))
        .sort((a, b) => b - a);
      const hIndex = combinedCites.reduce((score, count, index) => (count >= index + 1 ? index + 1 : score), 0);
      const totalCombined = (papers || []).reduce((sum, paper) => sum + (citationMap[paper.doi] || 0) + (citationMap[paper.preprintDoi] || 0), 0);

      const heroPubCount = document.getElementById('hero-pub-count');
      const heroCitations = document.getElementById('hero-citations');
      const heroHIndex = document.getElementById('hero-hindex');

      if (heroPubCount) heroPubCount.textContent = published.length;
      if (heroHIndex) heroHIndex.textContent = hIndex || '—';
      if (heroCitations) heroCitations.textContent = totalCombined > 0 ? totalCombined : '—';
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
    const element = document.getElementById('contact-email');
    if (element) element.href = 'mailto:' + address;
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
      { element: document.querySelector('#techniques'), dark: true },
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
