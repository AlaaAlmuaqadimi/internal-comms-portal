// Shared by every page: icons + toast helper.
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
});

window.notify = (function () {
  let timer;
  return function (message, ms = 3200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      el.hidden = true;
    }, ms);
  };
})();
