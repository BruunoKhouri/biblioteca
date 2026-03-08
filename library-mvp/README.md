# Sistema de Biblioteca — MVP 1

Aplicação em **Node.js + HTML/CSS/JS** para:

- cadastrar livros manualmente ou por ISBN;
- buscar metadados automaticamente;
- listar o catálogo;
- estimar o valor da biblioteca;
- usar cache de preço por 7 dias;
- manter histórico de valorização;
- exportar relatório em PDF.

## Tecnologias

- Node.js
- Express
- SQLite
- PDFKit
- Google Books API
- Open Library (fallback de metadados)

## Como rodar

```bash
npm install
cp .env.example .env
npm start
```

Depois abra:

- `http://localhost:3000/catalog.html`
- `http://localhost:3000/valuation.html`

## Variáveis de ambiente

```env
PORT=3000
GOOGLE_BOOKS_API_KEY=
PRICE_CACHE_DAYS=7
DEFAULT_CURRENCY=BRL
```

> A chave do Google Books é opcional, mas recomendada para maior estabilidade.

## Estrutura

```text
library-mvp/
├── public/
│   ├── catalog.html
│   ├── valuation.html
│   ├── css/style.css
│   └── js/
│       ├── catalog.js
│       └── valuation.js
├── src/
│   ├── db.js
│   ├── routes/
│   │   ├── books.js
│   │   └── valuation.js
│   └── services/
│       ├── bookService.js
│       ├── googleBooksService.js
│       ├── metadataService.js
│       ├── openLibraryService.js
│       ├── priceService.js
│       └── reportService.js
├── .env.example
├── package.json
└── server.js
```

## Fluxo do preço

1. tenta achar o livro pelo ISBN no Google Books;
2. se não achar, tenta por título + autor;
3. se houver preços em múltiplos resultados, calcula uma mediana simples;
4. salva o valor estimado em cache por 7 dias;
5. quando o valor muda, grava uma linha em `price_history`.

## Observações

- O fallback externo de preço está implementado como **busca ampliada no Google Books** quando não há correspondência direta.
- O fallback de metadados usa **Open Library**.
- Para precificação mais precisa no Brasil, o próximo passo seria integrar uma fonte de marketplace com API própria.
