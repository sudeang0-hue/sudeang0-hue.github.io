import fs from 'node:fs';

const journey = JSON.parse(fs.readFileSync(new URL('./goods-journey.json', import.meta.url), 'utf8'));

export function renderGoodsJourney({escapeHtml}) {
  if (typeof escapeHtml !== 'function') throw new Error('상품 제작 과정의 HTML 변환 함수를 확인하세요.');
  if (journey.stages.length !== 3 || new Set(journey.stages.map(stage => stage.id)).size !== 3) {
    throw new Error('상품 제작 과정은 중복 없는 세 단계로 구성해야 합니다.');
  }
  const stages = journey.stages;
  for (const stage of stages) {
    if (!/^[a-z-]+$/.test(stage.id) || !/^[a-z0-9-]+\.(?:jpg|png|webp)$/.test(stage.file)
      || !Number.isInteger(stage.width) || stage.width <= 0 || !Number.isInteger(stage.height) || stage.height <= 0) {
      throw new Error('상품 제작 과정 이미지와 식별자를 확인하세요.');
    }
  }
  const tabs = stages.map((stage, index) => `<button type="button" id="goods-journey-tab-${stage.id}" data-journey-tab aria-controls="goods-journey-panel-${stage.id}"><span aria-hidden="true">0${index + 1}</span>${escapeHtml(stage.tab)}</button>`).join('');
  const panels = stages.map((stage, index) => `<figure class="goods-journey-panel" id="goods-journey-panel-${stage.id}" data-journey-panel>
    <button type="button" class="zoom-trigger goods-journey-image" data-zoom data-caption="${escapeHtml(stage.alt)}" aria-label="${escapeHtml(stage.alt)} 크게 보기"><img src="assets/${stage.file}" alt="${escapeHtml(stage.alt)}" width="${stage.width}" height="${stage.height}" loading="lazy" decoding="async"></button>
    <figcaption><span class="goods-journey-step">0${index + 1} / 03</span><h3>${escapeHtml(stage.title)}</h3><p>${escapeHtml(stage.description)}</p><p class="goods-journey-credit">${escapeHtml(stage.credit)}</p></figcaption>
  </figure>`).join('');
  // 스크립트를 사용할 수 없을 때에도 세 단계와 출처 구분을 모두 읽을 수 있습니다.
  return `<section class="goods-journey" id="goods-journey" data-goods-journey aria-labelledby="goods-journey-title">
    <header><span class="eyebrow">ARTWORK → PRODUCT → DISPLAY</span><h2 id="goods-journey-title">${escapeHtml(journey.title)}</h2><p>${escapeHtml(journey.description)}</p></header>
    <div class="goods-journey-tabs" data-journey-tabs hidden aria-label="일러스트 상품화 단계">${tabs}</div>
    <div class="goods-journey-panels">${panels}</div>
  </section>`;
}
