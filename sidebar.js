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

    // 5. Initialize shared fullscreen controller
    initFullscreen();
  }

  /* ==========================================================================
     SHARED FULLSCREEN API CONTROLLER
     ========================================================================== */
  function isFullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }

  function updateFullscreenButtons() {
    const isActive = isFullscreenActive();
    const btns = document.querySelectorAll('#btnFullscreen, .btn-fullscreen, [data-action="toggle-fullscreen"]');
    btns.forEach(btn => {
      btn.innerHTML = isActive ? '⛶ Exit Full Screen' : '⛶ Full Screen';
      btn.setAttribute('title', isActive ? 'Exit Full Screen' : 'Full Screen');
      btn.classList.toggle('active', isActive);
    });
  }

  function toggleFullscreen() {
    try {
      if (!isFullscreenActive()) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  }

  function initFullscreen() {
    // 1. Auto-inject fullscreen button into header if not present
    const headerRight = document.querySelector('.top-header .header-right, header .header-right');
    let existingBtn = document.querySelector('#btnFullscreen, .btn-fullscreen, [data-action="toggle-fullscreen"]');

    if (!existingBtn && headerRight) {
      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = 'btn-fullscreen';
      fsBtn.id = 'btnFullscreen';
      fsBtn.innerHTML = '⛶ Full Screen';
      fsBtn.setAttribute('title', 'Toggle Fullscreen');
      // Insert before user profile or as first child
      const userProfile = headerRight.querySelector('.user-profile, .user-badge');
      if (userProfile) {
        headerRight.insertBefore(fsBtn, userProfile);
      } else {
        headerRight.appendChild(fsBtn);
      }
      existingBtn = fsBtn;
    }

    // 2. Attach click handlers to all fullscreen buttons
    const btns = document.querySelectorAll('#btnFullscreen, .btn-fullscreen, [data-action="toggle-fullscreen"]');
    btns.forEach(btn => {
      btn.removeEventListener('click', toggleFullscreen);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleFullscreen();
      });
    });

    // 3. Listen to browser fullscreen change events
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
      document.addEventListener(evt, updateFullscreenButtons);
    });

    // 4. Initial state sync
    updateFullscreenButtons();
  }

  // Expose global methods
  window.toggleSidebarCollapse = toggleSidebarCollapse;
  window.toggleFullscreen = toggleFullscreen;
  window.initSidebar = initSidebar;
  window.initFullscreen = initFullscreen;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }

})(window);
