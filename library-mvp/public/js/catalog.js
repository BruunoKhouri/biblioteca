const bookForm = document.getElementById('book-form');
const feedback = document.getElementById('form-feedback');
const bookList = document.getElementById('book-list');
const searchInput = document.getElementById('search-input');
const bookCount = document.getElementById('book-count');
const isbnPreviewBtn = document.getElementById('isbn-preview-btn');
const isbnPreview = document.getElementById('isbn-preview');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const bookModal = document.getElementById('book-modal');
const modalBookBody = document.getElementById('modal-book-body');

let books = [];
let editingBookId = null;
let currentAbntReference = '';
let currentModalBookId = null;

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';

  const numericValue = typeof value === 'number'
    ? value
    : Number(String(value).replace(',', '.'));

  if (!Number.isFinite(numericValue)) return '—';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericValue);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeAuthorName(author) {
  if (!author) return '';

  const cleaned = author.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');

  if (parts.length === 1) {
    return parts[0].toUpperCase();
  }

  const lastName = parts[parts.length - 1].toUpperCase();
  const firstNames = parts.slice(0, -1).join(' ');
  return `${lastName}, ${firstNames}`;
}

function generateAbntReference(book) {
  const author = book.author ? normalizeAuthorName(book.author) : '';
  const title = book.title || 'Título não informado';
  const publisher = book.publisher || '[s.n.]';
  const year = book.published_year || '[s.d.]';
  const city = book.city || '[S.l.]';

  let reference = '';

  if (author) {
    reference += `${author}. `;
  }

  reference += `${title}. `;
  reference += `${city}: ${publisher}, ${year}.`;

  return reference.replace(/\s+/g, ' ').trim();
}

function getBookDisplayPrice(book) {
  return book.final_price ?? book.manual_price ?? book.estimated_price ?? null;
}

function getBookDisplayPriceSource(book) {
  return book.final_price_source || (book.manual_price != null ? 'manual' : (book.price_source || '—'));
}

function buildBookDetailsHtml(book) {
  const abntReference = generateAbntReference(book);
  currentAbntReference = abntReference;
  currentModalBookId = book.id;

  return `
    <div class="modal-grid">
      <div class="modal-cover">
        <img src="${escapeHtml(book.cover_url || 'https://placehold.co/240x360?text=Livro')}" alt="Capa de ${escapeHtml(book.title || 'Livro')}" />
      </div>

      <div class="modal-info">
        <div><strong>Título:</strong> ${escapeHtml(book.title || '—')}</div>
        <div><strong>Autor:</strong> ${escapeHtml(book.author || '—')}</div>
        <div><strong>ISBN:</strong> ${escapeHtml(book.isbn || '—')}</div>
        <div><strong>Editora:</strong> ${escapeHtml(book.publisher || '—')}</div>
        <div><strong>Ano:</strong> ${escapeHtml(book.published_year || '—')}</div>
        <div><strong>Categoria:</strong> ${escapeHtml(book.category || '—')}</div>
        <div><strong>Idioma:</strong> ${escapeHtml(book.language || '—')}</div>
        <div><strong>Status:</strong> ${escapeHtml(book.status || '—')}</div>
        <div><strong>Localização:</strong> ${escapeHtml(book.shelf_location || '—')}</div>
        <div><strong>Observações:</strong> ${escapeHtml(book.notes || '—')}</div>
        <div><strong>Preço manual:</strong> ${escapeHtml(formatCurrency(book.manual_price))}</div>
        <div><strong>Valor final:</strong> ${escapeHtml(formatCurrency(getBookDisplayPrice(book)))}</div>
        <div><strong>Valor estimado:</strong> ${escapeHtml(formatCurrency(book.estimated_price))}</div>
        <div><strong>Fonte do preço:</strong> ${escapeHtml(getBookDisplayPriceSource(book))}</div>
        <div><strong>Atualizado em:</strong> ${escapeHtml(book.price_updated_at ? new Date(book.price_updated_at).toLocaleDateString('pt-BR') : '—')}</div>
      </div>
    </div>

    <div class="reference-box">
      <h3>Referência bibliográfica (ABNT)</h3>
      <div id="abnt-reference-text" class="reference-text">${escapeHtml(abntReference)}</div>
    </div>
  `;
}

