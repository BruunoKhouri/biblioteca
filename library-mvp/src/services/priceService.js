const { lookupByIsbn: lookupGoogleByIsbn, lookupByTitleAuthor: lookupGoogleByTitleAuthor, searchGoogleBooks } = require('./googleBooksService');

function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000;
}

function isPriceCacheValid(book) {
  if (!book.price_updated_at || typeof book.estimated_price !== 'number') return false;
  const maxDays = Number(process.env.PRICE_CACHE_DAYS || 7);
  const age = Date.now() - new Date(book.price_updated_at).getTime();
  return age <= daysToMs(maxDays);
}

function toBrl(value, currency) {
  if (typeof value !== 'number') return null;
  if (!currency || currency === 'BRL') return Number(value.toFixed(2));

  const fx = {
    USD: 5.0,
    EUR: 5.4,
    GBP: 6.3
  };

  const rate = fx[currency] || 1;
  return Number((value * rate).toFixed(2));
}

async function estimatePrice(book) {
  if (isPriceCacheValid(book)) {
    return {
      estimated_price: book.estimated_price,
      price_currency: book.price_currency || 'BRL',
      price_source: book.price_source || 'cache',
      price_confidence: book.price_confidence || 'alta',
      price_updated_at: book.price_updated_at,
      cache_hit: true
    };
  }

  let googleMatch = null;
  if (book.isbn) {
    googleMatch = await lookupGoogleByIsbn(book.isbn);
  }
  if (!googleMatch) {
    googleMatch = await lookupGoogleByTitleAuthor(book.title, book.author);
  }

  if (googleMatch?.price) {
    return {
      estimated_price: toBrl(googleMatch.price, googleMatch.price_currency),
      price_currency: 'BRL',
      price_source: 'google_books',
      price_confidence: book.isbn ? 'alta' : 'media',
      price_updated_at: new Date().toISOString(),
      cache_hit: false
    };
  }

  const candidates = await searchGoogleBooks([book.title, book.author].filter(Boolean).join(' '));
  const candidatePrices = candidates
    .map((item) => toBrl(item.price, item.price_currency))
    .filter((price) => typeof price === 'number' && price > 0)
    .sort((a, b) => a - b);

  if (candidatePrices.length > 0) {
    const middle = Math.floor(candidatePrices.length / 2);
    const median = candidatePrices.length % 2 === 0
      ? Number(((candidatePrices[middle - 1] + candidatePrices[middle]) / 2).toFixed(2))
      : candidatePrices[middle];

    return {
      estimated_price: median,
      price_currency: 'BRL',
      price_source: 'google_books_median',
      price_confidence: candidatePrices.length >= 3 ? 'media' : 'baixa',
      price_updated_at: new Date().toISOString(),
      cache_hit: false
    };
  }

  return {
    estimated_price: null,
    price_currency: 'BRL',
    price_source: 'indisponivel',
    price_confidence: 'baixa',
    price_updated_at: new Date().toISOString(),
    cache_hit: false
  };
}

module.exports = {
  estimatePrice,
  isPriceCacheValid
};
