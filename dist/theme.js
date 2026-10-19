(() => {
  const key = 'portfolio-color-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'dark' || value === 'light';
  let preference = null;
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* 저장이 제한되어도 현재 페이지의 테마 전환은 유지합니다. */ }

  function applyTheme() {
    const theme = preference || (system.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181e1b' : '#f6f5f1');
    const button = document.querySelector('[data-theme-toggle]');
    if (!button) return;
    const label = theme === 'dark' ? '라이트 모드' : '다크 모드';
    button.querySelector('[data-theme-label]').textContent = label;
    button.setAttribute('aria-label', label + '로 전환');
    button.title = label + '로 전환';
    button.hidden = false;
  }

  // 스타일을 불러오기 전에 저장된 테마를 적용해 첫 화면의 색상 깜박임을 줄입니다.
  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* 저장 제한 시 메모리에서만 유지합니다. */ }
      applyTheme();
    });
  }, { once: true });
  system.addEventListener('change', () => { if (!preference) applyTheme(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : null;
    applyTheme();
  });
})();
