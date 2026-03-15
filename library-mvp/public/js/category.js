const categoryFilter = document.getElementById('category-filter');
const sortField = document.getElementById('sort-field');
const sortDirection = document.getElementById('sort-direction');
const categoryBookList = document.getElementById('category-book-list');
const categorySummary = document.getElementById('category-summary');

let books = [];

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCategory(value) {
  return normalizeText(value) || 'Sem categoria';
}

function compareText(a, b) {
  return normalizeText(a).localeCompare(normalizeText(b), 'pt-BR', { sensitivity: 'base' });
}

function compareYear(a, b) {
  const yearA = Number(a);
  const yearB = Number(b);
  const hasA = Number.isFinite(yearA);
  const hasB = Number.isFinite(yearB);

  if (hasA && hasB) {
    return yearA - yearB;
  }

  if (!hasA && !hasB) return 0;
  return hasA ? -1 : 1;
}

function sortBooks(items, field, direction) {
  const factor = direction === 'desc' ? -1 : 1;

  return [...items].sort((a, b) => {
    let comparison = 0;

    if (field === 'published_year') {
      comparison = compareYear(a.published_year, b.published_year);
    } else if (field === 'publisher') {
      comparison = compareText(a.publisher, b.publisher);
    } else if (field === 'author') {
      comparison = compareText(a.author, b.author);
    } else {
      comparison = compareText(a.title, b.title);
    }

    if (comparison !== 0) return comparison * factor;
    return compareText(a.title, b.title) * factor;
  });
}

function populateCategoryFilter(items) {
  const categories = Array.from(new Set(items.map((book) => normalizeCategory(book.category))))
    .sort((a, b) => compareText(a, b));

  categoryFilter.innerHTML = [
    '<option value="__all__">Todas as categorias</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ].join('');
}

function renderBookTable(items) {
  if (!items.length) {
    categoryBookList.innerHTML = '<div class="empty">Nenhum livro encontrado para os filtros escolhidos.</div>';
    return;
  }

  categoryBookList.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Titulo</th>
          <th>Autor</th>
          <th>Editora</th>
          <th>Ano</th>
          <th>Categoria</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((book) => `
          <tr>
            <td>${escapeHtml(normalizeText(book.title) || 'Sem titulo')}</td>
            <td>${escapeHtml(normalizeText(book.author) || '—')}</td>
            <td>${escapeHtml(normalizeText(book.publisher) || '—')}</td>
            <td>${escapeHtml(normalizeText(book.published_year) || '—')}</td>
            <td>${escapeHtml(normalizeCategory(book.category))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderSummary(totalBooks, filteredBooks, selectedCategoryLabel) {
  const categoryLabel = selectedCategoryLabel === '__all__'
    ? 'Todas as categorias'
    : selectedCategoryLabel;

  categorySummary.textContent = `${filteredBooks} de ${totalBooks} livro(s) em: ${categoryLabel}.`;
}

function applyFilters() {
  const selectedCategory = categoryFilter.value || '__all__';
  const selectedSortField = sortField.value || 'title';
  const selectedDirection = sortDirection.value || 'asc';

  const filteredBooks = books.filter((book) =>
    selectedCategory === '__all__'
      ? true
      : normalizeCategory(book.category) === selectedCategory
  );

  const sortedBooks = sortBooks(filteredBooks, selectedSortField, selectedDirection);

  renderSummary(books.length, sortedBooks.length, selectedCategory);
  renderBookTable(sortedBooks);
}

async function loadBooks() {
  try {
    const response = await fetch('/api/books');
    if (!response.ok) {
      throw new Error('Falha ao carregar livros.');
    }

    books = await response.json();
    populateCategoryFilter(books);
    applyFilters();
  } catch (error) {
    categorySummary.textContent = 'Nao foi possivel carregar os livros.';
    categoryBookList.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}

categoryFilter.addEventListener('change', applyFilters);
sortField.addEventListener('change', applyFilters);
sortDirection.addEventListener('change', applyFilters);

loadBooks();
