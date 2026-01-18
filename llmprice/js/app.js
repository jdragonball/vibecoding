let pricingData = null;
let currentSort = { field: 'inputPrice', direction: 'asc' };

async function loadPricingData() {
  try {
    const response = await fetch('data/pricing.json');
    pricingData = await response.json();
    document.getElementById('last-updated').textContent = pricingData.lastUpdated;
    renderTable();
  } catch (error) {
    console.error('Failed to load pricing data:', error);
  }
}

function getSelectedProviders() {
  const checkboxes = document.querySelectorAll('#provider-filters input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

function getSelectedCategories() {
  const checkboxes = document.querySelectorAll('#category-filters input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

function filterModels(models) {
  const providers = getSelectedProviders();
  const categories = getSelectedCategories();

  return models.filter(model =>
    providers.includes(model.provider) && categories.includes(model.category)
  );
}

function sortModels(models) {
  const { field, direction } = currentSort;

  return [...models].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}

function formatPrice(price) {
  return '$' + price.toFixed(2);
}

function getPriceClass(price) {
  if (price < 1) return 'price-low';
  if (price < 10) return 'price-medium';
  return 'price-high';
}

function formatContextWindow(tokens) {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(0) + 'M';
  }
  return (tokens / 1000).toFixed(0) + 'K';
}

function formatLongContext(model) {
  if (model.longContextInputPrice && model.longContextOutputPrice) {
    const threshold = formatContextWindow(model.longContextThreshold);
    return `<span class="long-context-price" title=">${threshold} 이상 사용시">$${model.longContextInputPrice.toFixed(2)} / $${model.longContextOutputPrice.toFixed(2)}</span>`;
  }
  return '<span class="no-long-context">-</span>';
}

function updateSortIcons() {
  document.querySelectorAll('.sortable').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    const field = th.dataset.sort;

    if (field === currentSort.field) {
      icon.textContent = currentSort.direction === 'asc' ? ' ▲' : ' ▼';
      th.classList.add('sorted');
    } else {
      icon.textContent = '';
      th.classList.remove('sorted');
    }
  });
}

function renderTable() {
  if (!pricingData) return;

  const tbody = document.getElementById('pricing-tbody');
  let models = filterModels(pricingData.models);
  models = sortModels(models);

  tbody.innerHTML = models.map(model => `
    <tr>
      <td class="model-name">${model.name}</td>
      <td><span class="provider-badge provider-${model.provider}">${model.provider}</span></td>
      <td class="price ${getPriceClass(model.inputPrice)}">${formatPrice(model.inputPrice)}</td>
      <td class="price ${getPriceClass(model.outputPrice)}">${formatPrice(model.outputPrice)}</td>
      <td class="long-context">${formatLongContext(model)}</td>
      <td class="context-window">${formatContextWindow(model.contextWindow)}</td>
      <td><span class="category-badge category-${model.category}">${model.category}</span></td>
    </tr>
  `).join('');

  updateSortIcons();
}

function handleSort(e) {
  const th = e.target.closest('.sortable');
  if (!th) return;

  const field = th.dataset.sort;

  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.field = field;
    currentSort.direction = 'asc';
  }

  renderTable();
}

document.getElementById('provider-filters').addEventListener('change', renderTable);
document.getElementById('category-filters').addEventListener('change', renderTable);
document.querySelector('thead').addEventListener('click', handleSort);

loadPricingData();
