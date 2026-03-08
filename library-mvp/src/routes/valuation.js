const express = require('express');
const { listBooks, updateBookPrice, getBookById } = require('../services/bookService');
const { estimatePrice, isPriceCacheValid } = require('../services/priceService');
const { generateLibraryReport } = require('../services/reportService');

const router = express.Router();

function buildSummary(books) {
  const pricedBooks = books.filter((book) => typeof book.estimated_price === 'number');
  const totalValue = pricedBooks.reduce((sum, book) => sum + book.estimated_price, 0);

  return {
    totalBooks: books.length,
    pricedBooks: pricedBooks.length,
    totalValue: Number(totalValue.toFixed(2)),
    averageValue: pricedBooks.length ? Number((totalValue / pricedBooks.length).toFixed(2)) : 0,
    mostValuable: pricedBooks.sort((a, b) => b.estimated_price - a.estimated_price)[0] || null,
    byCategory: Object.values(
      books.reduce((acc, book) => {
        const key = book.category || 'Sem categoria';
        if (!acc[key]) {
          acc[key] = { category: key, total: 0, qty: 0 };
        }
        acc[key].qty += 1;
        acc[key].total += book.estimated_price || 0;
        return acc;
      }, {})
    )
      .map((item) => ({ ...item, total: Number(item.total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
  };
}

router.post('/refresh', async (_req, res, next) => {
  try {
    const books = await listBooks();
    const results = [];

    for (const book of books) {
      if (!isPriceCacheValid(book)) {
        const price = await estimatePrice(book);
        await updateBookPrice(book.id, price);
      }
      results.push(await getBookById(book.id));
    }

    res.json({
      updated: results.length,
      summary: buildSummary(results),
      books: results
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (_req, res, next) => {
  try {
    const books = await listBooks();
    res.json(buildSummary(books));
  } catch (error) {
    next(error);
  }
});

router.get('/report.pdf', async (_req, res, next) => {
  try {
    const books = await listBooks();
    const summary = buildSummary(books);
    generateLibraryReport(res, summary, books);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
