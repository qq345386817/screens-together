document.querySelectorAll('[data-language-switch]').forEach(select => {
  select.addEventListener('change', () => {
    const destination = new URL(select.value, window.location.href);
    if (destination.origin === window.location.origin) window.location.assign(destination.href);
  });
});
