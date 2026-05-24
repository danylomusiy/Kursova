const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db'); 

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));
app.use('/img', express.static(path.join(__dirname, 'img')));

// --- 1. ТОВАРИ ДЛЯ ВІТРИНИ ---
app.get('/products', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                pv.variant_id AS id, 
                pm.model_name, 
                pv.power_value, 
                pv.price, 
                pv.stock_quantity, 
                c.name AS cat_name,
                pm.description
            FROM Product_Variants pv
            JOIN Product_Models pm ON pv.model_id = pm.model_id
            JOIN Categories c ON pm.category_id = c.category_id
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка бази даних при завантаженні товарів" });
    }
});

// --- 2. АВТОРИЗАЦІЯ КОРИСТУВАЧІВ ---
app.post('/api/auth/login', async (req, res) => {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: "Електронна пошта обов'язкова" });

    try {
        const [userCheck] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (userCheck.length > 0) {
            return res.json({ user_id: userCheck[0].user_id, email: userCheck[0].email, role: userCheck[0].role }); 
        }

        const [insertResult] = await db.query(
            'INSERT INTO Users (email, password_hash, role) VALUES (?, ?, ?)', 
            [email, 'default_hash_123', role || 'customer']
        );
        res.status(201).json({ user_id: insertResult.insertId, email, role: role || 'customer' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка бази даних: " + err.message });
    }
});

// --- 3. СПИСОК БАЖАНОГО В БД ---
app.get('/api/wishlist/:userId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT variant_id FROM Wishlist WHERE user_id = ?', [req.params.userId]);
        res.json(rows.map(r => r.variant_id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/wishlist/toggle', async (req, res) => {
    const { user_id, variant_id } = req.body;
    try {
        const [check] = await db.query('SELECT * FROM Wishlist WHERE user_id = ? AND variant_id = ?', [user_id, variant_id]);
        if (check.length > 0) {
            await db.query('DELETE FROM Wishlist WHERE user_id = ? AND variant_id = ?', [user_id, variant_id]);
            res.json({ status: 'removed' });
        } else {
            await db.query('INSERT INTO Wishlist (user_id, variant_id) VALUES (?, ?)', [user_id, variant_id]);
            res.json({ status: 'added' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. ВІДГУКИ З БД ---
app.get('/api/reviews', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.rating, r.review_text, r.review_date, u.email AS author 
            FROM Reviews r 
            JOIN Users u ON r.user_id = u.user_id 
            ORDER BY r.review_date DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reviews', async (req, res) => {
    const { user_id, rating, review_text } = req.body;
    try {
        await db.query('INSERT INTO Reviews (user_id, rating, review_text) VALUES (?, ?, ?)', [user_id, rating, review_text]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. ЗАМОВЛЕННЯ ПОКУПЦІВ ---
app.post('/orders', async (req, res) => {
    const { items, customer_data, total_amount } = req.body;
    try {
        const [custResult] = await db.query(
            'INSERT INTO Customers (first_name, last_name, phone, address) VALUES (?, ?, ?, ?)',
            [customer_data.first_name, customer_data.last_name, customer_data.phone, customer_data.address]
        );
        const customerId = custResult.insertId;
        const [orderResult] = await db.query('INSERT INTO Orders (customer_id, status, total_amount) VALUES (?, ?, ?)', [customerId, 'Нове', total_amount]);
        const orderId = orderResult.insertId;

        for (let item of items) {
            await db.query('INSERT INTO Order_Items (order_id, variant_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)', [orderId, item.id, item.quantity, item.price]);
            await db.query('UPDATE Product_Variants SET stock_quantity = stock_quantity - ? WHERE variant_id = ?', [item.quantity, item.id]);
        }
        res.json({ success: true, orderId });
    } catch (err) { res.status(500).json({ error: "Помилка оформлення" }); }
});

app.get('/customer/order-history', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT o.order_id, o.order_date, o.status, o.total_amount, GROUP_CONCAT(CONCAT(pm.model_name, ' (', oi.quantity, ' шт.)') SEPARATOR ', ') AS order_items
            FROM Orders o JOIN Customers c ON o.customer_id = c.customer_id JOIN Order_Items oi ON o.order_id = oi.order_id
            JOIN Product_Variants pv ON oi.variant_id = pv.variant_id JOIN Product_Models pm ON pv.model_id = pm.model_id
            WHERE c.phone = ? GROUP BY o.order_id ORDER BY o.order_date DESC
        `, [req.query.phone]);
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ error: "Помилка історії" }); 
    }
});

// --- 6. МЕНЕДЖЕРСЬКА ПАНЕЛЬ ---
app.get('/admin/orders-list', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT o.*, c.first_name, c.last_name, c.phone, c.address, GROUP_CONCAT(pm.model_name SEPARATOR '||') AS items_names, GROUP_CONCAT(pv.variant_id SEPARATOR '||') AS items_ids
            FROM Orders o JOIN Customers c ON o.customer_id = c.customer_id JOIN Order_Items oi ON o.order_id = oi.order_id
            JOIN Product_Variants pv ON oi.variant_id = pv.variant_id JOIN Product_Models pm ON pv.model_id = pm.model_id GROUP BY o.order_id ORDER BY o.order_date DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Помилка замовлень" }); }
});

app.post('/admin/add-product', async (req, res) => {
    const { category_id, model_name, power_value, price, stock_quantity, description } = req.body;
    const generatedSku = 'LT-' + Math.floor(Math.random() * 900000 + 100000); 
    try {
        const [modelResult] = await db.query('INSERT INTO Product_Models (category_id, model_name, description) VALUES (?, ?, ?)', [category_id, model_name, description || null]);
        await db.query('INSERT INTO Product_Variants (model_id, sku, power_value, price, stock_quantity) VALUES (?, ?, ?, ?, ?)', [modelResult.insertId, generatedSku, power_value || null, price, stock_quantity || 0]);
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: "Помилка додавання товару" }); }
});

app.put('/admin/update-product/:id', async (req, res) => {
    try {
        await db.query('UPDATE Product_Variants SET price = ?, stock_quantity = ? WHERE variant_id = ?', [req.body.price, req.body.stock, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Помилка оновлення" }); }
});

app.delete('/admin/delete-product/:id', async (req, res) => {
    try {
        const [productCheck] = await db.query('SELECT model_id FROM Product_Variants WHERE variant_id = ?', [req.params.id]);
        if (productCheck.length === 0) return res.status(404).json({ error: "Не знайдено" });
        await db.query('DELETE FROM Product_Variants WHERE variant_id = ?', [req.params.id]);
        await db.query('DELETE FROM Product_Models WHERE model_id = ?', [productCheck[0].model_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Помилка видалення" }); }
});

app.post('/admin/orders/complete/:id', async (req, res) => {
    try { await db.query('UPDATE Orders SET status = ? WHERE order_id = ?', ['Завершено', req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Помилка" }); }
});

app.post('/admin/orders/cancel/:id', async (req, res) => {
    try {
        const [items] = await db.query('SELECT variant_id, quantity FROM Order_Items WHERE order_id = ?', [req.params.id]);
        for (let item of items) { await db.query('UPDATE Product_Variants SET stock_quantity = stock_quantity + ? WHERE variant_id = ?', [item.quantity, item.variant_id]); }
        await db.query('UPDATE Orders SET status = ? WHERE order_id = ?', ['Скасовано', req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Помилка" }); }
});

app.listen(3000, () => console.log('Сервер "Львів-Тех" запущено на порту 3000'));