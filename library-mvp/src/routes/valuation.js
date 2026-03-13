const express = require('express');
const { listBooks, updateBookPrice, getBookById } = require('../services/bookService');
const { estimatePrice, isPriceCacheValid } = require('../services/priceService');
const { generateLibraryReport } = require('../services/reportService');

const router = express.Router();

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getBookFinalPrice(book) {
  const finalPrice = toNumber(book.final_price);
  if (finalPrice != null) return finalPrice;

  const manualPrice = toNumber(book.manual_price);
  if (manualPrice != null) return manualPrice;

  return toNumber(book.estimated_price);
}

function buildSummary(books) {
  const booksWithPrice = books
    .map((book) => {
      const price = getBookFinalPrice(book);
      return price == null ? null : { book, price };
    })
    .filter(Boolean);

  const totalValue = booksWithPrice.reduce((sum, entry) => sum + entry.price, 0);
  const mostValuableEntry = booksWithPrice.sort((a, b) => b.price - a.price)[0] || null;

  return {
    totalBooks: books.length,
    pricedBooks: booksWithPrice.length,
    totalValue: Number(totalValue.toFixed(2)),
    averageValue: booksWithPrice.length ? Number((totalValue / booksWithPrice.length).toFixed(2)) : 0,
    mostValuable: mostValuableEntry ? mostValuableEntry.book : null,
    byCategory: Object.values(
      booksWithPrice.reduce((acc, entry) => {
        const key = entry.book.category || 'Sem categoria';
        if (!acc[key]) {
          acc[key] = { category: key, total: 0, qty: 0 };
        }
        acc[key].qty += 1;
        acc[key].total += entry.price;
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
      if (book.manual_price != null) {
        results.push(book);
        continue;
      }

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
