(() => {
  'use strict';
  const home = document.querySelector('[data-home]');
  if (!home) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const connection = navigator.connection;
  const allowMotion = () => !reducedMotion.matches && !connection?.saveData;
  let pageActive = true;
  let frame = 0;
  let lastTime = 0;
  const sequences = [];

  // 화면에 보이는 배경과 선택한 카드만 같은 시계로 재생합니다.
  function wake() {
    if (!frame && pageActive && !document.hidden && sequences.some(sequence => sequence.running)) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    frame = 0;
    const delta = Math.min(now - lastTime, 200);
    lastTime = now;
    sequences.forEach(sequence => sequence.tick(delta));
    if (sequences.some(sequence => sequence.running)) frame = requestAnimationFrame(tick);
  }

  class MediaSequence {
    constructor(element, onChange, onProgress) {
      this.element = element;
      this.chapters = JSON.parse(element.dataset.chapters);
      this.scenes = this.chapters.flatMap((chapter, chapterIndex) => chapter.scenes.map(scene => ({ ...scene, chapterIndex })));
      this.layers = [...element.querySelectorAll('[data-layer]')];
      this.onChange = onChange;
      this.onProgress = onProgress;
      this.index = 0;
      this.targetIndex = 0;
      this.layerIndex = 0;
      this.elapsed = 0;
      this.version = 0;
      this.wanted = false;
      this.visible = true;
      this.running = false;
      this.pending = false;
      sequences.push(this);
      this.configureVideo(this.layers[0], this.scenes[0]);
    }
    configureVideo(layer, scene) {
      const video = layer.querySelector('video');
      video.pause();
      layer.classList.remove('is-playing');
      video.onplaying = () => {
        if (this.running && this.layers[this.layerIndex] === layer) layer.classList.add('is-playing');
        else video.pause();
      };
      video.onerror = () => layer.classList.remove('is-playing');
      video.muted = true;
      video.style.objectPosition = scene.position;
      // 동영상은 실제 재생할 때만 주소를 넣어 초기 다운로드를 제한합니다.
      video.dataset.source = scene.video ? `assets/${matchMedia('(max-width: 640px)').matches && scene.mobile ? scene.mobile : scene.video}` : '';
      video.removeAttribute('src');
      video.load();
    }
    playCurrent() {
      const layer = this.layers[this.layerIndex];
      const video = layer.querySelector('video');
      if (!this.running || !video.dataset.source) return;
      if (!video.getAttribute('src')) video.src = video.dataset.source;
      video.play()?.catch(() => layer.classList.remove('is-playing'));
    }
    sync() {
      const nextRunning = this.wanted && this.visible && pageActive && !document.hidden && allowMotion();
      if (nextRunning === this.running) return;
      this.running = nextRunning;
      if (this.running) {
        this.playCurrent();
        this.preloadNext();
        wake();
      } else {
        this.layers.forEach(layer => layer.querySelector('video').pause());
      }
    }
    preloadNext() {
      if (!allowMotion()) return;
      const next = this.scenes[(this.index + 1) % this.scenes.length];
      if (this.preloaded === next.image) return;
      this.preloaded = next.image;
      this.preloadImage = new Image();
      this.preloadImage.src = `assets/${next.image}`;
    }
    async show(index) {
      const version = ++this.version;
      this.targetIndex = index;
      this.pending = true;
      const scene = this.scenes[index];
      const nextLayerIndex = 1 - this.layerIndex;
      const layer = this.layers[nextLayerIndex];
      const image = layer.querySelector('img');
      image.style.objectPosition = scene.position;
      image.src = `assets/${scene.image}`;
      try { await image.decode(); } catch { /* 실패해도 현재 장면은 남겨 둡니다. */ }
      if (version !== this.version) return;
      this.pending = false;
      this.index = index;
      this.elapsed = 0;
      if (image.naturalWidth) {
        const previous = this.layers[this.layerIndex];
        this.configureVideo(layer, scene);
        this.layerIndex = nextLayerIndex;
        layer.classList.add('is-visible');
        previous.classList.remove('is-visible');
        // 이전 레이어는 페이드가 끝난 뒤 정지합니다.
        setTimeout(() => {
          if (!previous.classList.contains('is-visible')) previous.querySelector('video').pause();
        }, 760);
        this.playCurrent();
        this.onChange?.(this.chapters[scene.chapterIndex], scene.chapterIndex);
      }
      if (this.running) this.preloadNext();
      this.progress();
    }
    selectChapter(direction) {
      const current = this.scenes[this.targetIndex].chapterIndex;
      const chapter = (current + direction + this.chapters.length) % this.chapters.length;
      this.show(this.scenes.findIndex(scene => scene.chapterIndex === chapter));
    }
    progress() {
      const chapter = this.scenes[this.index].chapterIndex;
      const first = this.scenes.findIndex(scene => scene.chapterIndex === chapter);
      const duration = this.chapters[chapter].scenes.reduce((sum, scene) => sum + scene.duration, 0);
      const passed = this.scenes.slice(first, this.index).reduce((sum, scene) => sum + scene.duration, 0);
      this.onProgress?.(Math.min((passed + this.elapsed) / duration, 1));
    }
    tick(delta) {
      if (!this.running || this.pending) return;
      this.elapsed += delta;
      this.progress();
      if (this.elapsed >= this.scenes[this.index].duration) this.show((this.index + 1) % this.scenes.length);
    }
  }

  const hero = home.querySelector('[data-home-hero]');
  const progress = home.querySelector('[data-chapter-progress]');
  const heroSequence = new MediaSequence(hero.querySelector('[data-home-media]'), (chapter, index) => {
    home.querySelector('[data-chapter-label]').textContent = chapter.label;
    home.querySelector('[data-chapter-title]').textContent = chapter.title;
    home.querySelector('[data-chapter-role]').textContent = chapter.role;
    home.querySelector('[data-chapter-link]').href = chapter.href;
    home.querySelector('[data-chapter-count]').textContent = `${String(index + 1).padStart(2, '0')} / 04`;
    home.querySelectorAll('.home-keywords li').forEach((item, keyword) => item.classList.toggle('is-current', keyword === chapter.keyword));
  }, value => { progress.style.transform = `scaleX(${value})`; });
  heroSequence.wanted = true;
  home.querySelector('[data-chapter-prev]').addEventListener('click', () => heroSequence.selectChapter(-1));
  home.querySelector('[data-chapter-next]').addEventListener('click', () => heroSequence.selectChapter(1));

  const cardGroup = home.querySelector('[data-work-cards]');
  const cards = [...cardGroup.querySelectorAll('[data-work-card]')];
  const cardSequences = cards.map(card => new MediaSequence(card.querySelector('[data-home-media]')));
  let hoveredCard = null;
  let focusedCard = null;
  let latestInput = 'pointer';
  function syncCards() {
    const active = latestInput === 'pointer' ? hoveredCard || focusedCard : focusedCard || hoveredCard;
    cardGroup.classList.toggle('has-active', Boolean(active));
    cards.forEach((card, index) => {
      const selected = card === active;
      card.classList.toggle('is-active', selected);
      cardSequences[index].wanted = selected;
      cardSequences[index].sync();
    });
  }
  cards.forEach(card => {
    card.addEventListener('pointerenter', event => {
      if (finePointer.matches && event.pointerType !== 'touch') { latestInput = 'pointer'; hoveredCard = card; syncCards(); }
    });
    card.addEventListener('pointerleave', () => { if (hoveredCard === card) hoveredCard = null; syncCards(); });
    card.addEventListener('focusin', () => { latestInput = 'keyboard'; focusedCard = card; syncCards(); });
    card.addEventListener('focusout', event => {
      if (!card.contains(event.relatedTarget)) { focusedCard = null; syncCards(); }
    });
  });

  if ('IntersectionObserver' in window) {
    const observationTargets = [hero, ...cards];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const sequence = sequences[observationTargets.indexOf(entry.target)];
        sequence.visible = entry.isIntersecting;
        sequence.sync();
      });
    }, { threshold: 0 });
    observationTargets.forEach(element => observer.observe(element));
  }

  const intro = home.querySelector('[data-home-intro]');
  const lines = [...intro.querySelectorAll('[data-type-line]')];
  const fullText = lines.map(line => [...line.textContent]);
  const follow = intro.querySelector('.home-intro-follow');
  let typeTimer;
  function finishTyping() {
    clearTimeout(typeTimer);
    lines.forEach((line, index) => { line.textContent = fullText[index].join(''); line.classList.remove('is-writing'); });
    intro.classList.remove('is-typing');
    follow.inert = false;
  }
  function typeIntro() {
    if (!allowMotion()) return;
    intro.classList.add('is-typing');
    follow.inert = true;
    lines.forEach(line => { line.textContent = ''; });
    let lineIndex = 0;
    let letter = 0;
    function nextLetter() {
      if (!allowMotion() || document.hidden) { finishTyping(); return; }
      const line = lines[lineIndex];
      line.classList.add('is-writing');
      line.textContent = fullText[lineIndex].slice(0, ++letter).join('');
      if (letter < fullText[lineIndex].length) typeTimer = setTimeout(nextLetter, 72);
      else if (lineIndex < lines.length - 1) {
        line.classList.remove('is-writing');
        lineIndex += 1;
        letter = 0;
        typeTimer = setTimeout(nextLetter, 200);
      } else typeTimer = setTimeout(finishTyping, 180);
    }
    typeTimer = setTimeout(nextLetter, 180);
  }
  function syncAll() {
    if (!allowMotion()) finishTyping();
    sequences.forEach(sequence => sequence.sync());
    if (document.hidden || !pageActive || !allowMotion()) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  document.addEventListener('visibilitychange', syncAll);
  window.addEventListener('pagehide', () => { pageActive = false; finishTyping(); syncAll(); });
  window.addEventListener('pageshow', () => { pageActive = true; syncAll(); });
  reducedMotion.addEventListener('change', syncAll);
  connection?.addEventListener('change', syncAll);
  finePointer.addEventListener('change', () => { hoveredCard = null; syncCards(); });
  typeIntro();
  syncAll();
})();
