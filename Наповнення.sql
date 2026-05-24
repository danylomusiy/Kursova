USE ElectroTool_IS;

-- 1. Тимчасово вимикаємо перевірку зовнішніх ключів
SET FOREIGN_KEY_CHECKS = 0;

-- Безпечно чистимо таблиці, які точно існують
TRUNCATE TABLE Order_Items;
TRUNCATE TABLE Orders;
TRUNCATE TABLE Employees;
TRUNCATE TABLE Customers;
TRUNCATE TABLE Product_Variants;
TRUNCATE TABLE Product_Models;
TRUNCATE TABLE Categories;
TRUNCATE TABLE Users;

-- Якщо таблиці Wishlist та Reviews існують, чистимо і їх
-- (якщо якоїсь немає, Workbench просто пропустить її)
SET @s = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'ElectroTool_IS' AND table_name = 'Wishlist') > 0, 'TRUNCATE TABLE Wishlist', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'ElectroTool_IS' AND table_name = 'Reviews') > 0, 'TRUNCATE TABLE Reviews', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Вмикаємо перевірку ключів назад перед заливкою даних
SET FOREIGN_KEY_CHECKS = 1;

-- 2. Наповнюємо категорії
INSERT INTO Categories (category_id, name) VALUES 
(1, 'Акумуляторний інструмент'), 
(2, 'Мережевий інструмент'), 
(3, 'Зварювальне обладнання'), 
(4, 'Садова техніка');

-- 3. Додаємо моделі інструментів (10 видів)
INSERT INTO Product_Models (model_id, category_id, model_name, description) VALUES 
(1, 1, 'Шуруповерт CD-Serie', 'Універсальний шуруповерт для дому та майстерні'),
(2, 2, 'Перфоратор RH-Power', 'Потужний перфоратор для бетону та цегли'),
(3, 2, 'Болгарка (КШМ) GL-Max', 'Кутова шліфувальна машина з ергономічним руківʼям'),
(4, 2, 'Лобзик JS-Pro', 'Інструмент для точного фігурного різу'),
(5, 3, 'Зварювальний апарат SAB', 'Інверторний апарат для ручного дугового зварювання'),
(6, 2, 'Циркулярна пилка CS-Line', 'Для швидкого та рівного розпилу деревини'),
(7, 2, 'Фрезер ER-Master', 'Для професійної обробки крайок та пазів'),
(8, 2, 'Шліфмашина ексцентрикова OS', 'Для фінішного шліфування поверхонь'),
(9, 2, 'Будівельний фен HG-Tech', 'Для термоусадки та зняття фарби'),
(10, 1, 'Гайковерт ударний IW', 'Високий крутний момент для складних зʼєднань.');

-- 4. Додаємо варіанти модифікацій (17 штук)
INSERT INTO Product_Variants (variant_id, model_id, sku, power_value, price, stock_quantity) VALUES 
(1, 1, 'CD-120-Q', '12V', 1500.00, 50), 
(2, 1, 'CD-180-S', '18V', 2200.00, 30), 
(3, 1, 'CD-200-BC', '20V', 3500.00, 15),
(4, 2, 'RH-100', '2.5 J', 3200.00, 20), 
(5, 2, 'RH-120', '3.2 J', 4100.00, 10),
(6, 3, 'GL-125', '125mm', 1800.00, 40), 
(7, 3, 'GL-180', '180mm', 2900.00, 12),
(8, 4, 'JS-500', '500W', 1950.00, 25), 
(9, 4, 'JS-750', '750W', 2600.00, 15),
(10, 5, 'SAB-200', '200A', 3800.00, 15), 
(11, 5, 'SAB-250', '250A', 4500.00, 8),
(12, 6, 'CS-185', '1800W', 3400.00, 10),
(13, 7, 'ER-1200', '1200W', 4800.00, 7),
(14, 8, 'OS-300', '300W', 1600.00, 20),
(15, 9, 'HG-2000', '2000W', 1100.00, 45),
(16, 10, 'IW-200', '350 Nm', 4200.00, 5), 
(17, 10, 'IW-300', '600 Nm', 5800.00, 3);

-- 5. Додаємо користувачів
INSERT INTO Users (user_id, email, password_hash, role) VALUES 
(1, 'admin@electro.com', 'admin123', 'admin'),
(2, 'manager_ivan@electro.com', 'pass456', 'manager'),
(3, 'customer_test@gmail.com', 'user789', 'customer'),
(4, 'danya.musiy@gmail.com', 'default_hash_123', 'customer');

-- 6. Клієнти та працівники
INSERT INTO Customers (user_id, first_name, last_name, phone, address) VALUES 
(3, 'Олександр', 'Петренко', '+380671112233', 'м. Київ'),
(4, 'Данило', 'Мусій', '+380672616529', 'м. Львів');

INSERT INTO Employees (user_id, position, salary, hire_date) VALUES 
(2, 'Старший менеджер', 25000.00, '2023-09-01');