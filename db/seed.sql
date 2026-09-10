INSERT OR IGNORE INTO products(id,name,description,image,category,active) VALUES
('churi','ছুরি শুঁটকি','সরিষার তেল, রসুন ও মসলায় রান্না করা ছুরি শুঁটকি।','/images/churi-product.png','শুঁটকি',1),
('loitta','লইট্টা শুঁটকি','গরম ভাতের সঙ্গে ঘরোয়া লইট্টা শুঁটকির আয়োজন।','/images/loitta-product.png','শুঁটকি',1),
('chepa','পুঁটি চ্যাপা শুঁটকি','চেনা স্বাদের পুঁটি চ্যাপা, বয়ামে ভরা ঘরোয়া রান্না।','/images/chepa-product.png','শুঁটকি',1),
('ilish','ইলিশের আচার','নোনা ইলিশের আচার—ভাত, খিচুড়ি বা পোলাওয়ের সাথে।','/images/ilish-product.png','আচার',1);
INSERT OR IGNORE INTO variants(id,product_id,grams,price) VALUES
('churi-100','churi',100,250),('churi-200','churi',200,480),('churi-400','churi',400,900),('churi-500','churi',500,1100),
('loitta-100','loitta',100,250),('loitta-200','loitta',200,500),('loitta-250','loitta',250,600),('loitta-500','loitta',500,1150),
('chepa-100','chepa',100,180),('chepa-200','chepa',200,350),('chepa-400','chepa',400,650),('chepa-500','chepa',500,800),
('ilish-100','ilish',100,300),('ilish-200','ilish',200,550),('ilish-250','ilish',250,650),('ilish-500','ilish',500,1250);
