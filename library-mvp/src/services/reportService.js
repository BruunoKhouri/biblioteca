const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function generateLibraryReport(res, summary, books) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio-biblioteca.pdf"');

  doc.pipe(res);

  doc.fontSize(22).text('Relatório da Biblioteca', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  doc.moveDown();

  doc.fontSize(14).text('Resumo geral');
  doc.fontSize(11)
    .text(`Quantidade de livros: ${summary.totalBooks}`)
    .text(`Livros com preço estimado: ${summary.pricedBooks}`)
    .text(`Valor total estimado: ${formatCurrency(summary.totalValue)}`)
    .text(`Valor médio por livro precificado: ${formatCurrency(summary.averageValue)}`);

  doc.moveDown();
  doc.fontSize(14).text('Livros cadastrados');
  doc.moveDown(0.5);

  books.forEach((book, index) => {
    doc
      .fontSize(11)
      .text(`${index + 1}. ${book.title}`)
      .fontSize(10)
      .text(`Autor: ${book.author || '—'}`)
      .text(`ISBN: ${book.isbn || '—'}`)
      .text(`Status: ${book.status || '—'}`)
      .text(`Valor estimado: ${formatCurrency(book.estimated_price || 0)}`)
      .text(`Fonte: ${book.price_source || '—'}`)
      .moveDown(0.5);

    if (doc.y > 720) {
      doc.addPage();
    }
  });

  doc.end();
}

module.exports = {
  generateLibraryReport
};
