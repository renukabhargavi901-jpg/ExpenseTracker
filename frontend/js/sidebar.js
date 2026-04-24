/**
 * sidebar.js — Shared sidebar helper for authenticated pages
 * Call initSidebar(pageId) on each authenticated page.
 * pageId matches .nav-link[data-page] attributes.
 */
function initSidebar(pageId) {
  // Auth guard
  const token = localStorage.getItem('et_token');
  if (!token) { 
    window.location.href = 'login.html'; 
    return; 
  }

  // Populate user info
  const user = JSON.parse(localStorage.getItem('et_user') || '{}');
  if (user.name) {
    const nameEl  = document.getElementById('sidebarUserName');
    const emailEl = document.getElementById('sidebarUserEmail');
    const avatarEl = document.getElementById('sidebarAvatar');

    if (nameEl)  nameEl.textContent  = user.name;
    if (emailEl) emailEl.textContent = user.email || '';
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }

  // Mark active nav link
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });

  // Hamburger menu
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sidebarBackdrop');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop && backdrop.classList.toggle('active');
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }
  }

  // ======================
  // 🚪 LOGOUT WITH CONFIRMATION
  // ======================
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      
      // ✅ Confirmation popup
      const confirmLogout = confirm("Are you sure you want to logout?");
      if (!confirmLogout) return;

      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });

        // Clear local storage
        localStorage.removeItem('et_token');
        localStorage.removeItem('et_user');

        // Redirect to login
        window.location.href = 'login.html';

      } catch (err) {
        console.error('Logout failed:', err);
      }
    });
  }
}