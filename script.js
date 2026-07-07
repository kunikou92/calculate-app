const toggleButton = document.getElementById('symbolToggle');
const symbolMenu = document.getElementById('symbolMenu');

if (toggleButton && symbolMenu) {
  toggleButton.addEventListener('click', () => {
    const isOpen = symbolMenu.classList.toggle('open');
    symbolMenu.setAttribute('aria-hidden', String(!isOpen));
  });
}
