const fs = require('fs');
const path = require('path');

// products.json dosyasını oku
const productsPath = path.join(__dirname, '../data/products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

console.log(`Toplam ${products.length} ürün bulundu`);

// Her ürüne stock: 300 ekle
let updatedCount = 0;
products.forEach(product => {
  if (!product.stock) {
    product.stock = 300;
    updatedCount++;
  }
});

// Dosyayı güncelle
fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));

console.log(`${updatedCount} ürünün stok sayısı 300 olarak güncellendi`);
console.log('İşlem tamamlandı!');