function renderBooks(items) {
  if (bookCount) {
    bookCount.textContent = `${items.length} livro(s)`;
  }

  if (!bookList) return;

  if (!items.length) {
    bookList.innerHTML = '<div class="empty">Nenhum livro cadastrado ainda.</div>';
    return;
  }

  bookList.innerHTML = items.map((book) => `
    <article class="book-card">
      <img src="${book.cover_url || 'https://placehold.co/120x180?text=Livro'}" alt="Capa de ${escapeHtml(book.title || 'Livro')}" />
      <div>
        <span class="pill">${escapeHtml(book.status || 'sem status')}</span>
        <h3>${escapeHtml(book.title || 'Sem título')}</h3>

        <div class="meta">
          <div><strong>Autor:</strong> ${escapeHtml(book.author || '—')}</div>
          <div><strong>ISBN:</strong> ${escapeHtml(book.isbn || '—')}</div>
          <div><strong>Categoria:</strong> ${escapeHtml(book.category || '—')}</div>
          <div><strong>Valor:</strong> ${formatCurrency(getBookDisplayPrice(book))}</div>
          <div><strong>Fonte:</strong> ${escapeHtml(getBookDisplayPriceSource(book))}</div>
          <div><strong>Última atualização:</strong> ${book.price_updated_at ? new Date(book.price_updated_at).toLocaleDateString('pt-BR') : '—'}</div>
        </div>

        <div class="book-actions">
          <button type="button" class="secondary" onclick="openBookModal(${book.id})">Detalhes / ABNT</button>
          <button type="button" class="secondary" onclick="editBook(${book.id})">Editar</button>
          <button type="button" onclick="refreshBookPrice(${book.id})">Atualizar preço</button>
          <button type="button" class="secondary" onclick="enrichBook(${book.id})">Buscar metadados</button>
          <button type="button" class="danger" onclick="deleteBook(${book.id})">Excluir</button>
        </div>
      </div>
    </article>
  `).join('');
}

async function loadBooks() {
  const response = await fetch('/api/books');
  books = await response.json();
  applyFilter();
}

function applyFilter() {
  const term = (searchInput?.value || '').trim().toLowerCase();

  const filtered = books.filter((book) =>
    [book.title, book.author, book.isbn]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term))
  );

  renderBooks(filtered);
}

function fillForm(book) {
  if (!bookForm) return;

  if (bookForm.elements.isbn) bookForm.elements.isbn.value = book.isbn || '';
  if (bookForm.elements.title) bookForm.elements.title.value = book.title || '';
  if (bookForm.elements.author) bookForm.elements.author.value = book.author || '';
  if (bookForm.elements.publisher) bookForm.elements.publisher.value = book.publisher || '';
  if (bookForm.elements.published_year) bookForm.elements.published_year.value = book.published_year || '';
  if (bookForm.elements.category) bookForm.elements.category.value = book.category || '';
  if (bookForm.elements.language) bookForm.elements.language.value = book.language || '';
  if (bookForm.elements.manual_price) bookForm.elements.manual_price.value = book.manual_price ?? '';
  if (bookForm.elements.shelf_location) bookForm.elements.shelf_location.value = book.shelf_location || '';
  if (bookForm.elements.status) bookForm.elements.status.value = book.status || 'nao_lido';
  if (bookForm.elements.notes) bookForm.elements.notes.value = book.notes || '';

  if (bookForm.elements.lookup_by_isbn) {
    bookForm.elements.lookup_by_isbn.checked = false;
  }
}

