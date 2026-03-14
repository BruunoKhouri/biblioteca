function mapOpenLibraryDoc(doc, isbn) {
  return {
    title: doc.title || null,
    author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : null,
    isbn: Array.isArray(doc.isbn) ? (doc.isbn.find((value) => value === isbn) || doc.isbn[0]) : isbn,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : null,
    city: Array.isArray(doc.publish_place) ? doc.publish_place[0] : null,
    published_year: Array.isArray(doc.publish_year) ? doc.publish_year[0] : null,
    category: Array.isArray(doc.subject) ? doc.subject[0] : null,
    language: Array.isArray(doc.language) ? doc.language[0] : null,
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    metadata_source: 'open_library',
    metadata_updated_at: new Date().toISOString()
  };
}

async function lookupByIsbn(isbn) {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('isbn', isbn);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open Library retornou ${response.status}`);
  }

  const data = await response.json();
  const doc = data.docs?.[0];
  return doc ? mapOpenLibraryDoc(doc, isbn) : null;
}

async function lookupByTitleAuthor(title, author) {
  const url = new URL('https://openlibrary.org/search.json');
  if (title) url.searchParams.set('title', title);
  if (author) url.searchParams.set('author', author);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open Library retornou ${response.status}`);
  }

  const data = await response.json();
  const doc = data.docs?.[0];
  return doc ? mapOpenLibraryDoc(doc) : null;
}

module.exports = {
  lookupByIsbn,
  lookupByTitleAuthor
};
