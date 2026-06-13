/* Café Noon — premium UI interactions (no framework) */

(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // Smooth scroll for anchor links
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"], a[data-scroll="#"]');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href || href === '#') return;

    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // close mobile drawer if open
    const drawer = $('[data-drawer]');
    if (drawer && drawer.getAttribute('data-open') === 'true') closeDrawer();
  });

  // Typing effect
  const typingEl = $('[data-typing]');
  if (typingEl) {
    const fullText = typingEl.textContent.trim();
    typingEl.textContent = '';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduce) {
      let i = 0;
      const tick = () => {
        typingEl.textContent = fullText.slice(0, i);
        i++;
        if (i <= fullText.length) {
          setTimeout(tick, 55);
        } else {
          // caret visual handled in CSS via pseudo-element
          typingEl.classList.add('typing-ready');
        }
      };
      typingEl.classList.add('typing-caret');
      tick();
    } else {
      typingEl.textContent = fullText;
    }
  }

  // Intersection observer fade-in
  const io = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          ent.target.classList.add('revealed');
          if (ent.target.dataset.fade !== 'stay') io.unobserve(ent.target);
        }
      }
    },
    { threshold: 0.12 }
  );
  $$('[data-fade]').forEach((el) => io.observe(el));

  // Parallax on elements with data-parallax
  const parallaxEls = $$('[data-parallax]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const onScroll = () => {
      const y = window.scrollY;
      for (const el of parallaxEls) {
        const rect = el.getBoundingClientRect();
        const t = (rect.top + rect.height / 2) / window.innerHeight;
        const delta = (0.5 - t) * 26; // tasteful
        el.style.transform = `translateY(${delta}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile drawer
  const drawer = $('[data-drawer]');
  const burgerOpen = $('[data-burger]');
  const burgerClose = $('[data-burger-close]');
  if (drawer && burgerOpen) {
    const openDrawer = () => {
      burgerOpen.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('data-open', 'true');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    const closeDrawer = () => {
      burgerOpen.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('data-open', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    window.closeDrawer = closeDrawer;
    burgerOpen.addEventListener('click', openDrawer);
    if (burgerClose) burgerClose.addEventListener('click', closeDrawer);
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) closeDrawer();
    });
  }

  // Hero parallax zoom media
  const heroMedia = $('[data-parallax-zoom]');
  if (heroMedia && !reduceMotion) {
    const onHero = () => {
      const sc = window.scrollY;
      const z = 1.04 + Math.min(sc / 1200, 0.05);
      heroMedia.style.transform = `scale(${z})`;
    };
    window.addEventListener('scroll', onHero, { passive: true });
    onHero();
  }

  // Steam: subtle float using CSS already; JS not required.

  // Menu tabs + order dock (add-to-order)
  const tabRow = $('.menu-tabs [role="tablist"]') || $('.menu-tabs');
  const menuPanels = $$('[data-panel]');

  const setActivePanel = (key) => {
    // tabs
    $$('.tab', tabRow).forEach((t) => {
      const isActive = t.dataset.tab === key;
      t.classList.toggle('is-active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });
    // panels
    $$('[data-menu-grid] .menu-panel').forEach((p) => {
      p.classList.toggle('is-active', p.dataset.panel === key);
    });
  };

  // menu tab click
  $$('.menu-tabs [data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setActivePanel(btn.dataset.tab));
  });

  const order = {
    items: new Map(), // key: item name, value: {name, price}
  };

  const orderCountEl = $('[data-order-count]');
  const orderListModal = $('[data-order-modal]');
  const orderList = $('[data-order-list]');
  const orderClose = $('[data-order-close]');
  const orderClear = $('[data-order-clear]');
  const viewOrderBtn = $('#viewOrder');

  const formatINR = (n) => `₹${n}`;

  const addToOrder = (card) => {
    const title = $('.menu-title', card)?.textContent?.trim();
    const priceText = $('.menu-price', card)?.textContent?.trim();
    const price = Number(priceText?.replace(/[₹\s]/g, ''));

    if (!title || !Number.isFinite(price)) return;

    const prev = order.items.get(title);
    if (prev) prev.qty += 1;
    else order.items.set(title, { name: title, price, qty: 1 });

    // update dock
    let count = 0;
    for (const it of order.items.values()) count += it.qty;
    if (orderCountEl) orderCountEl.textContent = String(count);

    // bounce animation
    const btn = $('[data-add]', card);
    if (btn) {
      btn.classList.add('bounce');
      setTimeout(() => btn.classList.remove('bounce'), 520);
    }
  };

  // add buttons
  $$('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addToOrder(btn.closest('[data-item]')));
  });

  const openOrderModal = () => {
    if (!orderListModal) return;
    if (order.items.size === 0) {
      // gentle attention
      viewOrderBtn?.classList.add('bounce');
      setTimeout(() => viewOrderBtn?.classList.remove('bounce'), 520);
      return;
    }

    // render
    if (orderList) {
      orderList.innerHTML = '';
      let total = 0;
      for (const it of order.items.values()) {
        total += it.price * it.qty;
        const row = document.createElement('div');
        row.className = 'order-line';
        row.innerHTML = `<span>${it.name} × ${it.qty}</span><span>${formatINR(it.price * it.qty)}</span>`;
        orderList.appendChild(row);
      }
      const tRow = document.createElement('div');
      tRow.className = 'order-line';
      tRow.style.fontWeight = '1000';
      tRow.innerHTML = `<span>Total</span><span>${formatINR(total)}</span>`;
      orderList.appendChild(tRow);
    }

    orderListModal.setAttribute('data-open', 'true');
    orderListModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      orderListModal.querySelector('[data-order-close]')?.focus();
    }, 0);
  };

  const closeOrderModal = () => {
    if (!orderListModal) return;
    orderListModal.setAttribute('data-open', 'false');
    orderListModal.setAttribute('aria-hidden', 'true');
  };

  if (viewOrderBtn) viewOrderBtn.addEventListener('click', openOrderModal);
  if (orderClose) orderClose.addEventListener('click', closeOrderModal);
  if (orderListModal) orderListModal.addEventListener('click', (e) => {
    if (e.target === orderListModal) closeOrderModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOrderModal();
  });
  if (orderClear) {
    orderClear.addEventListener('click', () => {
      order.items.clear();
      if (orderCountEl) orderCountEl.textContent = '0';
      if (orderList) orderList.innerHTML = '';
      // keep modal open for instant feedback
    });
  }

  // Signature carousel
  const carousel = $('[data-carousel]');
  if (carousel) {
    const cards = $$('[data-track] .sig-card');
    const prev = $('[data-prev]', carousel);
    const next = $('[data-next]', carousel);
    const dotsWrap = $('[data-dots]', carousel);

    const makeDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      cards.forEach((_, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'dot';
        b.setAttribute('aria-label', `Go to signature ${idx + 1}`);
        b.addEventListener('click', () => setIndex(idx));
        dotsWrap.appendChild(b);
      });
    };

    const setIndex = (i) => {
      cards.forEach((c, idx) => c.classList.toggle('is-active', idx === i));
      const dots = $$('.dot', dotsWrap);
      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
    };

    let index = 0;
    makeDots();
    setIndex(index);

    const step = (dir) => {
      index = (index + dir + cards.length) % cards.length;
      setIndex(index);
    };

    prev?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
  }

  // Gallery tab filter
  $$('[data-gallery-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const cat = tab.dataset.galleryTab;
      $$('[data-gallery-tab]').forEach((t) => {
        t.classList.toggle('is-active', t.dataset.galleryTab === cat);
        t.setAttribute('aria-selected', String(t.dataset.galleryTab === cat));
      });
      $$('[data-lightbox]').forEach((item) => {
        item.style.display = item.dataset.lightbox === cat ? '' : 'none';
      });
    });
  });

  // Gallery lightbox
  const lightbox = $('[data-lightbox-modal]');
  const lightboxClose = $('[data-lightbox-close]');
  const lightboxCaption = $('[data-lightbox-caption]');
  const lightboxSrc = $('[data-lightbox-src]');

  const openLightbox = (category, src) => {
    if (!lightbox) return;
    if (lightboxCaption) {
      lightboxCaption.textContent = category ? `Ambience snapshot — ${category}` : 'Ambience snapshot';
    }
    if (lightboxSrc && src) {
      lightboxSrc.src = src;
    }
    lightbox.setAttribute('data-open', 'true');
    lightbox.setAttribute('aria-hidden', 'false');
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.setAttribute('data-open', 'false');
    lightbox.setAttribute('aria-hidden', 'true');
  };

  $$('[data-lightbox]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      openLightbox(btn.dataset.lightbox, img ? img.src : '');
    });
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeOrderModal();
      closeReserveModal();
    }
  });

  // Reservation form
  const reservationForm = $('#reservationForm');
  const reserveModal = $('[data-reserve-modal]');
  const reserveClose = $('[data-reserve-close]');
  const reserveSummary = $('[data-reserve-summary]');

  const closeReserveModal = () => {
    if (!reserveModal) return;
    reserveModal.setAttribute('data-open', 'false');
    reserveModal.setAttribute('aria-hidden', 'true');
  };

  const openReserveModal = ({ name, phone, datetime, guests }) => {
    if (!reserveModal) return;
    if (reserveSummary) {
      const dt = datetime ? new Date(datetime) : null;
      const dtStr = dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString() : String(datetime || '');
      reserveSummary.innerHTML = `
        <div><strong>Name:</strong> ${name}</div>
        <div><strong>Phone:</strong> ${phone}</div>
        <div><strong>Date & Time:</strong> ${dtStr}</div>
        <div><strong>Guests:</strong> ${guests}</div>
      `;
    }

    reserveModal.setAttribute('data-open', 'true');
    reserveModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => reserveClose?.focus(), 0);
  };

  if (reservationForm) {
    reservationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(reservationForm);
      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();
      const datetime = String(fd.get('datetime') || '').trim();
      const guests = String(fd.get('guests') || '').trim();

      // Basic validation
      if (!name || !phone || !datetime || !guests) {
        // focus first missing
        const firstMissing = Array.from(reservationForm.querySelectorAll('[required]')).find((inp) => !String(inp.value || '').trim());
        firstMissing?.focus();
        return;
      }

      openReserveModal({ name, phone, datetime, guests });
      reservationForm.reset();
    });
  }

  reserveClose?.addEventListener('click', closeReserveModal);
  reserveModal?.addEventListener('click', (e) => {
    if (e.target === reserveModal) closeReserveModal();
  });

  // Testimonials carousel
  const tCarousel = $('[data-t-carousel]');
  if (tCarousel) {
    const cards = $$('[data-t-track] .t-card');
    const prev = $('[data-t-prev]', tCarousel);
    const next = $('[data-t-next]', tCarousel);
    const dotsWrap = $('[data-t-dots]', tCarousel);

    const setIndex = (i) => {
      cards.forEach((c, idx) => c.classList.toggle('is-active', idx === i));
      const dots = $$('.dot', dotsWrap);
      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
    };

    let index = 0;
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      cards.forEach((_, idx) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'dot';
        d.addEventListener('click', () => setIndex(idx));
        dotsWrap.appendChild(d);
      });
    }

    setIndex(0);

    const step = (dir) => {
      index = (index + dir + cards.length) % cards.length;
      setIndex(index);
    };

    prev?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
  }

  // Footer year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();

