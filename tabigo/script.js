document.addEventListener('DOMContentLoaded', function() {
  const content = document.getElementById('content');
  const searchInput = document.getElementById('search');
  const categoryBtns = document.querySelectorAll('.cat-btn');

  let currentCategory = 'all';

  const typeLabels = {
    q: '상대방',
    a: '나',
    tip: '팁'
  };

  // 문구 아이템 HTML 생성
  function createPhraseItem(item) {
    if (item.type === 'tip') {
      return `
        <div class="phrase-item tip">
          <span class="phrase-type">${typeLabels.tip}</span>
          <div class="kr">${item.kr}</div>
        </div>
      `;
    }
    return `
      <div class="phrase-item ${item.type}">
        <span class="phrase-type">${typeLabels[item.type]}</span>
        <div class="jp">${item.jp}</div>
        <div class="pn">${item.pn}</div>
        <div class="kr">${item.kr}</div>
      </div>
    `;
  }

  // 상황 블록 HTML 생성
  function createSituationBlock(situation, qas) {
    return `
      <div class="situation-block">
        <div class="situation-title">${situation}</div>
        ${qas.map(createPhraseItem).join('')}
      </div>
    `;
  }

  // 숫자 그리드 생성
  function createNumberGrid(numbers) {
    return `
      <div class="grid-section">
        <div class="grid-title">숫자</div>
        <div class="number-grid">
          ${numbers.map(n => `
            <div class="number-item">
              <div class="num">${n.num}</div>
              <div class="jp-num">${n.jp}</div>
              <div class="pn-num">${n.pn}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 금액 그리드 생성
  function createMoneyGrid(money) {
    return `
      <div class="grid-section">
        <div class="grid-title">금액 읽기</div>
        <div class="money-grid">
          ${money.map(m => `
            <div class="money-item">
              <div class="price">${m.price}</div>
              <div class="jp-money">${m.jp}</div>
              <div class="pn-money">${m.pn}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 시간 그리드 생성
  function createTimeGrid(time) {
    return `
      <div class="grid-section">
        <div class="grid-title">시간</div>
        <div class="time-grid">
          ${time.map(t => `
            <div class="time-item">
              <div class="time-kr">${t.time}</div>
              <div class="jp-time">${t.jp}</div>
              <div class="pn-time">${t.pn}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 섹션 렌더링
  function renderSection(key, data, searchTerm = '') {
    let items = data.items || [];
    let filteredItems = [];

    // 검색 필터
    if (searchTerm) {
      items.forEach(item => {
        const matchedQAs = item.qa.filter(qa =>
          (qa.jp && qa.jp.includes(searchTerm)) ||
          (qa.pn && qa.pn.includes(searchTerm)) ||
          (qa.kr && qa.kr.includes(searchTerm)) ||
          item.situation.includes(searchTerm)
        );
        if (matchedQAs.length > 0) {
          filteredItems.push({ situation: item.situation, qa: matchedQAs });
        }
      });
    } else {
      filteredItems = items;
    }

    // 검색 결과 없으면 빈 문자열
    if (filteredItems.length === 0 && !data.numbers && !data.money && !data.time) {
      return '';
    }

    let contentHtml = filteredItems.map(item =>
      createSituationBlock(item.situation, item.qa)
    ).join('');

    // 기본 표현 섹션의 숫자/금액/시간 (검색어 없을 때만)
    if (key === 'basic' && !searchTerm) {
      if (data.numbers) contentHtml += createNumberGrid(data.numbers);
      if (data.money) contentHtml += createMoneyGrid(data.money);
      if (data.time) contentHtml += createTimeGrid(data.time);
    }

    if (!contentHtml) return '';

    return `
      <section class="section" data-category="${key}">
        <div class="section-header">
          <h2>${data.icon} ${data.title}</h2>
        </div>
        <div class="section-content">
          ${contentHtml}
        </div>
      </section>
    `;
  }

  // 전체 렌더링
  function render(searchTerm = '') {
    let html = '';

    for (const [key, data] of Object.entries(phrases)) {
      if (currentCategory === 'all' || currentCategory === key) {
        html += renderSection(key, data, searchTerm);
      }
    }

    if (!html) {
      html = '<div class="no-result">검색 결과가 없습니다</div>';
    }

    content.innerHTML = html;
  }

  // 카테고리 버튼 클릭
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      categoryBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentCategory = this.dataset.category;
      render(searchInput.value);
    });
  });

  // 검색
  searchInput.addEventListener('input', function() {
    render(this.value);
  });

  // 초기 렌더링
  render();
});
