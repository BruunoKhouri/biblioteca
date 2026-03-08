const { getDb } = require('../db');

function parseManualPrice(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBookPayload(payload) {
  return {
    title: payload.title?.trim() || null,
    author: payload.author?.trim() || null,
    isbn: payload.isbn?.replace(/[^0-9Xx]/g, '') || null,
    publisher: payload.publisher?.trim() || null,
    published_year:
      payload.published_year !== undefined &&
      payload.published_year !== null &&
      payload.published_year !== ''
        ? Number(payload.published_year)
        : null,
    category: payload.category?.trim() || null,
    language: payload.language?.trim() || null,
    manual_price: parseManualPrice(payload.manual_price),
    shelf_location: payload.shelf_location?.trim() || null,
    status: payload.status?.trim() || 'nao_lido',
    cover_url: payload.cover_url?.trim() || null,
    notes: payload.notes?.trim() || null
  };
}

function decorateBookPrice(book) {
  if (!book) return book;

  return {
    ...book,
    final_price: book.manual_price ?? book.estimated_price ?? null,
    final_price_source: book.manual_price != null ? 'manual' : (book.price_source || null)
  };
}

async function listBooks() {
  const db = getDb();
  const books = await db.all(`
    SELECT * FROM books
    ORDER BY created_at DESC, id DESC
  `);

  return books.map(decorateBookPrice);
}

async function getBookById(id) {
  const db = getDb();
  const book = await db.get(`SELECT * FROM books WHERE id = ?`, [id]);
  return decorateBookPrice(book);
}

async function getBookByIsbn(isbn) {
  const db = getDb();
  const normalizedIsbn = isbn?.replace(/[^0-9Xx]/g, '');
  const book = await db.get(`SELECT * FROM books WHERE isbn = ?`, [normalizedIsbn]);
  return decorateBookPrice(book);
}

async function createBook(payload) {
  const db = getDb();
  const book = normalizeBookPayload(payload);

  if (!book.title) {
    throw new Error('Título é obrigatório.');
  }

  const result = await db.run(
    `INSERT INTO books (
      title,
      author,
      isbn,
      publisher,
      published_year,
      category,
      language,
      manual_price,
      shelf_location,
      status,
      cover_url,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.title,
      book.author,
      book.isbn,
      book.publisher,
      book.published_year,
      book.category,
      book.language,
      book.manual_price,
      book.shelf_location,
      book.status,
      book.cover_url,
      book.notes
    ]
  );

  return getBookById(result.lastID);
}

async function updateBook(id, payload) {
  const db = getDb();
  const existing = await db.get(`SELECT * FROM books WHERE id = ?`, [id]);

  if (!existing) {
    throw new Error('Livro não encontrado.');
  }

  const merged = {
    ...existing,
    ...payload
  };

  const next = normalizeBookPayload(merged);

  if (!next.title) {
    throw new Error('Título é obrigatório.');
  }

  await db.run(
    `UPDATE books SET
      title = ?,
      author = ?,
      isbn = ?,
      publisher = ?,
      published_year = ?,
      category = ?,
      language = ?,
      manual_price = ?,
      shelf_location = ?,
      status = ?,
      cover_url = ?,
      notes = ?
    WHERE id = ?`,
    [
      next.title,
      next.author,
      next.isbn,
      next.publisher,
      next.published_year,
      next.category,
      next.language,
      next.manual_price,
      next.shelf_location,
      next.status,
      next.cover_url,
      next.notes,
      id
    ]
  );

  return getBookById(id);
}

async function deleteBook(id) {
  const db = getDb();
  await db.run(`DELETE FROM books WHERE id = ?`, [id]);
}

async function updateBookMetadata(id, metadata) {
  const db = getDb();

  await db.run(
    `UPDATE books SET
      title = COALESCE(?, title),
      author = COALESCE(?, author),
      isbn = COALESCE(?, isbn),
      publisher = COALESCE(?, publisher),
      published_year = COALESCE(?, published_year),
      category = COALESCE(?, category),
      language = COALESCE(?, language),
      cover_url = COALESCE(?, cover_url),
      metadata_source = ?,
      metadata_updated_at = ?
    WHERE id = ?`,
    [
      metadata.title || null,
      metadata.author || null,
      metadata.isbn || null,
      metadata.publisher || null,
      metadata.published_year || null,
      metadata.category || null,
      metadata.language || null,
      metadata.cover_url || null,
      metadata.metadata_source || null,
      metadata.metadata_updated_at || new Date().toISOString(),
      id
    ]
  );

  return getBookById(id);
}

async function updateBookPrice(id, priceData) {
  const db = getDb();
  const current = await db.get(`SELECT * FROM books WHERE id = ?`, [id]);

  if (!current) {
    throw new Error('Livro não encontrado.');
  }

  await db.run(
    `UPDATE books SET
      estimated_price = ?,
      price_currency = ?,
      price_source = ?,
      price_confidence = ?,
      price_updated_at = ?
    WHERE id = ?`,
    [
      priceData.estimated_price ?? null,
      priceData.price_currency || 'BRL',
      priceData.price_source || null,
      priceData.price_confidence || null,
      priceData.price_updated_at || new Date().toISOString(),
      id
    ]
  );

  if (typeof priceData.estimated_price === 'number') {
    const shouldStoreHistory = current.estimated_price !== priceData.estimated_price;

    if (shouldStoreHistory) {
      await db.run(
        `INSERT INTO price_history (book_id, price, currency, source, confidence)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          priceData.estimated_price,
          priceData.price_currency || 'BRL',
          priceData.price_source || null,
          priceData.price_confidence || null
        ]
      );
    }
  }

  return getBookById(id);
}

async function getPriceHistory(bookId = null) {
  const db = getDb();

  if (bookId) {
    return db.all(
      `SELECT ph.*, b.title
       FROM price_history ph
       JOIN books b ON b.id = ph.book_id
       WHERE ph.book_id = ?
       ORDER BY ph.created_at DESC`,
      [bookId]
    );
  }

  return db.all(
    `SELECT ph.*, b.title
     FROM price_history ph
     JOIN books b ON b.id = ph.book_id
     ORDER BY ph.created_at DESC`
  );
}

module.exports = {
  listBooks,
  getBookById,
  getBookByIsbn,
  createBook,
  updateBook,
  deleteBook,
  updateBookMetadata,
  updateBookPrice,
  getPriceHistory
};