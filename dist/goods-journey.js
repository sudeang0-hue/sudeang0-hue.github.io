document.querySelectorAll('[data-goods-journey]').forEach(root => {
  const tablist = root.querySelector('[data-journey-tabs]');
  const tabs = [...root.querySelectorAll('[data-journey-tab]')];
  const panels = [...root.querySelectorAll('[data-journey-panel]')];
  if (!tablist || tabs.length !== 3 || panels.length !== tabs.length) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let animation = null;

  function stopAnimation() {
    if (animation) animation.cancel();
    animation = null;
  }

  function select(index, {focus = false, animate = true} = {}) {
    if (index < 0 || index >= tabs.length) return;
    if (index === current && root.classList.contains('is-enhanced')) {
      if (focus) tabs[index].focus();
      return;
    }
    stopAnimation();
    current = index;
    tabs.forEach((tab, position) => {
      const selected = position === current;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    const panel = panels[current];
    const image = panel.querySelector('img');
    if (image) image.loading = 'eager';
    if (focus) tabs[current].focus();
    if (animate && !motion.matches && typeof panel.animate === 'function') {
      // 연타 시 이전 전환을 취소하고 마지막으로 선택한 단계만 보여줍니다.
      animation = panel.animate(
        [{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'translateY(0)'}],
        {duration:360, easing:'cubic-bezier(.2,.7,.2,1)'}
      );
    }
  }

  tablist.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      else return;
      event.preventDefault();
      select(target, {focus:true});
    });
  });
  select(0, {animate:false});
  root.classList.add('is-enhanced');
  tablist.hidden = false;
  const onMotionChange = () => { if (motion.matches) stopAnimation(); };
  if (motion.addEventListener) motion.addEventListener('change', onMotionChange);
  else motion.addListener?.(onMotionChange);
  window.addEventListener('pagehide', stopAnimation);
});