function setEditMode(book) {
  editingBookId = book.id;
  fillForm(book);

  if (submitBtn) {
    submitBtn.textContent = 'Atualizar livro';
  }

  if (cancelEditBtn) {
    cancelEditBtn.classList.remove('hidden');
  }

  if (feedback) {
    feedback.textContent = `Editando: ${book.title}`;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormState() {
  editingBookId = null;

  if (bookForm) {
    bookForm.reset();
  }

  if (submitBtn) {
    submitBtn.textContent = 'Salvar livro';
  }

  if (cancelEditBtn) {
    cancelEditBtn.classList.add('hidden');
  }

  if (feedback) {
    feedback.textContent = '';
  }

  if (isbnPreview) {
    isbnPreview.classList.add('hidden');
    isbnPreview.innerHTML = '';
  }
}

function editBook(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return;

  closeBookModal();
  setEditMode(book);
}

function openBookModal(id) {
  const book = books.find((item) => item.id === id);
  if (!book || !bookModal || !modalBookBody) return;

  modalBookBody.innerHTML = buildBookDetailsHtml(book);
  bookModal.classList.remove('hidden');
  bookModal.setAttribute('aria-hidden', 'false');
}

function closeBookModal() {
  if (!bookModal || !modalBookBody) return;

  bookModal.classList.add('hidden');
  bookModal.setAttribute('aria-hidden', 'true');
  modalBookBody.innerHTML = '';
  currentAbntReference = '';
  currentModalBookId = null;
}

async function copyAbntReference() {
  if (!currentAbntReference) return;

  try {
    await navigator.clipboard.writeText(currentAbntReference);
    alert('Referência ABNT copiada.');
  } catch (_error) {
    alert('Não foi possível copiar a referência.');
  }
}

async function refreshBookPrice(id) {
  await fetch(`/api/books/${id}/refresh-price`, { method: 'POST' });
  await loadBooks();
}

async function enrichBook(id) {
  await fetch(`/api/books/${id}/enrich`, { method: 'POST' });
  await loadBooks();
}

async function deleteBook(id) {
  if (!confirm('Excluir este livro?')) return;

  await fetch(`/api/books/${id}`, { method: 'DELETE' });

  if (editingBookId === id) {
    resetFormState();
  }

  if (currentModalBookId === id) {
    closeBookModal();
  }

  await loadBooks();
}

if (bookForm) {
  bookForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (feedback) {
      feedback.textContent = editingBookId ? 'Atualizando...' : 'Salvando...';
    }

    const formData = new FormData(bookForm);
    const payload = Object.fromEntries(formData.entries());
    payload.lookup_by_isbn = formData.get('lookup_by_isbn') === 'on';

    if ('manual_price' in payload) {
      payload.manual_price = payload.manual_price === '' ? null : payload.manual_price;
    }

    try {
      const isEditing = editingBookId !== null;
      const url = isEditing ? `/api/books/${editingBookId}` : '/api/books';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Falha ao salvar livro.');
      }

      if (feedback) {
        feedback.textContent = isEditing
          ? 'Livro atualizado com sucesso.'
          : 'Livro salvo com sucesso.';
      }

      resetFormState();
      await loadBooks();
    } catch (error) {
      if (feedback) {
        feedback.textContent = error.message;
      }
    }
  });
}

if (isbnPreviewBtn) {
  isbnPreviewBtn.addEventListener('click', async () => {
    const isbn = bookForm?.elements?.isbn?.value?.trim();

    if (!isbn) {
      if (feedback) {
        feedback.textContent = 'Informe um ISBN para pré-visualizar.';
      }
      return;
    }

    if (isbnPreview) {
      isbnPreview.innerHTML = 'Buscando...';
      isbnPreview.classList.remove('hidden');
    }

    try {
      const response = await fetch(`/api/books/isbn/${encodeURIComponent(isbn)}/lookup`);
      const data = await response.json();

      if (!data) {
        if (isbnPreview) {
          isbnPreview.innerHTML = 'Nenhum resultado encontrado.';
        }
        return;
      }

      if (isbnPreview) {
        isbnPreview.innerHTML = `
          <strong>${escapeHtml(data.title || 'Sem título')}</strong><br>
          Autor: ${escapeHtml(data.author || '—')}<br>
          Editora: ${escapeHtml(data.publisher || '—')}<br>
          Ano: ${escapeHtml(data.published_year || '—')}<br>
          Fonte: ${escapeHtml(data.metadata_source || '—')}
        `;
      }
    } catch (_error) {
      if (isbnPreview) {
        isbnPreview.innerHTML = 'Não foi possível buscar o ISBN.';
      }
    }
  });
}

if (searchInput) {
  searchInput.addEventListener('input', applyFilter);
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', () => {
    resetFormState();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && bookModal && !bookModal.classList.contains('hidden')) {
    closeBookModal();
  }
});

window.openBookModal = openBookModal;
window.closeBookModal = closeBookModal;
window.copyAbntReference = copyAbntReference;
window.refreshBookPrice = refreshBookPrice;
window.enrichBook = enrichBook;
window.deleteBook = deleteBook;
window.editBook = editBook;

loadBooks();