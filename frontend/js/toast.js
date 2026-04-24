/**
 * toast.js — Toast notification system
 * Global: showToast(title, message, type)
 * Types: 'success' | 'error' | 'warning' | 'info'
 */
const TOAST_ICONS = {
  success: 'fa-solid fa-circle-check',
  error:   'fa-solid fa-circle-xmark',
  warning: 'fa-solid fa-triangle-exclamation',
  info:    'fa-solid fa-circle-info',
};
const TOAST_TITLES = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' };

function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${TOAST_ICONS[type] || TOAST_ICONS.info} toast-icon"></i>
    <div class="toast-body">
      <div class="toast-title">${title || TOAST_TITLES[type]}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  setTimeout(remove, duration);
  toast.addEventListener('click', remove);
}
