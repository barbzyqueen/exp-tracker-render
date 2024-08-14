document.addEventListener('DOMContentLoaded', () => {

    async function fetchUserData() {
        try {
            const response = await fetch('https://exp-tracker-render-latest.onrender.com/api/current-user', { credentials: 'include' });
            if (!response.ok) throw new Error('Not authenticated');
            const data = await response.json();
            document.getElementById('username').textContent = data.username;
        } catch (error) {
            console.error('Error fetching user info:', error);
            window.location.href = '/login.html';
        }
    }

    async function checkLogin() {
        try {
            const response = await fetch('https://exp-tracker-render-latest.onrender.com/api/check-session', { method: 'GET', credentials: 'include' });
            if (!response.ok) throw new Error('Not authenticated');
        } catch (err) {
            window.location.href = '/login.html';
        }
    }

    async function handleTransactionForm(e) {
        e.preventDefault();
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Submitting...';
        statusDiv.style.color = 'blue';

        const type = document.getElementById('type').checked ? 'income' : 'expense';
        const category = document.getElementById('category').value;
        const amount = document.getElementById('amount').value;
        const date = document.getElementById('date').value;

        try {
            const response = await fetch('https://exp-tracker-render-latest.onrender.com/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type, category, amount, date })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data || 'An error occurred');
            }

            statusDiv.textContent = 'Transaction added successfully';
            statusDiv.style.color = 'green';
            e.target.reset();
            loadTransactions();

        } catch (err) {
            statusDiv.textContent = `Error: ${err.message}`;
            statusDiv.style.color = 'red';
        }
    }

    async function handleEditForm(e) {
        e.preventDefault();
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Updating...';
        statusDiv.style.color = 'blue';

        const expenseId = document.getElementById('editExpenseId').value;
        const category = document.getElementById('editCategory').value;
        const amount = document.getElementById('editAmount').value;
        const date = document.getElementById('editDate').value;

        try {
            const response = await fetch(`https://exp-tracker-render-latest.onrender.com/api/expenses/${expenseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ category, amount, date })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data || 'An error occurred');
            }

            statusDiv.textContent = 'Expense updated successfully';
            statusDiv.style.color = 'green';
            e.target.reset();
            document.getElementById('editExpenseFormContainer').style.display = 'none';
            loadTransactions();

        } catch (err) {
            statusDiv.textContent = `Error: ${err.message}`;
            statusDiv.style.color = 'red';
        }
    }

    async function deleteTransaction(expenseId) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Deleting...';
        statusDiv.style.color = 'blue';

        try {
            const response = await fetch(`https://exp-tracker-render-latest.onrender.com/api/expenses/${expenseId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data || 'An error occurred');
            }

            statusDiv.textContent = 'Transaction deleted successfully';
            statusDiv.style.color = 'green';
            loadTransactions();

        } catch (err) {
            statusDiv.textContent = `Error: ${err.message}`;
            statusDiv.style.color = 'red';
        }
    }

    async function loadTransactions() {
        const transactionList = document.getElementById('transactionList');
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Loading...';
        statusDiv.style.color = 'blue';

        try {
            const response = await fetch('https://exp-tracker-render-latest.onrender.com/api/expenses', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data || 'An error occurred');
            }

            transactionList.innerHTML = '';
            data.forEach(expense => {
                const listItem = document.createElement('li');
                listItem.textContent = `${expense.category}: $${expense.amount} on ${expense.date}`;

                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.onclick = () => showEditForm(expense);
                listItem.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.onclick = () => deleteTransaction(expense.id);
                listItem.appendChild(deleteButton);

                transactionList.appendChild(listItem);
            });

            statusDiv.textContent = '';
        } catch (err) {
            statusDiv.textContent = `Error: ${err.message}`;
            statusDiv.style.color = 'red';
        }
    }

    function showEditForm(expense) {
        document.getElementById('editExpenseId').value = expense.id;
        document.getElementById('editCategory').value = expense.category;
        document.getElementById('editAmount').value = expense.amount;
        document.getElementById('editDate').value = expense.date;
        document.getElementById('editExpenseFormContainer').style.display = 'block';
    }

    async function handleLogout() {
        try {
            const response = await fetch('https://exp-tracker-render-latest.onrender.com/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = '/login.html';
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    fetchUserData();
    checkLogin();

    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionForm);
    }

    const editExpenseForm = document.getElementById('editExpenseForm');
    if (editExpenseForm) {
        editExpenseForm.addEventListener('submit', handleEditForm);
    }

    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    loadTransactions();
});
