class BookCatalogue {
    constructor() {
        this.books = [];
        this.currentEditId = null;
        this.apiUrl = 'http://localhost:3000/api';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadBooks();
        this.updateStats();
        this.populateFilters();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterBooks();
        });

        // Filter functionality
        document.getElementById('genreFilter').addEventListener('change', () => {
            this.filterBooks();
        });

        document.getElementById('yearFilter').addEventListener('change', () => {
            this.filterBooks();
        });

        document.getElementById('sortBy').addEventListener('change', () => {
            this.filterBooks();
        });

        // Modal functionality
        document.getElementById('addBookBtn').addEventListener('click', () => {
            this.openModal();
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('bookModal')) {
                this.closeModal();
            }
        });

        // Form submission
        document.getElementById('bookForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBook();
        });
    }

    async loadBooks() {
        try {
            document.getElementById('loading').style.display = 'block';
            const response = await fetch(`${this.apiUrl}/books`);
            
            if (response.ok) {
                this.books = await response.json();
            } else {
                // If server is not available, use sample data
                this.books = this.getSampleBooks();
            }
            
            this.displayBooks(this.books);
        } catch (error) {
            console.log('Server not available, using sample data');
            this.books = this.getSampleBooks();
            this.displayBooks(this.books);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    getSampleBooks() {
        return [
            {
                id: 1,
                title: "To Kill a Mockingbird",
                author: "Harper Lee",
                genre: "Fiction",
                year: 1960,
                description: "A classic novel about racial injustice and moral growth in the American South.",
                isbn: "978-0-06-112008-4"
            },
            {
                id: 2,
                title: "1984",
                author: "George Orwell",
                genre: "Science Fiction",
                year: 1949,
                description: "A dystopian novel about totalitarianism and surveillance.",
                isbn: "978-0-452-28423-4"
            },
            {
                id: 3,
                title: "Pride and Prejudice",
                author: "Jane Austen",
                genre: "Romance",
                year: 1813,
                description: "A romantic novel about Elizabeth Bennet and Mr. Darcy.",
                isbn: "978-0-14-143951-8"
            },
            {
                id: 4,
                title: "The Great Gatsby",
                author: "F. Scott Fitzgerald",
                genre: "Fiction",
                year: 1925,
                description: "A story of decadence and excess in Jazz Age America.",
                isbn: "978-0-7432-7356-5"
            }
        ];
    }

    displayBooks(books) {
        const container = document.getElementById('booksContainer');
        const noBooks = document.getElementById('noBooks');

        if (books.length === 0) {
            container.innerHTML = '';
            noBooks.style.display = 'block';
            return;
        }

        noBooks.style.display = 'none';
        container.innerHTML = books.map(book => this.createBookCard(book)).join('');
    }

    createBookCard(book) {
        return `
            <div class="book-card" data-id="${book.id}">
                <div class="book-title">${book.title}</div>
                <div class="book-author">by ${book.author}</div>
                <div class="book-details">
                    ${book.year ? `Published: ${book.year}` : ''}
                    ${book.isbn ? `<br>ISBN: ${book.isbn}` : ''}
                    ${book.description ? `<br><br>${book.description}` : ''}
                </div>
                <div class="book-genre">${book.genre}</div>
                <div class="book-actions">
                    <button class="btn btn-small" onclick="bookCatalogue.editBook(${book.id})">Edit</button>
                    <button class="btn btn-secondary btn-small" onclick="bookCatalogue.deleteBook(${book.id})">Delete</button>
                </div>
            </div>
        `;
    }

    filterBooks() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const genreFilter = document.getElementById('genreFilter').value;
        const yearFilter = document.getElementById('yearFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        let filteredBooks = this.books.filter(book => {
            const matchesSearch = book.title.toLowerCase().includes(searchTerm) ||
                                book.author.toLowerCase().includes(searchTerm) ||
                                book.genre.toLowerCase().includes(searchTerm);
            
            const matchesGenre = !genreFilter || book.genre === genreFilter;
            const matchesYear = !yearFilter || book.year.toString() === yearFilter;

            return matchesSearch && matchesGenre && matchesYear;
        });

        // Sort books
        filteredBooks.sort((a, b) => {
            switch (sortBy) {
                case 'author':
                    return a.author.localeCompare(b.author);
                case 'year':
                    return (a.year || 0) - (b.year || 0);
                case 'newest':
                    return (b.year || 0) - (a.year || 0);
                default:
                    return a.title.localeCompare(b.title);
            }
        });

        this.displayBooks(filteredBooks);
    }

    populateFilters() {
        // Populate genre filter
        const genres = [...new Set(this.books.map(book => book.genre))];
        const genreFilter = document.getElementById('genreFilter');
        genreFilter.innerHTML = '<option value="">All Genres</option>';
        genres.forEach(genre => {
            genreFilter.innerHTML += `<option value="${genre}">${genre}</option>`;
        });

        // Populate year filter
        const years = [...new Set(this.books.map(book => book.year).filter(year => year))]
            .sort((a, b) => b - a);
        const yearFilter = document.getElementById('yearFilter');
        yearFilter.innerHTML = '<option value="">All Years</option>';
        years.forEach(year => {
            yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
        });
    }

    updateStats() {
        const totalBooks = this.books.length;
        const totalAuthors = new Set(this.books.map(book => book.author)).size;
        const totalGenres = new Set(this.books.map(book => book.genre)).size;

        document.getElementById('totalBooks').textContent = totalBooks;
        document.getElementById('totalAuthors').textContent = totalAuthors;
        document.getElementById('totalGenres').textContent = totalGenres;
    }

    openModal(book = null) {
        const modal = document.getElementById('bookModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('bookForm');

        if (book) {
            modalTitle.textContent = 'Edit Book';
            this.currentEditId = book.id;
            
            document.getElementById('bookTitle').value = book.title;
            document.getElementById('bookAuthor').value = book.author;
            document.getElementById('bookGenre').value = book.genre;
            document.getElementById('bookYear').value = book.year || '';
            document.getElementById('bookDescription').value = book.description || '';
            document.getElementById('bookISBN').value = book.isbn || '';
        } else {
            modalTitle.textContent = 'Add New Book';
            this.currentEditId = null;
            form.reset();
        }

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('bookModal').style.display = 'none';
        document.getElementById('bookForm').reset();
        this.currentEditId = null;
    }

    async saveBook() {
        const formData = new FormData(document.getElementById('bookForm'));
        const bookData = {
            title: formData.get('title'),
            author: formData.get('author'),
            genre: formData.get('genre'),
            year: parseInt(formData.get('year')) || null,
            description: formData.get('description'),
            isbn: formData.get('isbn')
        };

        try {
            let response;
            if (this.currentEditId) {
                response = await fetch(`${this.apiUrl}/books/${this.currentEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookData)
                });
            } else {
                response = await fetch(`${this.apiUrl}/books`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookData)
                });
            }

            if (response.ok) {
                await this.loadBooks();
                this.updateStats();
                this.populateFilters();
                this.closeModal();
            } else {
                // Fallback for when server is not available
                this.saveBookLocally(bookData);
            }
        } catch (error) {
            // Fallback for when server is not available
            this.saveBookLocally(bookData);
        }
    }

    saveBookLocally(bookData) {
        if (this.currentEditId) {
            const index = this.books.findIndex(book => book.id === this.currentEditId);
            if (index !== -1) {
                this.books[index] = { ...bookData, id: this.currentEditId };
            }
        } else {
            const newId = Math.max(...this.books.map(book => book.id), 0) + 1;
            this.books.push({ ...bookData, id: newId });
        }

        this.displayBooks(this.books);
        this.updateStats();
        this.populateFilters();
        this.closeModal();
    }

    editBook(id) {
        const book = this.books.find(book => book.id === id);
        if (book) {
            this.openModal(book);
        }
    }

    async deleteBook(id) {
        if (!confirm('Are you sure you want to delete this book?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/books/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadBooks();
                this.updateStats();
                this.populateFilters();
            } else {
                // Fallback for when server is not available
                this.deleteBookLocally(id);
            }
        } catch (error) {
            // Fallback for when server is not available
            this.deleteBookLocally(id);
        }
    }

    deleteBookLocally(id) {
        this.books = this.books.filter(book => book.id !== id);
        this.displayBooks(this.books);
        this.updateStats();
        this.populateFilters();
    }
}

// Initialize the application
const bookCatalogue = new BookCatalogue();