export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <span class="toast-close">&times;</span>
  `;

  container.appendChild(toast);

  // Auto remove
  const timeout = setTimeout(() => {
    removeToast(toast);
  }, 4000);

  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timeout);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.classList.add('toast-out');
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}
