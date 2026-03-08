const express = require('express');
const {
  listBooks,
  getBookById,
  getBookByIsbn,
  createBook,
  updateBook,
  deleteBook,
  updateBookMetadata,
  updateBookPrice,
  getPriceHistory
} = require('../services/bookService');
const { lookupMetadataByIsbn, lookupMetadataByBook } = require('../services/metadataService');
const { estimatePrice } = require('../services/priceService');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const books = await listBooks();
    res.json(books);
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const history = await getPriceHistory(req.query.book_id ? Number(req.query.book_id) : null);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

router.get('/isbn/:isbn/lookup', async (req, res, next) => {
  try {
    const metadata = await lookupMetadataByIsbn(req.params.isbn);
    res.json(metadata);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    let payload = { ...req.body };

    if (payload.lookup_by_isbn && payload.isbn) {
      const metadata = await lookupMetadataByIsbn(payload.isbn);
      payload = { ...metadata, ...payload, title: payload.title || metadata?.title };
    }

    const created = await createBook(payload);

    const metadata = await lookupMetadataByBook(created).catch(() => null);
    if (metadata) {
      await updateBookMetadata(created.id, metadata);
    }

    const pricedBookBase = await getBookById(created.id);
    const price = await estimatePrice(pricedBookBase).catch(() => null);

    if (price && typeof price.estimated_price === 'number') {
      await updateBookPrice(created.id, price);
    }

    const finalBook = await getBookById(created.id);
    res.status(201).json(finalBook);
  } catch (error) {
    next(error);
  }
});

router.get('/by-isbn/:isbn', async (req, res, next) => {
  try {
    const book = await getBookByIsbn(req.params.isbn);
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });
    res.json(book);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const book = await getBookById(Number(req.params.id));
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });
    res.json(book);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const updated = await updateBook(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteBook(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:id/enrich', async (req, res, next) => {
  try {
    const book = await getBookById(Number(req.params.id));
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

    const metadata = await lookupMetadataByBook(book);
    if (!metadata) {
      return res.status(404).json({ error: 'Metadados não encontrados.' });
    }

    const result = await updateBookMetadata(book.id, metadata);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/refresh-price', async (req, res, next) => {
  try {
    const book = await getBookById(Number(req.params.id));
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

    const price = await estimatePrice({ ...book, price_updated_at: null });
    const result = await updateBookPrice(book.id, price);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;