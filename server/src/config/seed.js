/* ==========================================================================
   T7 PRINT HUB — MYSQL SEED SCRIPT
   ========================================================================== */

const { query, queryOne } = require('./db');

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Seed Roles
    const roles = [
      { id: 1, code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'Full system access and user management' },
      { id: 2, code: 'ADMIN', name: 'Administrator', description: 'Store manager and administrator' },
      { id: 3, code: 'STAFF', name: 'Staff Member', description: 'Store technician and order processor' },
      { id: 4, code: 'CUSTOMER', name: 'Customer', description: 'Registered store customer' }
    ];

    for (const r of roles) {
      await query(
        `INSERT INTO roles (id, code, name, description)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
        [r.id, r.code, r.name, r.description]
      );
    }
    console.log('✅ Roles seeded.');

    // 2. Seed Service Categories
    const serviceCats = [
      { id: 1, name: 'Printing Services', slug: 'printing-services', description: 'Professional document and marketing printing', sort_order: 1 },
      { id: 2, name: 'Hardware Repair', slug: 'hardware-repair', description: 'Expert laptop, desktop, printer repair & CCTV', sort_order: 2 }
    ];

    for (const sc of serviceCats) {
      await query(
        `INSERT INTO service_categories (id, name, slug, description, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order)`,
        [sc.id, sc.name, sc.slug, sc.description, sc.sort_order]
      );
    }
    console.log('✅ Service Categories seeded.');

    // 3. Seed Services
    const services = [
      {
        id: 1,
        category_id: 1,
        name: 'Certificates & Flyers',
        slug: 'certificates-flyers',
        description: 'High-definition certificate & promotional flyer printing on 300 GSM card stock.',
        price: 15.00,
        starting_price: 15.00,
        price_label: 'Starting from ₹15 / sheet',
        image: 'assets/services/certificates.jpg',
        sort_order: 1
      },
      {
        id: 2,
        category_id: 1,
        name: 'Visiting Cards / Business Cards',
        slug: 'visiting-cards',
        description: 'Premium visiting cards with matte, gloss, or velvet finish options.',
        price: 299.00,
        starting_price: 299.00,
        price_label: 'Starting from ₹299 / 100 cards',
        image: 'assets/services/business-cards.jpg',
        sort_order: 2
      },
      {
        id: 3,
        category_id: 1,
        name: 'Brochures & Catalogs',
        slug: 'brochures-catalogs',
        description: 'Bi-fold and tri-fold corporate brochure printing.',
        price: 499.00,
        starting_price: 499.00,
        price_label: 'Starting from ₹499 / 50 copies',
        image: 'assets/services/brochures.jpg',
        sort_order: 3
      },
      {
        id: 4,
        category_id: 2,
        name: 'Laptop Repair & Maintenance',
        slug: 'laptop-repair',
        description: 'Chip-level motherboard repair, screen replacement, OS installation & thermal cleaning.',
        price: 299.00,
        starting_price: 299.00,
        price_label: 'Inspection fee from ₹299',
        image: 'assets/services/laptop-repair.jpg',
        sort_order: 4
      },
      {
        id: 5,
        category_id: 2,
        name: 'Desktop & PC Repair',
        slug: 'desktop-repair',
        description: 'Custom PC assembly, hardware troubleshooting, PSU replacement, and virus removal.',
        price: 249.00,
        starting_price: 249.00,
        price_label: 'Inspection fee from ₹249',
        image: 'assets/services/desktop-repair.jpg',
        sort_order: 5
      },
      {
        id: 6,
        category_id: 2,
        name: 'Printer Repair & Refilling',
        slug: 'printer-repair',
        description: 'Toner refilling, head cleaning, paper pickup roller repair, and network printer setup.',
        price: 199.00,
        starting_price: 199.00,
        price_label: 'Refilling from ₹199',
        image: 'assets/services/printer-repair.jpg',
        sort_order: 6
      },
      {
        id: 7,
        category_id: 2,
        name: 'CCTV Installation & Service',
        slug: 'cctv-installation',
        description: 'HD IP camera installation, DVR/NVR configuration, remote mobile viewing setup.',
        price: 999.00,
        starting_price: 999.00,
        price_label: 'Installation setup from ₹999',
        image: 'assets/services/cctv.jpg',
        sort_order: 7
      }
    ];

    for (const s of services) {
      await query(
        `INSERT INTO services (id, category_id, name, slug, description, price, starting_price, price_label, image, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price), starting_price = VALUES(starting_price), price_label = VALUES(price_label), image = VALUES(image), sort_order = VALUES(sort_order)`,
        [s.id, s.category_id, s.name, s.slug, s.description, s.price, s.starting_price, s.price_label, s.image, s.sort_order]
      );
    }
    console.log('✅ Services seeded.');

    // 4. Seed Product Categories
    const productCats = [
      { id: 1, name: 'Paper & Stationery', slug: 'paper-stationery', description: 'A4 sheets, notebooks, pens & desk supplies', sort_order: 1 },
      { id: 2, name: 'Printer Supplies', slug: 'printer-supplies', description: 'Cartridges, toners, and photo paper', sort_order: 2 }
    ];

    for (const pc of productCats) {
      await query(
        `INSERT INTO product_categories (id, name, slug, description, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order)`,
        [pc.id, pc.name, pc.slug, pc.description, pc.sort_order]
      );
    }
    console.log('✅ Product Categories seeded.');

    // 5. Seed Products
    const products = [
      {
        id: 1,
        category_id: 1,
        name: 'JK Copier A4 Paper 75 GSM (500 Sheets)',
        slug: 'jk-copier-a4-75gsm',
        description: 'High quality multi-purpose copier paper for clear printing.',
        category: 'Paper & Stationery',
        price: 340.00,
        sale_price: 310.00,
        stock: 150,
        image: 'assets/products/a4-paper.jpg'
      },
      {
        id: 2,
        category_id: 2,
        name: 'HP 88A Black Original LaserJet Toner Cartridge',
        slug: 'hp-88a-toner',
        description: 'Original HP toner cartridge delivering crisp black text.',
        category: 'Printer Supplies',
        price: 3800.00,
        sale_price: 3450.00,
        stock: 25,
        image: 'assets/products/hp-toner.jpg'
      }
    ];

    for (const p of products) {
      await query(
        `INSERT INTO products (id, category_id, name, slug, description, category, price, sale_price, stock, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price), sale_price = VALUES(sale_price), stock = VALUES(stock), image = VALUES(image)`,
        [p.id, p.category_id, p.name, p.slug, p.description, p.category, p.price, p.sale_price, p.stock, p.image]
      );
    }
    console.log('✅ Products seeded.');

    // 6. Seed Settings
    const defaultSettings = {
      shopName: 'Team 7 Print Hub',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      email: 'support@t7printhub.com',
      address: 'No. 12, Main Road, City Center',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      upiId: 'team7@upi',
      currency: '₹',
      businessHours: 'Mon-Sat: 9:00 AM - 9:00 PM',
      deliveryFee: 50
    };

    await query(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES ('general', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(defaultSettings)]
    );
    console.log('✅ Settings seeded.');

    console.log('🎉 Database seeding completed successfully.');
  } catch (err) {
    console.error('Database seeding failed:', err);
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
