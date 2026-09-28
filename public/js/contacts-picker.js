// Shared by the register form and the settings page: select-all/none, search, counter,
// and (on the register form) reloading the allowed accounts when the position changes.
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('contact-list');
  if (!list) return;
  const counter = document.getElementById('selected-count');
  const search = document.getElementById('contact-search');
  const unit = document.getElementById('unit');

  const boxes = () => [...list.querySelectorAll('input[type="checkbox"]')];
  const options = () => [...list.querySelectorAll('.contact-option')];
  const update = () => {
    counter.textContent = boxes().filter((b) => b.checked).length;
  };

  list.addEventListener('change', update);
  document.getElementById('select-all').addEventListener('click', () => {
    boxes().forEach((b) => {
      if (!b.closest('.contact-option').hidden) b.checked = true;
    });
    update();
  });
  document.getElementById('select-none').addEventListener('click', () => {
    boxes().forEach((b) => (b.checked = false));
    update();
  });
  search.addEventListener('input', () => {
    const term = search.value.trim().toLocaleLowerCase('ar');
    options().forEach((o) => {
      o.hidden = !o.dataset.search.toLocaleLowerCase('ar').includes(term);
    });
  });

  if (unit) {
    unit.addEventListener('change', async () => {
      try {
        const res = await fetch(`/register/candidates?unit=${encodeURIComponent(unit.value)}`);
        if (!res.ok) throw new Error(res.status);
        list.innerHTML = await res.text(); // server-rendered, already HTML-escaped
        search.value = '';
        update();
      } catch (e) {
        notify('تعذّر تحميل الحسابات المتاحة. حاول مرة أخرى.');
      }
    });
  }
  update();
});
