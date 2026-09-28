document.addEventListener('DOMContentLoaded', () => {
  const boxes = [...document.querySelectorAll('#contact-list input[type="checkbox"]')];
  const options = [...document.querySelectorAll('.contact-option')];
  const counter = document.getElementById('selected-count');
  const search = document.getElementById('contact-search');

  const update = () => {
    counter.textContent = boxes.filter((b) => b.checked).length;
  };
  const visibleBoxes = () => boxes.filter((b) => !b.closest('.contact-option').hidden);

  boxes.forEach((b) => b.addEventListener('change', update));
  document.getElementById('select-all').addEventListener('click', () => {
    visibleBoxes().forEach((b) => (b.checked = true));
    update();
  });
  document.getElementById('select-none').addEventListener('click', () => {
    boxes.forEach((b) => (b.checked = false));
    update();
  });
  search.addEventListener('input', () => {
    const term = search.value.trim().toLocaleLowerCase('ar');
    options.forEach((o) => {
      o.hidden = !o.dataset.search.toLocaleLowerCase('ar').includes(term);
    });
  });
  update();
});
