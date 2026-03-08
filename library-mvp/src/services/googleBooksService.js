const GOOGLE_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

function getApiKey() {
  return process.env.GOOGLE_BOOKS_API_KEY?.trim();
}

function buildUrl(query) {
  const url = new URL(GOOGLE_BASE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', '5');
  const apiKey = getApiKey();
  if (apiKey) {
    url.searchParams.set('key', apiKey);
  }
  return url.toString();
}

function extractBook(item) {
  const volumeInfo = item.volumeInfo || {};
  const saleInfo = item.saleInfo || {};
  const listPrice = saleInfo.listPrice || saleInfo.retailPrice || null;

  return {
    title: volumeInfo.title || null,
    author: Array.isArray(volumeInfo.authors) ? volumeInfo.authors.join(', ') : null,
    isbn: volumeInfo.industryIdentifiers?.find((id) => id.type?.includes('ISBN'))?.identifier || null,
    publisher: volumeInfo.publisher || null,
    published_year: volumeInfo.publishedDate ? Number(String(volumeInfo.publishedDate).slice(0, 4)) || null : null,
    category: Array.isArray(volumeInfo.categories) ? volumeInfo.categories[0] : null,
    language: volumeInfo.language || null,
    cover_url: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
    metadata_source: 'google_books',
    metadata_updated_at: new Date().toISOString(),
    price: listPrice ? Number(listPrice.amount) : null,
    price_currency: listPrice?.currencyCode || null,
    raw_saleability: saleInfo.saleability || null
  };
}

async function searchGoogleBooks(query) {
  const response = await fetch(buildUrl(query));
  if (!response.ok) {
    throw new Error(`Google Books retornou ${response.status}`);
  }
  const data = await response.json();
  return (data.items || []).map(extractBook);
}

async function lookupByIsbn(isbn) {
  const results = await searchGoogleBooks(`isbn:${isbn}`);
  return results[0] || null;
}

async function lookupByTitleAuthor(title, author) {
  const parts = [];
  if (title) parts.push(`intitle:${title}`);
  if (author) parts.push(`inauthor:${author}`);
  const query = parts.join('+') || title || author;
  const results = await searchGoogleBooks(query);
  return results[0] || null;
}

module.exports = {
  lookupByIsbn,
  lookupByTitleAuthor,
  searchGoogleBooks
};
