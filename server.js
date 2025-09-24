// server.js - Node.js Backend for Book Catalogue

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
    
const app = express();
const PORT = process.env.PORT || 3000;
const BOOKS_FILE = path.join(__dirname, 'data', 'books.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Ensure data directory exists
const ensureDataDirectory = async () => {
    const dataDir = path.dirname(BOOKS_FILE);
    try {
        await fs.access(dataDir);
    } catch (error) {
        await fs.mkdir(dataDir, { recursive: true });
    }
};

// Initialize books data
const initializeBooksData = async () => {
    try {
        await fs.access(BOOKS_FILE);
    } catch (error) {
        // File doesn't exist, create it with sample data
        const sampleBooks = [
            {
                id: 1,
                title: "To Kill a Mockingbird",
                author: "Harper Lee",
                genre: "Fiction",
                year: 1960,
                description: "A classic novel about racial injustice and moral growth in the American South.",
                isbn: "978-0-06-112008-4",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "1984",
                author: "George Orwell",
                genre: "Science Fiction",
                year: 1949,
                description: "A dystopian novel about totalitarianism and surveillance.",
                isbn: "978-0-452-28423-4",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 3,
                title: "Pride and Prejudice",
                author: "Jane Austen",
                genre: "Romance",
                year: 1813,
                description: "A romantic novel about Elizabeth Bennet and Mr. Darcy.",
                isbn: "978-0-14-143951-8",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 4,
                title: "The Great Gatsby",
                author: "F. Scott Fitzgerald",
                genre: "Fiction",
                year: 1925,
                description: "A story of decadence and excess in Jazz Age America.",
                isbn: "978-0-7432-7356-5",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        await fs.writeFile(BOOKS_FILE, JSON.stringify(sampleBooks, null, 2));
    }
};

// Helper functions
const readBooks = async () => {
    try {
        const data = await fs.readFile(BOOKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeBooks = async (books) => {
    await fs.writeFile(BOOKS_FILE, JSON.stringify(books, null, 2));
};

const generateId = (books) => {
    return books.length > 0 ? Math.max(...books.map(book => book.id)) + 1 : 1;
};

const validateBook = (book) => {
    const errors = [];
    
    if (!book.title || book.title.trim().length === 0) {
        errors.push('Title is required');
    }
    
    if (!book.author || book.author.trim().length === 0) {
        errors.push('Author is required');
    }
    
    if (book.year && (book.year < 1000 || book.year > new Date().getFullYear())) {
        errors.push('Year must be between 1000 and current year');
    }
    
    if (book.isbn && !/^[\d-]{10,17}$/.test(book.isbn.replace(/[\s-]/g, ''))) {
        errors.push('Invalid ISBN format');
    }
    
    return errors;
};

// API Routes

// GET /api/books - Get all books with optional filtering
app.get('/api/books', async (req, res) => {
    try {
        const books = await readBooks();
        const { search, genre, year, author, limit, offset } = req.query;
        
        let filteredBooks = books;
        
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            filteredBooks = filteredBooks.filter(book =>
                book.title.toLowerCase().includes(searchLower) ||
                book.author.toLowerCase().includes(searchLower) ||
                book.genre.toLowerCase().includes(searchLower) ||
                (book.description && book.description.toLowerCase().includes(searchLower))
            );
        }
        
        if (genre) {
            filteredBooks = filteredBooks.filter(book => book.genre === genre);
        }
        
        if (year) {
            filteredBooks = filteredBooks.filter(book => book.year == year);
        }
        
        if (author) {
            filteredBooks = filteredBooks.filter(book =>
                book.author.toLowerCase().includes(author.toLowerCase())
            );
        }
        
        // Apply pagination
        const total = filteredBooks.length;
        if (limit) {
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset) || 0;
            filteredBooks = filteredBooks.slice(offsetNum, offsetNum + limitNum);
        }
        
        res.json({
            books: filteredBooks,
            total,
            count: filteredBooks.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});

// GET /api/books/:id - Get a specific book
app.get('/api/books/:id', async (req, res) => {
    try {
        const books = await readBooks();
        const book = books.find(b => b.id === parseInt(req.params.id));
        
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        res.json(book);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch book' });
    }
});

// POST /api/books - Create a new book
app.post('/api/books', async (req, res) => {
    try {
        const bookData = req.body;
        const errors = validateBook(bookData);
        
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        const books = await readBooks();
        
        // Check for duplicate title by same author
        const duplicate = books.find(book =>
            book.title.toLowerCase() === bookData.title.toLowerCase() &&
            book.author.toLowerCase() === bookData.author.toLowerCase()
        );
        
        if (duplicate) {
            return res.status(400).json({ error: 'Book with same title and author already exists' });
        }
        
        const newBook = {
            id: generateId(books),
            title: bookData.title.trim(),
            author: bookData.author.trim(),
            genre: bookData.genre || 'Other',
            year: bookData.year || null,
            description: bookData.description ? bookData.description.trim() : '',
            isbn: bookData.isbn ? bookData.isbn.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        books.push(newBook);
        await writeBooks(books);
        
        res.status(201).json(newBook);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create book' });
    }
});

// PUT /api/books/:id - Update a book
app.put('/api/books/:id', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const bookData = req.body;
        
        const errors = validateBook(bookData);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        const books = await readBooks();
        const bookIndex = books.findIndex(b => b.id === bookId);
        
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // Check for duplicate title by same author (excluding current book)
        const duplicate = books.find(book =>
            book.id !== bookId &&
            book.title.toLowerCase() === bookData.title.toLowerCase() &&
            book.author.toLowerCase() === bookData.author.toLowerCase()
        );
        
        if (duplicate) {
            return res.status(400).json({ error: 'Book with same title and author already exists' });
        }
        
        const updatedBook = {
            ...books[bookIndex],
            title: bookData.title.trim(),
            author: bookData.author.trim(),
            genre: bookData.genre || 'Other',
            year: bookData.year || null,
            description: bookData.description ? bookData.description.trim() : '',
            isbn: bookData.isbn ? bookData.isbn.trim() : '',
            updatedAt: new Date().toISOString()
        };
        
        books[bookIndex] = updatedBook;
        await writeBooks(books);
        
        res.json(updatedBook);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update book' });
    }
});

// DELETE /api/books/:id - Delete a book
app.delete('/api/books/:id', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const books = await readBooks();
        const bookIndex = books.findIndex(b => b.id === bookId);
        
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        const deletedBook = books[bookIndex];
        books.splice(bookIndex, 1);
        await writeBooks(books);
        
        res.json({ message: 'Book deleted successfully', book: deletedBook });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

// GET /api/stats - Get catalogue statistics
app.get('/api/stats', async (req, res) => {
    try {
        const books = await readBooks();
        
        const stats = {
            totalBooks: books.length,
            totalAuthors: new Set(books.map(book => book.author)).size,
            totalGenres: new Set(books.map(book => book.genre)).size,
            genreDistribution: {},
            yearDistribution: {},
            recentlyAdded: books
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
        };
        
        // Calculate genre distribution
        books.forEach(book => {
            stats.genreDistribution[book.genre] = (stats.genreDistribution[book.genre] || 0) + 1;
        });
        
        // Calculate year distribution
        books.forEach(book => {
            if (book.year) {
                const decade = Math.floor(book.year / 10) * 10;
                const decadeLabel = `${decade}s`;
                stats.yearDistribution[decadeLabel] = (stats.yearDistribution[decadeLabel] || 0) + 1;
            }
        });
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/genres - Get all unique genres
app.get('/api/genres', async (req, res) => {
    try {
        const books = await readBooks();
        const genres = [...new Set(books.map(book => book.genre))].sort();
        res.json(genres);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

// GET /api/authors - Get all unique authors
app.get('/api/authors', async (req, res) => {
    try {
        const books = await readBooks();
        const authors = [...new Set(books.map(book => book.author))].sort();
        res.json(authors);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch authors' });
    }
});

// Bulk operations

// POST /api/books/bulk - Add multiple books
app.post('/api/books/bulk', async (req, res) => {
    try {
        const booksData = req.body.books;
        
        if (!Array.isArray(booksData)) {
            return res.status(400).json({ error: 'Books data must be an array' });
        }
        
        const books = await readBooks();
        const results = {
            success: [],
            errors: []
        };
        
        for (let i = 0; i < booksData.length; i++) {
            const bookData = booksData[i];
            const errors = validateBook(bookData);
            
            if (errors.length > 0) {
                results.errors.push({ index: i, errors });
                continue;
            }
            
            // Check for duplicates
            const duplicate = books.find(book =>
                book.title.toLowerCase() === bookData.title.toLowerCase() &&
                book.author.toLowerCase() === bookData.author.toLowerCase()
            );
            
            if (duplicate) {
                results.errors.push({ 
                    index: i, 
                    errors: ['Book with same title and author already exists'] 
                });
                continue;
            }
            
            const newBook = {
                id: generateId(books),
                title: bookData.title.trim(),
                author: bookData.author.trim(),
                genre: bookData.genre || 'Other',
                year: bookData.year || null,
                description: bookData.description ? bookData.description.trim() : '',
                isbn: bookData.isbn ? bookData.isbn.trim() : '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            books.push(newBook);
            results.success.push(newBook);
        }
        
        if (results.success.length > 0) {
            await writeBooks(books);
        }
        
        res.status(201).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to process bulk operation' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize and start server
const startServer = async () => {
    try {
        await ensureDataDirectory();
        await initializeBooksData();
        
        app.listen(PORT, () => {
            console.log(`📚 Book Catalogue Server running on http://localhost:${PORT}`);
            console.log(`📁 Data file: ${BOOKS_FILE}`);
            console.log('\n🚀 API Endpoints:');
            console.log('  GET    /api/books        - Get all books');
            console.log('  GET    /api/books/:id    - Get book by ID');
            console.log('  POST   /api/books        - Create new book');
            console.log('  PUT    /api/books/:id    - Update book');
            console.log('  DELETE /api/books/:id    - Delete book');
            console.log('  GET    /api/stats        - Get statistics');
            console.log('  GET    /api/genres       - Get all genres');
            console.log('  GET    /api/authors      - Get all authors');
            console.log('  POST   /api/books/bulk   - Bulk add books');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();