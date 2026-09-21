/**
 * FreshHarvest Supermarket - Unified Two-State Sidebar Controller
 * Manages Expanded (270px) & Collapsed (82px) states, Icons8 toggle button,
 * active link auto-detection, local persistence, and mobile slide-in drawer.
 */

(function(window) {
  'use strict';

  function getSidebar() {
    return document.getElementById('appSidebar') || document.querySelector('.sidebar');
  }

  function getToggleButtons() {
    return document.querySelectorAll('#sidebarToggle, .sidebar-toggle, #sidebarCollapseBtn, .btn-sidebar-collapse');
  }

  function highlightActiveSidebarLink() {
    const rawPath = window.location.pathname.split('/').pop() || 'home.html';
    let normalizedPath = rawPath.split('?')[0].split('#')[0];
    if (!normalizedPath || normalizedPath === 'index.html') {
      normalizedPath = 'home.html';
    }

    // Handle short aliases
    const aliasMap = {
      'stock.html': 'stock-control.html',
      'bills.html': 'bills-history.html',
      'reports.html': 'reports-profit.html',
      'offers.html': 'offers-deals.html',
      'staff.html': 'staff-roles.html',
      'backup.html': 'backup-restore.html',
      'settings.html': 'store-settings.html',
      'cashier-desk.html': 'cashier.html',
      'cashier_desk.html': 'cashier.html',
      'cashier-page.html': 'cashier.html'
    };

    const targetFile = aliasMap[normalizedPath] || normalizedPath;

    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkFile = href.split('/').pop().split('?')[0].split('#')[0];
      const normalizedLink = aliasMap[linkFile] || linkFile;

      if (normalizedLink === targetFile) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function toggleSidebarCollapse() {
    const sidebar = getSidebar();
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);

    // If on small screen and drawer was open, close drawer when collapsing
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
      sidebar.classList.toggle('active');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (backdrop) {
        backdrop.classList.toggle('active');
      }
    }

    const toggleBtns = getToggleButtons();
    toggleBtns.forEach(btn => {
      btn.setAttribute('aria-expanded', String(!isCollapsed));
      btn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
      btn.setAttribute('title', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });

    try {
      localStorage.setItem('freshHarvestSidebarCollapsed', String(isCollapsed));
      localStorage.setItem('freshharvest_sidebar_collapsed', String(isCollapsed));
    } catch (e) {
      console.warn('LocalStorage unavailable for sidebar state:', e);
    }
  }

  function initSidebar() {
    highlightActiveSidebarLink();

    // 1. Restore saved collapsed state
    try {
      const isSavedCollapsed =
        localStorage.getItem('freshHarvestSidebarCollapsed') === 'true' ||
        localStorage.getItem('freshharvest_sidebar_collapsed') === 'true';

      if (isSavedCollapsed) {
        const sidebar = getSidebar();
        if (sidebar) {
          sidebar.classList.add('collapsed');
          document.body.classList.add('sidebar-collapsed');

          const toggleBtns = getToggleButtons();
          toggleBtns.forEach(btn => {
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('aria-label', 'Expand sidebar');
            btn.setAttribute('title', 'Expand sidebar');
          });
        }
      }
    } catch (e) {}

    // 2. Attach toggle listener to Icons8 toggle button
    const toggleBtns = getToggleButtons();
    toggleBtns.forEach(btn => {
      btn.removeEventListener('click', toggleSidebarCollapse);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebarCollapse();
      });
    });

    // 3. Close mobile drawer on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const sidebar = getSidebar();
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar && (sidebar.classList.contains('open') || sidebar.classList.contains('active'))) {
          sidebar.classList.remove('open', 'active', 'show');
          backdrop?.classList.remove('active');
        }
      }
    });

    // 4. Close mobile drawer when clicking outside on small screens
    document.addEventListener('click', (e) => {
      const sidebar = getSidebar();
      const backdrop = document.getElementById('sidebarBackdrop');
      const isToggleBtn = e.target.closest('#sidebarToggle, .sidebar-toggle, #sidebarCollapseBtn, .btn-sidebar-collapse');

      if (
        sidebar &&
        (sidebar.classList.contains('open') || sidebar.classList.contains('active')) &&
        !sidebar.contains(e.target) &&
        !isToggleBtn
      ) {
        sidebar.classList.remove('open', 'active', 'show');
        backdrop?.classList.remove('active');
      }
    });

    // 5. Initialize reactive store identity
    applyStoreIdentityToDOM();
  }

  /* ==========================================================================
     GLOBAL STORE IDENTITY & REACTIVE SYNCHRONIZATION
     ========================================================================== */
  function getStoreSettings() {
    if (window.DataStore && typeof window.DataStore.getSettings === 'function') {
      return window.DataStore.getSettings();
    }
    const raw = localStorage.getItem('freshHarvestStoreSettings') ||
                localStorage.getItem('freshHarvestSettings') ||
                localStorage.getItem('pos_settings');
    let s = null;
    try {
      s = raw ? JSON.parse(raw) : null;
    } catch (e) {
      s = null;
    }
    const defaultName = 'FreshHarvest Supermarket';
    const defaultSlogan = 'Fresh Products • Smart Billing • Better Shopping';
    const base = s && typeof s === 'object' ? s : {};
    const name = base.supermarketName || base.storeName || defaultName;
    const slogan = base.slogan || base.tagline || defaultSlogan;
    return {
      supermarketName: name,
      storeName: name,
      slogan: slogan,
      tagline: slogan,
      address: base.address || 'Shop #14, Green Valley High Street, Bengaluru, Karnataka 560001',
      phone: base.phone || '+91 98765 43210',
      email: base.email || 'contact@freshharvest.store',
      gstin: base.gstin || base.gstNumber || '29ABCDE1234F1Z5',
      gstNumber: base.gstin || base.gstNumber || '29ABCDE1234F1Z5',
      currencySymbol: base.currencySymbol || base.currency || '₹',
      currency: base.currencySymbol || base.currency || '₹',
      defaultGstRate: Number(base.defaultGstRate !== undefined ? base.defaultGstRate : (base.taxRate !== undefined ? base.taxRate : 5)),
      taxRate: Number(base.defaultGstRate !== undefined ? base.defaultGstRate : (base.taxRate !== undefined ? base.taxRate : 5)),
      loyaltyPointsRatio: Number(base.loyaltyPointsRatio !== undefined ? base.loyaltyPointsRatio : (base.pointsRatio !== undefined ? base.pointsRatio : 10)),
      pointsRatio: Number(base.loyaltyPointsRatio !== undefined ? base.loyaltyPointsRatio : (base.pointsRatio !== undefined ? base.pointsRatio : 10)),
      receiptHeader: base.receiptHeader || `${name} - Quality Groceries`,
      receiptFooter: base.receiptFooter || base.receiptFooterMessage || 'Thank you for shopping at FreshHarvest! Healthy Food, Healthy Life.',
      receiptFooterMessage: base.receiptFooter || base.receiptFooterMessage || 'Thank you for shopping at FreshHarvest! Healthy Food, Healthy Life.'
    };
  }

  function applyStoreIdentityToDOM(settings) {
    const s = settings || getStoreSettings();
    if (!s) return;
    const name = s.supermarketName || s.storeName;
    const slogan = s.slogan || s.tagline;

    // 1. Header store location / name
    document.querySelectorAll('#headerStoreName, .header-store-name, .store-location strong').forEach(el => {
      el.textContent = `${name}, Counter #1`;
    });

    // 2. Sidebar promo banner
    document.querySelectorAll('.sidebar-promo .promo-text h4').forEach(el => {
      el.textContent = name;
    });
    document.querySelectorAll('.sidebar-promo .promo-text p').forEach(el => {
      el.textContent = slogan;
    });

    // 3. Footer branding & copyright
    document.querySelectorAll('.app-footer .footer-brand h3').forEach(el => {
      el.textContent = name;
    });
    document.querySelectorAll('.app-footer .footer-brand p').forEach(el => {
      el.textContent = slogan;
    });
    document.querySelectorAll('.app-footer .footer-bottom p').forEach(el => {
      el.textContent = `© 2026 ${name}. Premium Supermarket Management & POS System.`;
    });

    // 4. Receipt & Invoice headers/footers if present
    document.querySelectorAll('#recStoreName, #invStoreName').forEach(el => {
      el.textContent = name;
    });
    document.querySelectorAll('#recStoreAddress, #invStoreAddress').forEach(el => {
      if (s.address) el.textContent = s.address;
    });
    document.querySelectorAll('#recStoreContact, #invStoreContact').forEach(el => {
      el.textContent = `Phone: ${s.phone || ''} | GST: ${s.gstin || s.gstNumber || ''}`;
    });
    document.querySelectorAll('#recFooterMsg, #invFooterMsg').forEach(el => {
      el.textContent = `Thank you for shopping at ${name}!`;
    });
    document.querySelectorAll('#recFooterSub, #invFooterSub').forEach(el => {
      el.textContent = s.receiptFooter || `${slogan} 🌱`;
    });

    // 5. Update document title prefix
    try {
      if (document.title && document.title.includes(' - ')) {
        const parts = document.title.split(' - ');
        document.title = `${name} - ${parts.slice(1).join(' - ')}`;
      }
    } catch (e) {}

    // 6. If on Store Settings page and form is present, re-populate form
    if (typeof window.loadSettingsForm === 'function') {
      try {
        window.loadSettingsForm();
      } catch (e) {}
    }
  }

  // Cross-page and Cross-tab synchronization
  window.addEventListener('freshHarvestSettingsUpdated', function(e) {
    applyStoreIdentityToDOM(e.detail);
  });

  window.addEventListener('storage', function(e) {
    if (e.key === 'freshHarvestStoreSettings' || e.key === 'freshHarvestSettings' || e.key === 'pos_settings') {
      applyStoreIdentityToDOM();
    }
  });

  // Expose global methods
  window.toggleSidebarCollapse = toggleSidebarCollapse;
  window.initSidebar = initSidebar;
  window.getStoreSettings = getStoreSettings;
  window.applyStoreIdentityToDOM = applyStoreIdentityToDOM;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSidebar();
      applyStoreIdentityToDOM();
    });
  } else {
    initSidebar();
    applyStoreIdentityToDOM();
  }

})(window);
