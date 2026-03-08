const summaryCards = document.getElementById('summary-cards');
const categoryTable = document.getElementById('category-table');
const historyTable = document.getElementById('history-table');
const refreshPricesBtn = document.getElementById('refresh-prices-btn');

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

async function loadSummary() {
  const response = await fetch('/api/valuation/summary');
  const summary = await response.json();

  summaryCards.innerHTML = `
    <div class="summary-card"><span>Livros cadastrados</span><strong>${summary.totalBooks}</strong></div>
    <div class="summary-card"><span>Livros precificados</span><strong>${summary.pricedBooks}</strong></div>
    <div class="summary-card"><span>Valor total estimado</span><strong>${formatCurrency(summary.totalValue)}</strong></div>
    <div class="summary-card"><span>Valor médio</span><strong>${formatCurrency(summary.averageValue)}</strong></div>
  `;

  if (!summary.byCategory.length) {
    categoryTable.innerHTML = '<div class="empty">Sem categorias disponíveis.</div>';
  } else {
    categoryTable.innerHTML = `
      <table class="table">
        <thead><tr><th>Categoria</th><th>Quantidade</th><th>Valor total</th></tr></thead>
        <tbody>
          ${summary.byCategory.map((item) => `
            <tr>
              <td>${item.category}</td>
              <td>${item.qty}</td>
              <td>${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

async function loadHistory() {
  const response = await fetch('/api/books/history');
  const history = await response.json();

  if (!history.length) {
    historyTable.innerHTML = '<div class="empty">Ainda não existe histórico de valorização.</div>';
    return;
  }

  historyTable.innerHTML = `
    <table class="table">
      <thead><tr><th>Livro</th><th>Preço</th><th>Fonte</th><th>Confiança</th><th>Data</th></tr></thead>
      <tbody>
        ${history.map((entry) => `
          <tr>
            <td>${entry.title}</td>
            <td>${formatCurrency(entry.price)}</td>
            <td>${entry.source || '—'}</td>
            <td>${entry.confidence || '—'}</td>
            <td>${new Date(entry.created_at).toLocaleString('pt-BR')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

refreshPricesBtn.addEventListener('click', async () => {
  refreshPricesBtn.disabled = true;
  refreshPricesBtn.textContent = 'Atualizando...';
  await fetch('/api/valuation/refresh', { method: 'POST' });
  await Promise.all([loadSummary(), loadHistory()]);
  refreshPricesBtn.disabled = false;
  refreshPricesBtn.textContent = 'Atualizar preços';
});

Promise.all([loadSummary(), loadHistory()]);
