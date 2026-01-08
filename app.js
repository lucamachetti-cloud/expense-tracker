// Expense Tracker Application

class ExpenseTracker {
    constructor() {
        this.expenses = this.loadFromStorage('expenses') || [];
        this.budget = this.loadFromStorage('budget') || 0;
        this.categoryBudgets = this.loadFromStorage('categoryBudgets') || {};
        this.categoryChart = null;
        this.trendChart = null;
        this.editingId = null;
        this.csvData = null;
        this.csvHeaders = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCategoryBudgets();
        this.render();
        this.initCharts();
        this.setTodayDate();
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    setupEventListeners() {
        // Expense form
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExpenseSubmit();
        });

        // Cancel edit
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Budget form
        document.getElementById('budgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBudgetSubmit();
        });

        // Category budget form
        document.getElementById('categoryBudgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCategoryBudgetSubmit();
        });

        // Filters
        document.getElementById('filterStartDate').addEventListener('change', () => this.render());
        document.getElementById('filterEndDate').addEventListener('change', () => this.render());
        document.getElementById('filterCategory').addEventListener('change', () => this.render());
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());

        // Export
        document.getElementById('exportCSV').addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportJSON').addEventListener('click', () => this.exportToJSON());

        // Import
        document.getElementById('importCSVBtn').addEventListener('click', () => this.triggerCSVImport());
        document.getElementById('csvFileInput').addEventListener('change', (e) => this.handleCSVFile(e));
        document.getElementById('confirmImport').addEventListener('click', () => this.confirmCSVImport());
        document.getElementById('cancelImport').addEventListener('click', () => this.closeCSVModal());
        document.getElementById('csvModalClose').addEventListener('click', () => this.closeCSVModal());

        // Modal
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target.id === 'alertModal') {
                this.closeModal();
            }
            if (e.target.id === 'csvImportModal') {
                this.closeCSVModal();
            }
        });
    }

    handleExpenseSubmit() {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        const expense = {
            id: this.editingId || Date.now(),
            description,
            amount,
            category,
            date
        };

        if (this.editingId) {
            // Update existing expense
            const index = this.expenses.findIndex(e => e.id === this.editingId);
            this.expenses[index] = expense;
            this.editingId = null;
        } else {
            // Add new expense
            this.expenses.push(expense);
            this.checkBudgetAlert(amount);
            this.checkCategoryBudgetAlert(category, amount);
        }

        this.saveToStorage('expenses', this.expenses);
        this.resetForm();
        this.render();
    }

    editExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (expense) {
            this.editingId = id;
            document.getElementById('description').value = expense.description;
            document.getElementById('amount').value = expense.amount;
            document.getElementById('category').value = expense.category;
            document.getElementById('date').value = expense.date;
            document.getElementById('submitBtn').textContent = 'Update Expense';
            document.getElementById('cancelBtn').style.display = 'block';

            // Scroll to form
            document.getElementById('expenseForm').scrollIntoView({ behavior: 'smooth' });
        }
    }

    cancelEdit() {
        this.editingId = null;
        this.resetForm();
    }

    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            this.expenses = this.expenses.filter(e => e.id !== id);
            this.saveToStorage('expenses', this.expenses);
            this.render();
        }
    }

    resetForm() {
        document.getElementById('expenseForm').reset();
        document.getElementById('submitBtn').textContent = 'Add Expense';
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('expenseId').value = '';
        this.setTodayDate();
    }

    handleBudgetSubmit() {
        const budgetInput = document.getElementById('budgetInput').value;
        this.budget = parseFloat(budgetInput) || 0;
        this.saveToStorage('budget', this.budget);
        this.render();
        document.getElementById('budgetForm').reset();
    }

    loadCategoryBudgets() {
        const inputs = document.querySelectorAll('.category-budget-input');
        inputs.forEach(input => {
            const category = input.dataset.category;
            if (this.categoryBudgets[category]) {
                input.value = this.categoryBudgets[category];
            }
        });
    }

    handleCategoryBudgetSubmit() {
        const inputs = document.querySelectorAll('.category-budget-input');
        this.categoryBudgets = {};

        inputs.forEach(input => {
            const category = input.dataset.category;
            const amount = parseFloat(input.value) || 0;
            if (amount > 0) {
                this.categoryBudgets[category] = amount;
            }
        });

        this.saveToStorage('categoryBudgets', this.categoryBudgets);
        this.render();
        this.checkCategoryBudgetAlerts();
    }

    checkCategoryBudgetAlerts() {
        const categoryTotals = this.getCategoryTotals();
        const alerts = [];

        Object.keys(this.categoryBudgets).forEach(category => {
            const budget = this.categoryBudgets[category];
            const spent = categoryTotals[category] || 0;
            const percentage = (spent / budget) * 100;

            if (percentage >= 100) {
                alerts.push(`${this.getCategoryName(category)}: Exceeded by $${(spent - budget).toFixed(2)}`);
            } else if (percentage >= 80) {
                alerts.push(`${this.getCategoryName(category)}: ${percentage.toFixed(0)}% used`);
            }
        });

        if (alerts.length > 0) {
            this.showAlert('Category Budget Alerts:\n\n' + alerts.join('\n'));
        }
    }

    getFilteredExpenses() {
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;
        const category = document.getElementById('filterCategory').value;

        return this.expenses.filter(expense => {
            const matchesStartDate = !startDate || expense.date >= startDate;
            const matchesEndDate = !endDate || expense.date <= endDate;
            const matchesCategory = !category || expense.category === category;
            return matchesStartDate && matchesEndDate && matchesCategory;
        });
    }

    resetFilters() {
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('filterCategory').value = '';
        this.render();
    }

    calculateTotal(expenses = this.expenses) {
        return expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    getCategoryTotals(expenses = this.expenses) {
        const totals = {};
        expenses.forEach(expense => {
            totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
        });
        return totals;
    }

    checkBudgetAlert(newAmount) {
        if (this.budget === 0) return;

        const total = this.calculateTotal();
        const percentage = (total / this.budget) * 100;

        if (percentage >= 100) {
            this.showAlert(`You have exceeded your budget by $${(total - this.budget).toFixed(2)}!`);
        } else if (percentage >= 80) {
            this.showAlert(`Warning: You have used ${percentage.toFixed(0)}% of your budget.`);
        }
    }

    checkCategoryBudgetAlert(category, newAmount) {
        if (!this.categoryBudgets[category]) return;

        const categoryTotals = this.getCategoryTotals();
        const spent = categoryTotals[category] || 0;
        const budget = this.categoryBudgets[category];
        const percentage = (spent / budget) * 100;

        if (percentage >= 100) {
            this.showAlert(`${this.getCategoryName(category)} budget exceeded by $${(spent - budget).toFixed(2)}!`);
        } else if (percentage >= 80) {
            this.showAlert(`Warning: You have used ${percentage.toFixed(0)}% of your ${this.getCategoryName(category)} budget.`);
        }
    }

    showAlert(message) {
        document.getElementById('alertMessage').textContent = message;
        document.getElementById('alertModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('alertModal').style.display = 'none';
    }

    render() {
        this.renderSummary();
        this.renderCategoryBudgetStatus();
        this.renderExpenses();
        this.updateCharts();
    }

    renderSummary() {
        const filteredExpenses = this.getFilteredExpenses();
        const total = this.calculateTotal(filteredExpenses);
        const remaining = this.budget - total;

        document.getElementById('totalExpenses').textContent = `$${total.toFixed(2)}`;
        document.getElementById('budgetAmount').textContent = `$${this.budget.toFixed(2)}`;
        document.getElementById('remainingBudget').textContent = `$${remaining.toFixed(2)}`;

        // Add warning/exceeded classes
        const remainingElement = document.getElementById('remainingBudget');
        if (this.budget > 0) {
            const percentage = (total / this.budget) * 100;
            if (percentage >= 100) {
                remainingElement.style.color = '#e74c3c';
            } else if (percentage >= 80) {
                remainingElement.style.color = '#f39c12';
            } else {
                remainingElement.style.color = 'white';
            }
        }
    }

    renderCategoryBudgetStatus() {
        const categoryProgressList = document.getElementById('categoryProgressList');

        if (Object.keys(this.categoryBudgets).length === 0) {
            categoryProgressList.innerHTML = '<div class="empty-state"><p>Set category budgets to track spending by category.</p></div>';
            return;
        }

        const categoryTotals = this.getCategoryTotals();
        const categories = ['food', 'transport', 'shopping', 'entertainment', 'bills', 'health', 'other'];

        const html = categories
            .filter(category => this.categoryBudgets[category] && this.categoryBudgets[category] > 0)
            .map(category => {
                const budget = this.categoryBudgets[category];
                const spent = categoryTotals[category] || 0;
                const percentage = Math.min((spent / budget) * 100, 100);
                const remaining = budget - spent;

                let statusClass = '';
                if (percentage >= 100) {
                    statusClass = 'exceeded';
                } else if (percentage >= 80) {
                    statusClass = 'warning';
                }

                return `
                    <div class="category-progress-item">
                        <div class="category-progress-header">
                            <span class="category-progress-name">${this.getCategoryName(category)}</span>
                            <span class="category-progress-amounts">$${spent.toFixed(2)} / $${budget.toFixed(2)}</span>
                        </div>
                        <div class="category-progress-bar">
                            <div class="category-progress-fill ${statusClass}" style="width: ${percentage}%">
                                <span class="category-progress-percentage">${percentage.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('');

        categoryProgressList.innerHTML = html || '<div class="empty-state"><p>Set category budgets to track spending by category.</p></div>';
    }

    renderExpenses() {
        const expenseList = document.getElementById('expenseList');
        const filteredExpenses = this.getFilteredExpenses();

        if (filteredExpenses.length === 0) {
            expenseList.innerHTML = '<div class="empty-state"><p>No expenses found.</p></div>';
            return;
        }

        // Sort by date (most recent first)
        const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

        expenseList.innerHTML = sortedExpenses.map(expense => `
            <div class="expense-item">
                <div class="expense-details">
                    <div class="expense-description">${this.escapeHtml(expense.description)}</div>
                    <div class="expense-meta">${this.formatDate(expense.date)}</div>
                </div>
                <div class="expense-category category-${expense.category}">
                    ${this.getCategoryName(expense.category)}
                </div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <div class="expense-actions">
                    <button class="btn-icon btn-edit" onclick="tracker.editExpense(${expense.id})">Edit</button>
                    <button class="btn-icon btn-delete" onclick="tracker.deleteExpense(${expense.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    initCharts() {
        const ctxCategory = document.getElementById('categoryChart').getContext('2d');
        const ctxTrend = document.getElementById('trendChart').getContext('2d');

        this.categoryChart = new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#ffeaa7', '#dfe6e9', '#fab1a0', '#a29bfe',
                        '#fd79a8', '#81ecec', '#b2bec3'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.trendChart = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Spending',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        const filteredExpenses = this.getFilteredExpenses();

        // Update category chart
        const categoryTotals = this.getCategoryTotals(filteredExpenses);
        const categories = Object.keys(categoryTotals);
        const amounts = Object.values(categoryTotals);

        this.categoryChart.data.labels = categories.map(cat => this.getCategoryName(cat));
        this.categoryChart.data.datasets[0].data = amounts;
        this.categoryChart.update();

        // Update trend chart
        const dailyTotals = this.getDailyTotals(filteredExpenses);
        const dates = Object.keys(dailyTotals).sort();
        const dailyAmounts = dates.map(date => dailyTotals[date]);

        this.trendChart.data.labels = dates.map(date => this.formatDate(date));
        this.trendChart.data.datasets[0].data = dailyAmounts;
        this.trendChart.update();
    }

    getDailyTotals(expenses) {
        const totals = {};
        expenses.forEach(expense => {
            totals[expense.date] = (totals[expense.date] || 0) + expense.amount;
        });
        return totals;
    }

    exportToCSV() {
        if (this.expenses.length === 0) {
            alert('No expenses to export!');
            return;
        }

        const headers = ['Date', 'Description', 'Category', 'Amount'];
        const rows = this.expenses.map(expense => [
            expense.date,
            expense.description,
            this.getCategoryName(expense.category),
            expense.amount.toFixed(2)
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        this.downloadFile(csv, 'expenses.csv', 'text/csv');
    }

    exportToJSON() {
        if (this.expenses.length === 0) {
            alert('No expenses to export!');
            return;
        }

        const data = {
            budget: this.budget,
            expenses: this.expenses,
            exportDate: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, 'expenses.json', 'application/json');
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    getCategoryName(category) {
        const names = {
            food: 'Food & Dining',
            transport: 'Transportation',
            shopping: 'Shopping',
            entertainment: 'Entertainment',
            bills: 'Bills & Utilities',
            health: 'Healthcare',
            other: 'Other'
        };
        return names[category] || category;
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveToStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    loadFromStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // CSV Import Methods
    triggerCSVImport() {
        document.getElementById('csvFileInput').click();
    }

    handleCSVFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCSV(text);
        };
        reader.readAsText(file);
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            alert('CSV file is empty or invalid');
            return;
        }

        // Parse headers
        this.csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        // Parse data
        this.csvData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === this.csvHeaders.length) {
                this.csvData.push(values);
            }
        }

        if (this.csvData.length === 0) {
            alert('No valid data found in CSV');
            return;
        }

        this.showCSVMappingModal();
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    showCSVMappingModal() {
        // Show preview
        const preview = document.getElementById('csvPreview');
        const previewLines = this.csvData.slice(0, 3);
        preview.innerHTML = `
            <strong>Preview (first 3 rows):</strong><br>
            <strong>${this.csvHeaders.join(' | ')}</strong><br>
            ${previewLines.map(row => row.join(' | ')).join('<br>')}
        `;

        // Populate column dropdowns
        const dateSelect = document.getElementById('dateColumn');
        const descSelect = document.getElementById('descriptionColumn');
        const amountSelect = document.getElementById('amountColumn');

        [dateSelect, descSelect, amountSelect].forEach(select => {
            select.innerHTML = '<option value="">-- Select Column --</option>';
            this.csvHeaders.forEach((header, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = header;
                select.appendChild(option);
            });
        });

        // Auto-detect columns
        this.autoDetectColumns(dateSelect, descSelect, amountSelect);

        // Show modal
        document.getElementById('csvImportModal').style.display = 'block';
    }

    autoDetectColumns(dateSelect, descSelect, amountSelect) {
        this.csvHeaders.forEach((header, index) => {
            const lower = header.toLowerCase();
            if (lower.includes('date') || lower.includes('posted')) {
                dateSelect.value = index;
            } else if (lower.includes('description') || lower.includes('memo') || lower.includes('merchant')) {
                descSelect.value = index;
            } else if (lower.includes('amount') || lower.includes('debit') || lower.includes('withdrawal')) {
                amountSelect.value = index;
            }
        });
    }

    confirmCSVImport() {
        const dateCol = parseInt(document.getElementById('dateColumn').value);
        const descCol = parseInt(document.getElementById('descriptionColumn').value);
        const amountCol = parseInt(document.getElementById('amountColumn').value);
        const defaultCat = document.getElementById('defaultCategory').value;

        if (isNaN(dateCol) || isNaN(descCol) || isNaN(amountCol)) {
            alert('Please select all required columns');
            return;
        }

        let imported = 0;
        let skipped = 0;

        this.csvData.forEach(row => {
            try {
                const dateStr = row[dateCol].replace(/"/g, '');
                const description = row[descCol].replace(/"/g, '');
                const amountStr = row[amountCol].replace(/"/g, '').replace(/[^0-9.-]/g, '');

                // Parse date
                let date;
                if (dateStr.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
                    // MM/DD/YYYY format
                    const parts = dateStr.split('/');
                    const month = parts[0].padStart(2, '0');
                    const day = parts[1].padStart(2, '0');
                    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                    date = `${year}-${month}-${day}`;
                } else if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
                    // YYYY-MM-DD format
                    date = dateStr;
                } else {
                    skipped++;
                    return;
                }

                const amount = Math.abs(parseFloat(amountStr));

                if (isNaN(amount) || amount <= 0 || !description) {
                    skipped++;
                    return;
                }

                const expense = {
                    id: Date.now() + Math.random(),
                    description,
                    amount,
                    category: defaultCat,
                    date
                };

                this.expenses.push(expense);
                imported++;
            } catch (error) {
                skipped++;
            }
        });

        this.saveToStorage('expenses', this.expenses);
        this.render();
        this.closeCSVModal();

        alert(`Import complete!\nImported: ${imported} expenses\nSkipped: ${skipped} rows`);

        // Reset file input
        document.getElementById('csvFileInput').value = '';
    }

    closeCSVModal() {
        document.getElementById('csvImportModal').style.display = 'none';
        this.csvData = null;
        this.csvHeaders = null;
    }
}

// Initialize the application
const tracker = new ExpenseTracker();
