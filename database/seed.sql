-- =============================================================================
-- T7 PRINT HUB — MYSQL SEED DATA
-- Safe demo/default records
-- =============================================================================

USE `t7_printhub`;

-- 1. Seed Categories
INSERT INTO `categories` (`id`, `type`, `name`, `slug`, `description`, `sort_order`) VALUES
(1, 'SERVICE', 'Printing Services', 'printing-services', 'Professional document and marketing printing', 1),
(2, 'SERVICE', 'Hardware Repair', 'hardware-repair', 'Expert laptop, desktop, printer repair & CCTV', 2),
(3, 'PRODUCT', 'Paper & Stationery', 'paper-stationery', 'A4 sheets, notebooks, pens & desk supplies', 1),
(4, 'PRODUCT', 'Printer Supplies', 'printer-supplies', 'Cartridges, toners, and photo paper', 2)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Seed Services
INSERT INTO `services` (`id`, `category_id`, `name`, `slug`, `description`, `price`, `starting_price`, `price_label`, `image`, `sort_order`) VALUES
(1, 1, 'Certificates & Flyers', 'certificates-flyers', 'High-definition certificate & promotional flyer printing on 300 GSM card stock.', 15.00, 15.00, 'Starting from ₹15 / sheet', 'assets/services/certificates.jpg', 1),
(2, 1, 'Visiting Cards / Business Cards', 'visiting-cards', 'Premium visiting cards with matte, gloss, or velvet finish options.', 299.00, 299.00, 'Starting from ₹299 / 100 cards', 'assets/services/business-cards.jpg', 2),
(3, 1, 'Brochures & Catalogs', 'brochures-catalogs', 'Bi-fold and tri-fold corporate brochure printing.', 499.00, 499.00, 'Starting from ₹499 / 50 copies', 'assets/services/brochures.jpg', 3),
(4, 2, 'Laptop Repair & Maintenance', 'laptop-repair', 'Chip-level motherboard repair, screen replacement, OS installation & thermal cleaning.', 299.00, 299.00, 'Inspection fee from ₹299', 'assets/services/laptop-repair.jpg', 4),
(5, 2, 'Desktop & PC Repair', 'desktop-repair', 'Custom PC assembly, hardware troubleshooting, PSU replacement, and virus removal.', 249.00, 249.00, 'Inspection fee from ₹249', 'assets/services/desktop-repair.jpg', 5),
(6, 2, 'Printer Repair & Refilling', 'printer-repair', 'Toner refilling, head cleaning, paper pickup roller repair, and network printer setup.', 199.00, 199.00, 'Refilling from ₹199', 'assets/services/printer-repair.jpg', 6),
(7, 2, 'CCTV Installation & Service', 'cctv-installation', 'HD IP camera installation, DVR/NVR configuration, remote mobile viewing setup.', 999.00, 999.00, 'Installation setup from ₹999', 'assets/services/cctv.jpg', 7)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`);

-- 3. Seed Products
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `description`, `category`, `price`, `sale_price`, `stock`, `image`) VALUES
(1, 3, 'JK Copier A4 Paper 75 GSM (500 Sheets)', 'jk-copier-a4-75gsm', 'High quality multi-purpose copier paper for clear printing.', 'Paper & Stationery', 340.00, 310.00, 150, 'assets/products/a4-paper.jpg'),
(2, 4, 'HP 88A Black Original LaserJet Toner Cartridge', 'hp-88a-toner', 'Original HP toner cartridge delivering crisp black text.', 'Printer Supplies', 3800.00, 3450.00, 25, 'assets/products/hp-toner.jpg')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`);

-- 4. Seed Settings
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('general', '{"shopName":"Team 7 Print Hub","phone":"+91 98765 43210","whatsapp":"+91 98765 43210","email":"support@t7printhub.com","address":"No. 12, Main Road, City Center","city":"Chennai","state":"Tamil Nadu","pincode":"600001","upiId":"team7@upi","currency":"₹","businessHours":"Mon-Sat: 9:00 AM - 9:00 PM","deliveryFee":50}')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
