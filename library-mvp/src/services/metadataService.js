const googleBooksService = require('./googleBooksService');
const openLibraryService = require('./openLibraryService');

async function lookupMetadataByIsbn(isbn) {
  const google = await googleBooksService.lookupByIsbn(isbn);
  if (google) return google;

  const openLibrary = await openLibraryService.lookupByIsbn(isbn);
  if (openLibrary) return openLibrary;

  return null;
}

async function lookupMetadataByBook(book) {
  if (book.isbn) {
    const byIsbn = await lookupMetadataByIsbn(book.isbn);
    if (byIsbn) return byIsbn;
  }

  const google = await googleBooksService.lookupByTitleAuthor(book.title, book.author);
  if (google) return google;

  const openLibrary = await openLibraryService.lookupByTitleAuthor(book.title, book.author);
  if (openLibrary) return openLibrary;

  return null;
}

module.exports = {
  lookupMetadataByIsbn,
  lookupMetadataByBook
};
