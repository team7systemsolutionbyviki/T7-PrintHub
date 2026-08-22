/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - DEFAULT CONFIGURATION & SEED DATA
   ========================================================================== */

export const DEFAULT_SETTINGS = {
  shopName: "TEAM 7 SYSTEM SOLUTION",
  tagline: "Premium Online Printing & Document Solutions",
  logoText: "T7",
  phone: "+91 97891 23456",
  altPhone: "+91 98765 43210",
  email: "orders@team7system.com",
  address: "No. 45, Tech Park Road, Near Main Bus Stand, Sector 7, Chennai, Tamil Nadu - 600001",
  googleMapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.6262444358!2d80.22!3d13.06!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTPCsDAzJzM2LjAiTiA4MMKwMTMnMTIgMCJF!5e0!3m2!1sen!2sin!4v1625000000000!5m2!1sen!2sin",
  upiId: "9789123456@upi",
  merchantName: "TEAM 7 SYSTEM SOLUTION",
  qrCodeUrl: "", // Will fall back to canvas generator
  gstNumber: "33AAAAA0000A1Z5",
  gstPercentage: 18,
  businessHours: "Mon - Sat: 9:00 AM - 9:00 PM | Sun: 10:00 AM - 6:00 PM",
  whatsappNumber: "919789123456",
  courierPricing: {
    courierName: "ST Courier",
    baseWeightKg: 1,
    baseCost: 60,
    additionalWeightKg: 0.5,
    additionalCost: 40,
    packagingWeightGrams: 50,
    bindingWeightGrams: 30,
    freeDelivery: true
  },
  socialLinks: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    twitter: "https://twitter.com"
  },
  // Service Booking Configuration
  bookingSettings: {
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    timeSlots: [
      "09:00 AM – 10:00 AM",
      "10:00 AM – 11:00 AM",
      "11:00 AM – 12:00 PM",
      "12:00 PM – 01:00 PM",
      "02:00 PM – 03:00 PM",
      "03:00 PM – 04:00 PM",
      "04:00 PM – 05:00 PM",
      "05:00 PM – 06:00 PM"
    ],
    maxBookingsPerSlot: 3,
    holidays: [],
    blockedDates: []
  },
  // E-Commerce Shop Configuration
  shopSettings: {
    localDeliveryFee: 50,
    freeDeliveryThreshold: 999,
    minOrderAmount: 0,
    codEnabled: true,
    razorpayEnabled: true,
    upiEnabled: true
  }
};

export const DEFAULT_PRICING = {
  paperSizes: {
    "A4": { baseRate: 1.50, label: "A4 Standard (210 x 297 mm)" },
    "A5": { baseRate: 1.00, label: "A5 Compact (148 x 210 mm)" },
    "Legal": { baseRate: 2.00, label: "Legal Document (216 x 356 mm)" },
    "Letter": { baseRate: 1.50, label: "Letter Size (216 x 279 mm)" },
    "A3": { baseRate: 4.00, label: "A3 Large (297 x 420 mm)" }
  },
  paperQualities: {
    "70 GSM": { multiplier: 1.0, label: "70 GSM Standard Paper" },
    "80 GSM": { multiplier: 1.2, label: "80 GSM Executive Bond" },
    "100 GSM": { multiplier: 1.6, label: "100 GSM Heavy Paper" },
    "Glossy": { multiplier: 2.5, label: "Photo Glossy Paper" },
    "Matt": { multiplier: 2.2, label: "Premium Matt Paper" }
  },
  colorModes: {
    "Black & White": { costPerPage: 1.50 },
    "Color": { costPerPage: 6.00 }
  },
  sides: {
    "Single": { multiplier: 1.0 },
    "Double": { multiplier: 1.8 } // Slight discount for double side
  },
  bindings: {
    "None": { price: 0 },
    "Spiral": { price: 35.00 },
    "Soft": { price: 65.00 },
    "Hard": { price: 140.00 }
  },
  lamination: {
    "No": { pricePerPage: 0 },
    "Yes": { pricePerPage: 12.00 }
  },
  deliveryZones: {
    "Pickup": { fee: 0, label: "Store Pickup (Self Collection - Free)" },
    "Zone 1 (Anna Nagar / Nearby)": { fee: 30.00, label: "Local Area Zone 1 (Within 5 km) - ₹30" },
    "Zone 2 (Velachery / Central)": { fee: 50.00, label: "City Area Zone 2 (5-12 km) - ₹50" },
    "Zone 3 (Tambaram / Suburbs)": { fee: 80.00, label: "Extended Area Zone 3 (12-20 km) - ₹80" },
    "Express Urgent Doorstep": { fee: 120.00, label: "Express Same-Day Priority Delivery - ₹120" }
  }
};

export const DEFAULT_SERVICE_CATEGORIES = [
  { id: "laptop-service", name: "Laptop Service", icon: "💻" },
  { id: "desktop-service", name: "Desktop Service", icon: "🖥️" },
  { id: "printer-service", name: "Printer Service", icon: "🖨️" },
  { id: "cctv-service", name: "CCTV Service", icon: "📹" },
  { id: "networking-service", name: "Networking Service", icon: "🌐" },
  { id: "android-tv-service", name: "Android TV Service", icon: "📺" },
  { id: "software-installation", name: "Software Installation", icon: "💿" },
  { id: "windows-installation", name: "Windows Installation", icon: "🪟" },
  { id: "data-recovery", name: "Data Recovery", icon: "💾" },
  { id: "virus-malware-removal", name: "Virus / Malware Removal", icon: "🛡️" },
  { id: "website-development", name: "Website Development", icon: "💻" },
  { id: "billing-software", name: "Billing Software", icon: "📊" },
  { id: "computer-amc", name: "Computer AMC", icon: "🤝" },
  { id: "other-it-services", name: "Other IT Services", icon: "🔧" }
];

export const DEFAULT_PRODUCT_CATEGORIES = [
  { id: "computer-accessories", name: "Computer Accessories", icon: "🖥️" },
  { id: "laptop-accessories", name: "Laptop Accessories", icon: "💻" },
  { id: "printer-supplies", name: "Printer Supplies", icon: "🖨️" },
  { id: "cctv-accessories", name: "CCTV Accessories", icon: "📹" },
  { id: "networking", name: "Networking", icon: "🌐" },
  { id: "storage", name: "Storage & SSD", icon: "💾" },
  { id: "keyboard-mouse", name: "Keyboard & Mouse", icon: "⌨️" },
  { id: "cables-adapters", name: "Cables & Adapters", icon: "🔌" },
  { id: "stationery", name: "Stationery & Folders", icon: "📝" },
  { id: "printing-materials", name: "Printing Materials", icon: "📄" }
];

export const DEFAULT_TECHNICIANS = [
  { id: "tech-1", name: "Arun Kumar", phone: "9876500001", skills: ["Laptop Hardware", "Chip Level Repair", "OS Installation"], status: "Active" },
  { id: "tech-2", name: "Vignesh S", phone: "9876500002", skills: ["Printer Repair", "CCTV Installation", "Networking"], status: "Active" },
  { id: "tech-3", name: "Karthik Raja", phone: "9876500003", skills: ["Data Recovery", "Software & Drivers", "Desktop Build"], status: "Active" }
];

export const DEFAULT_PRODUCTS = [
  {
    id: "prod-wireless-combo",
    sku: "T7-KB-001",
    name: "Wireless Keyboard & Mouse Combo",
    category: "Keyboard & Mouse",
    brand: "Logitech",
    price: 899.00,
    mrp: 1099.00,
    discount: 200.00,
    stock: 15,
    lowStockLimit: 3,
    stockStatus: "In Stock",
    icon: "⌨️",
    image: "",
    description: "Ergonomic 2.4GHz wireless desktop keyboard and mouse combo with nano receiver.",
    specifications: "2.4GHz Wireless, 10m range, 12-month battery life, Spill resistant.",
    warranty: "1 Year Manufacturer Warranty",
    popular: true,
    bestSeller: true,
    status: "Active"
  },
  {
    id: "prod-nvme-ssd-512",
    sku: "T7-SSD-512",
    name: "512GB M.2 NVMe PCIe High Speed SSD",
    category: "Storage & SSD",
    brand: "Crucial",
    price: 2499.00,
    mrp: 3200.00,
    discount: 701.00,
    stock: 10,
    lowStockLimit: 2,
    stockStatus: "In Stock",
    icon: "💾",
    image: "",
    description: "Ultra-fast M.2 NVMe Internal Solid State Drive for laptops and desktop PCs.",
    specifications: "Capacity: 512GB, Read: 3500 MB/s, Write: 3000 MB/s, Form Factor: M.2 2280.",
    warranty: "3 Years Brand Warranty",
    popular: true,
    bestSeller: true,
    status: "Active"
  },
  {
    id: "prod-cat6-cable-305m",
    sku: "T7-NET-002",
    name: "Cat6 Ethernet Network Cable (305m Roll)",
    category: "Networking",
    brand: "D-Link",
    price: 4500.00,
    mrp: 5800.00,
    discount: 1300.00,
    stock: 5,
    lowStockLimit: 1,
    stockStatus: "In Stock",
    icon: "🌐",
    image: "",
    description: "High performance pure copper Cat6 UTP network cable for high speed gigabit LAN.",
    specifications: "Category 6, 23 AWG Solid Copper, 305 Meters / 1000 Feet.",
    warranty: "1 Year Warranty",
    popular: false,
    bestSeller: false,
    status: "Active"
  },
  {
    id: "prod-cctv-camera-fullhd",
    sku: "T7-CCTV-1080",
    name: "Full HD Outdoor Bullet CCTV Camera (2MP)",
    category: "CCTV Accessories",
    brand: "Hikvision",
    price: 1450.00,
    mrp: 1950.00,
    discount: 500.00,
    stock: 8,
    lowStockLimit: 2,
    stockStatus: "In Stock",
    icon: "📹",
    image: "",
    description: "1080p HD Turbo HD outdoor bullet camera with 20m Smart IR night vision.",
    specifications: "1080P resolution, IP67 weatherproof, 3.6mm fixed lens, Night Vision.",
    warranty: "2 Years Manufacturer Warranty",
    popular: true,
    bestSeller: true,
    status: "Active"
  },
  {
    id: "prod-printer-cartridge-black",
    sku: "T7-INK-12A",
    name: "12A LaserJet Black Toner Cartridge",
    category: "Printer Supplies",
    brand: "HP Compatible",
    price: 650.00,
    mrp: 850.00,
    discount: 200.00,
    stock: 20,
    lowStockLimit: 5,
    stockStatus: "In Stock",
    icon: "🖨️",
    image: "",
    description: "High yield black laser toner cartridge compatible with 1020, 1005, 1018 printers.",
    specifications: "Yield: ~2000 pages, Crisp black text, Premium dark print quality.",
    warranty: "Replacement Guarantee",
    popular: true,
    bestSeller: true,
    status: "Active"
  },
  {
    id: "prod-hdmi-cable-3m",
    sku: "T7-CBL-HDMI3M",
    name: "4K High Speed HDMI Cable 3 Meters",
    category: "Cables & Adapters",
    brand: "T7 Solutions",
    price: 299.00,
    mrp: 499.00,
    discount: 200.00,
    stock: 25,
    lowStockLimit: 5,
    stockStatus: "In Stock",
    icon: "🔌",
    image: "",
    description: "Braided 4K 60Hz HDMI cable with gold-plated connectors for TV, monitor, projector.",
    specifications: "Length: 3 meters, 4K@60Hz, 18Gbps transfer rate, Nylon braided shielding.",
    warranty: "6 Months Warranty",
    popular: false,
    bestSeller: false,
    status: "Active"
  },
  {
    id: "prod-notebook-a4",
    sku: "T7-STN-NB100",
    name: "A4 Executive Ruled Notebook 100 Pages",
    category: "Stationery & Folders",
    brand: "Classmate",
    price: 45.00,
    mrp: 55.00,
    discount: 10.00,
    stock: 50,
    lowStockLimit: 10,
    stockStatus: "In Stock",
    icon: "📓",
    image: "",
    description: "High quality 70 GSM white paper notebook for office and academic notes.",
    specifications: "A4 size, 100 pages, Spiral bound soft cover.",
    warranty: "N/A",
    popular: false,
    bestSeller: false,
    status: "Active"
  },
  {
    id: "prod-paper-bundle-a4",
    sku: "T7-PRN-A4-75",
    name: "A4 Printing Paper Ream 75 GSM (500 Sheets)",
    category: "Printing Materials",
    brand: "JK Copier",
    price: 260.00,
    mrp: 310.00,
    discount: 50.00,
    stock: 40,
    lowStockLimit: 8,
    stockStatus: "In Stock",
    icon: "📄",
    image: "",
    description: "Premium high brightness A4 copying paper for crisp multi-purpose printing.",
    specifications: "A4 Size, 75 GSM, 500 Sheets per ream, High Whiteness 98%.",
    warranty: "N/A",
    popular: true,
    bestSeller: true,
    status: "Active"
  }
];

export const DEFAULT_SERVICES = [
  {
    id: "srv-laptop-repair",
    category: "Laptop Service",
    title: "Laptop Hardware & Software Troubleshooting",
    shortDescription: "Complete laptop diagnostic, motherboard repair, screen replacement & OS setup.",
    description: "Professional chip-level laptop repair, display screen replacement, hinge repair, overheating cleaning, thermal paste replacement, and Windows OS configuration.",
    icon: "💻",
    price: 299.00,
    startingPrice: "Starting from ₹299",
    priceUnit: "service",
    estimatedTime: "2 - 4 Hours",
    serviceTypes: ["Visit Shop", "Home Service", "Pickup & Delivery"],
    warranty: "30 Days Service Warranty",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "srv-desktop-repair",
    category: "Desktop Service",
    title: "Desktop PC Repair & Custom Assembly",
    shortDescription: "PC hardware diagnosis, power supply replacement, RAM/SSD upgrade & assembly.",
    description: "Custom desktop gaming/office PC assembly, SMPS repair, motherboard diagnosis, RAM/NVMe SSD upgrade, graphics card installation, and software optimization.",
    icon: "🖥️",
    price: 349.00,
    startingPrice: "Starting from ₹349",
    priceUnit: "service",
    estimatedTime: "2 - 5 Hours",
    serviceTypes: ["Visit Shop", "Home Service"],
    warranty: "30 Days Service Warranty",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "srv-printer-service",
    category: "Printer Service",
    title: "Laser & Inkjet Printer Servicing",
    shortDescription: "Paper jam clearing, cartridge refilling, printhead cleaning & driver setup.",
    description: "Expert printer troubleshooting for HP, Epson, Canon & Brother printers. Includes printhead unclogging, toner refilling, roller replacement, and WiFi network printer setup.",
    icon: "🖨️",
    price: 250.00,
    startingPrice: "Starting from ₹250",
    priceUnit: "service",
    estimatedTime: "1 - 3 Hours",
    serviceTypes: ["Visit Shop", "Home Service", "Pickup & Delivery"],
    warranty: "15 Days Warranty",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "srv-cctv-installation",
    category: "CCTV Service",
    title: "CCTV Camera Installation & DVR Setup",
    shortDescription: "HD & IP CCTV camera installation, DVR/NVR configuration & mobile online view.",
    description: "Full CCTV installation service for homes, shops, and offices. Includes wiring, camera mounting, DVR/NVR setup, hard disk configuration, and mobile remote monitoring setup.",
    icon: "📹",
    price: 499.00,
    startingPrice: "Starting from ₹499",
    priceUnit: "camera",
    estimatedTime: "Same Day",
    serviceTypes: ["Home Service"],
    warranty: "1 Year Installation Warranty",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "srv-networking",
    category: "Networking Service",
    title: "Office LAN & WiFi Router Setup",
    shortDescription: "Cat6 LAN cabling, WiFi extender configuration & network troubleshooting.",
    description: "Structured ethernet LAN cabling, WiFi router configuration, mesh router setup, switch installation, and firewall network security troubleshooting.",
    icon: "🌐",
    price: 399.00,
    startingPrice: "Starting from ₹399",
    priceUnit: "setup",
    estimatedTime: "2 - 4 Hours",
    serviceTypes: ["Home Service"],
    warranty: "30 Days Warranty",
    available: true,
    popular: false,
    status: "Active"
  },
  {
    id: "srv-windows-install",
    category: "Windows Installation",
    title: "Windows 10/11 Installation & Driver Setup",
    shortDescription: "Genuine OS installation, hardware drivers, essential tools & antivirus.",
    description: "Clean installation of Windows 10 or 11 Home/Pro with latest driver updates, system optimization, MS Office setup, and security patches.",
    icon: "🪟",
    price: 350.00,
    startingPrice: "Starting from ₹350",
    priceUnit: "system",
    estimatedTime: "1 - 2 Hours",
    serviceTypes: ["Visit Shop", "Home Service", "Pickup & Delivery"],
    warranty: "30 Days Software Guarantee",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "srv-data-recovery",
    category: "Data Recovery",
    title: "Hard Disk & Pen Drive Data Recovery",
    shortDescription: "Recover deleted files, formatted drives, corrupted hard disks & SSDs.",
    description: "Advanced deep data recovery for crashed hard drives, accidentally formatted USB pen drives, corrupted SD cards, and unreadable SSD partitions.",
    icon: "💾",
    price: 799.00,
    startingPrice: "Starting from ₹799",
    priceUnit: "drive",
    estimatedTime: "24 - 48 Hours",
    serviceTypes: ["Visit Shop", "Pickup & Delivery"],
    warranty: "Confidentiality & Data Privacy Guaranteed",
    available: true,
    popular: false,
    status: "Active"
  },
  {
    id: "srv-virus-removal",
    category: "Virus / Malware Removal",
    title: "Virus, Malware & Ransomware Cleaning",
    shortDescription: "Complete system virus cleanup, adware removal & security software installation.",
    description: "Thorough removal of malicious spyware, adware, ransomware, and computer viruses. Includes installation of licensed antivirus software for ongoing protection.",
    icon: "🛡️",
    price: 299.00,
    startingPrice: "Starting from ₹299",
    priceUnit: "system",
    estimatedTime: "1 - 2 Hours",
    serviceTypes: ["Visit Shop", "Home Service"],
    warranty: "15 Days Clean Guarantee",
    available: true,
    popular: false,
    status: "Active"
  },
  {
    id: "srv-web-development",
    category: "Website Development",
    title: "Business Website & E-Commerce Development",
    shortDescription: "Custom responsive website design, domain hosting & Google SEO setup.",
    description: "Professional modern website development for businesses, shops, and institutions. Mobile responsive layout, fast speed optimization, contact forms, WhatsApp integration, and SEO.",
    icon: "🌐",
    price: 4999.00,
    startingPrice: "Starting from ₹4,999",
    priceUnit: "project",
    estimatedTime: "3 - 7 Days",
    serviceTypes: ["Visit Shop", "Home Service"],
    warranty: "1 Year Free Support",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "srv-billing-software",
    category: "Billing Software",
    title: "GST Billing & POS Shop Software Setup",
    shortDescription: "Retail billing software, inventory tracking, thermal printing & barcode scanner.",
    description: "Easy-to-use GST invoice billing software for supermarkets, stationery shops, hardware stores, and mobile shops. Supports thermal receipts and barcode scanning.",
    icon: "📊",
    price: 1999.00,
    startingPrice: "Starting from ₹1,999",
    priceUnit: "license",
    estimatedTime: "1 Day",
    serviceTypes: ["Visit Shop", "Home Service"],
    warranty: "1 Year Support & Training",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "srv-computer-amc",
    category: "Computer AMC",
    title: "Annual Maintenance Contract (AMC) for IT",
    shortDescription: "Comprehensive annual maintenance for office computers, printers & network.",
    description: "Preventive monthly maintenance, quick emergency breakdown response, routine cleaning, and priority hardware support for corporate offices and educational institutions.",
    icon: "🤝",
    price: 1200.00,
    startingPrice: "Starting from ₹1,200 / PC / Year",
    priceUnit: "PC/year",
    estimatedTime: "Annual Contract",
    serviceTypes: ["Home Service"],
    warranty: "Full Term Coverage",
    available: true,
    popular: false,
    status: "Active"
  },
  {
    id: "doc-print",
    category: "General Printing",
    title: "Document Printing",
    shortDescription: "High-speed B&W and vivid Color printing for reports, projects, and contracts.",
    description: "High-speed B&W and vivid Color printing for reports, projects, and contracts.",
    icon: "📄",
    price: 1.50,
    startingPrice: "₹1.50 / page",
    priceUnit: "page",
    estimatedTime: "Instant / 2-4 Hours",
    serviceTypes: ["Visit Shop", "Pickup & Delivery"],
    warranty: "Quality Guarantee",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "binding",
    category: "General Printing",
    title: "Professional Binding",
    shortDescription: "Spiral, Soft Cover, and Luxury Hard Bound binding for theses and manuals.",
    description: "Spiral, Soft Cover, and Luxury Hard Bound binding for theses and manuals.",
    icon: "📚",
    price: 35.00,
    startingPrice: "₹35.00 / book",
    priceUnit: "book",
    estimatedTime: "2 - 4 Hours",
    serviceTypes: ["Visit Shop", "Pickup & Delivery"],
    warranty: "Quality Guarantee",
    available: true,
    popular: true,
    status: "Active"
  },
  {
    id: "lamination",
    category: "General Printing",
    title: "Document Lamination",
    shortDescription: "Waterproof protective thermal lamination for certificates & ID cards.",
    description: "Waterproof protective thermal lamination for certificates & ID cards.",
    icon: "🛡️",
    price: 12.00,
    startingPrice: "₹12.00 / page",
    priceUnit: "page",
    estimatedTime: "1 Hour",
    serviceTypes: ["Visit Shop", "Pickup & Delivery"],
    warranty: "Waterproof Seal Guarantee",
    available: true,
    popular: false,
    status: "Active"
  }
];

const SAMPLE_PDF_PREVIEW = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:%23ffffff; font-family:sans-serif;"><rect width="600" height="800" fill="%23f8fafc"/><rect x="40" y="40" width="520" height="720" rx="12" fill="white" stroke="%23cbd5e1" stroke-width="2"/><text x="70" y="100" font-size="24" font-weight="bold" fill="%231e293b">Project Final Report</text><text x="70" y="130" font-size="14" fill="%2364748b">Anna University - Department of Computer Science</text><line x1="70" y1="150" x2="530" y2="150" stroke="%23e2e8f0" stroke-width="2"/><rect x="70" y="180" width="460" height="12" rx="4" fill="%23cbd5e1"/><rect x="70" y="205" width="420" height="12" rx="4" fill="%23e2e8f0"/><rect x="70" y="230" width="440" height="12" rx="4" fill="%23e2e8f0"/><rect x="70" y="255" width="380" height="12" rx="4" fill="%23e2e8f0"/><rect x="70" y="300" width="220" height="140" rx="8" fill="%23eff6ff" stroke="%233b82f6" stroke-dasharray="4"/><text x="110" y="375" font-size="14" fill="%232563eb">Figure 1. Diagram</text><rect x="310" y="300" width="220" height="140" rx="8" fill="%23f0fdf4" stroke="%2322c55e" stroke-dasharray="4"/><text x="350" y="375" font-size="14" fill="%2316a34a">Table 1. Results</text></svg>`;

const SAMPLE_SCREENSHOT_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" style="background:%230f172a; font-family:sans-serif;"><rect width="400" height="600" fill="%230f172a"/><rect x="20" y="20" width="360" height="560" rx="20" fill="%231e293b" stroke="%23334155" stroke-width="2"/><circle cx="200" cy="90" r="35" fill="%2310b981"/><text x="200" y="100" font-size="36" text-anchor="middle" fill="white">✓</text><text x="200" y="155" font-size="18" font-weight="bold" text-anchor="middle" fill="white">Payment Successful</text><text x="200" y="180" font-size="13" text-anchor="middle" fill="%2394a3b8">Paid to TEAM 7 SYSTEM SOLUTION</text><text x="200" y="235" font-size="32" font-weight="800" text-anchor="middle" fill="%2338bdf8">₹225.97</text><rect x="40" y="270" width="320" height="240" rx="12" fill="%230f172a" stroke="%23334155"/><text x="60" y="310" font-size="12" fill="%2394a3b8">UPI Ref / UTR No.</text><text x="60" y="335" font-size="16" font-weight="bold" fill="%23f8fafc" font-family="monospace">329817264512</text><text x="60" y="380" font-size="12" fill="%2394a3b8">From Google Pay UPI</text><text x="60" y="405" font-size="15" font-weight="bold" fill="%23f8fafc">Rajesh Kumar</text><text x="60" y="450" font-size="12" fill="%2394a3b8">Merchant UPI ID</text><text x="60" y="475" font-size="14" fill="%2338bdf8">9789123456@upi</text></svg>`;

const SAMPLE_SCREENSHOT_2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" style="background:%230f172a; font-family:sans-serif;"><rect width="400" height="600" fill="%230f172a"/><rect x="20" y="20" width="360" height="560" rx="20" fill="%231e293b" stroke="%23334155" stroke-width="2"/><circle cx="200" cy="90" r="35" fill="%233b82f6"/><text x="200" y="100" font-size="36" text-anchor="middle" fill="white">✓</text><text x="200" y="155" font-size="18" font-weight="bold" text-anchor="middle" fill="white">PhonePe Transfer Done</text><text x="200" y="180" font-size="13" text-anchor="middle" fill="%2394a3b8">Paid to TEAM 7 SYSTEM SOLUTION</text><text x="200" y="235" font-size="32" font-weight="800" text-anchor="middle" fill="%2338bdf8">₹395.30</text><rect x="40" y="270" width="320" height="240" rx="12" fill="%230f172a" stroke="%23334155"/><text x="60" y="310" font-size="12" fill="%2394a3b8">UPI Ref / UTR No.</text><text x="60" y="335" font-size="16" font-weight="bold" fill="%23f8fafc" font-family="monospace">482910394812</text><text x="60" y="380" font-size="12" fill="%2394a3b8">From PhonePe UPI</text><text x="60" y="405" font-size="15" font-weight="bold" fill="%23f8fafc">Priya Sundaram</text><text x="60" y="450" font-size="12" fill="%2394a3b8">Merchant UPI ID</text><text x="60" y="475" font-size="14" fill="%2338bdf8">9789123456@upi</text></svg>`;

export const INITIAL_ORDERS = [
  {
    id: "ORD-2026-1001",
    customerName: "Rajesh Kumar",
    customerPhone: "9876543210",
    customerEmail: "rajesh.k@example.com",
    customerAddress: "12, MG Road, Anna Nagar, Chennai",
    files: [
      { name: "Project_Final_Report.pdf", size: "4.2 MB", pages: 45, url: SAMPLE_PDF_PREVIEW, options: { paperSize: "A4", paperQuality: "80 GSM", colorMode: "Black & White", printSide: "Double", copies: 2, binding: "Spiral" } },
      { name: "Executive_Summary_Appendix.pdf", size: "1.8 MB", pages: 12, url: SAMPLE_PDF_PREVIEW, options: { paperSize: "A4", paperQuality: "70 GSM", colorMode: "Color", printSide: "Single", copies: 2, binding: "None" } }
    ],
    options: {
      paperSize: "A4",
      paperQuality: "80 GSM",
      colorMode: "Custom Split",
      printSide: "Double",
      orientation: "Portrait",
      copies: 2,
      binding: "Spiral",
      lamination: "No",
      notes: "Please add clear cover in front."
    },
    printing: {
      paperSize: "A4",
      gsm: "80 GSM",
      colorPages: 12,
      colorCopies: 2,
      colorRate: 6.00,
      colorAmount: 144.00,
      totalColorPrints: 24,
      bwPages: 45,
      bwCopies: 2,
      bwRate: 1.35,
      bwAmount: 121.50,
      totalBWPrints: 90,
      totalPrints: 114,
      sides: "Double Side",
      binding: "Spiral",
      lamination: "None"
    },
    pricing: {
      paperCost: 121.50,
      colorCost: 144.00,
      bindingCost: 70.00,
      laminationCost: 0,
      deliveryFee: 30.00,
      deliveryZone: "Zone 1 (Anna Nagar / Nearby)",
      subtotal: 365.50,
      gst: 0,
      discount: 0,
      total: 365.50
    },
    payment: {
      method: "UPI QR",
      utr: "329817264512",
      payerName: "Rajesh Kumar",
      screenshotUrl: SAMPLE_SCREENSHOT_1,
      status: "Verified"
    },
    status: "Printing",
    createdAt: "2026-08-07T14:30:00Z",
    estimatedReady: "2026-08-08T11:00:00Z"
  },
  {
    id: "ORD-2026-1002",
    customerName: "Priya Sundaram",
    customerPhone: "9123456789",
    customerEmail: "priya.s@example.com",
    customerAddress: "Flat 4B, Lotus Apartments, Velachery, Chennai",
    files: [
      { name: "Design_Portfolio.pdf", size: "12.8 MB", pages: 20, url: SAMPLE_PDF_PREVIEW, options: { paperSize: "A4", paperQuality: "Glossy", colorMode: "Color", printSide: "Single", copies: 1, binding: "Hard" } },
      { name: "Client_Testimonials.pdf", size: "2.4 MB", pages: 8, url: SAMPLE_PDF_PREVIEW, options: { paperSize: "A4", paperQuality: "80 GSM", colorMode: "Black & White", printSide: "Single", copies: 1, binding: "None" } },
      { name: "Certifications_Certificate.pdf", size: "1.1 MB", pages: 5, url: SAMPLE_PDF_PREVIEW, options: { paperSize: "A4", paperQuality: "Matt", colorMode: "Color", printSide: "Single", copies: 1, binding: "None" } }
    ],
    options: {
      paperSize: "A4",
      paperQuality: "Glossy",
      colorMode: "Custom Split",
      printSide: "Single",
      orientation: "Landscape",
      copies: 1,
      binding: "Hard",
      lamination: "No",
      notes: "High quality color calibration needed."
    },
    printing: {
      paperSize: "A4",
      gsm: "Glossy",
      colorPages: 25,
      colorCopies: 1,
      colorRate: 6.00,
      colorAmount: 150.00,
      totalColorPrints: 25,
      bwPages: 8,
      bwCopies: 1,
      bwRate: 1.50,
      bwAmount: 12.00,
      totalBWPrints: 8,
      totalPrints: 33,
      sides: "Single Side",
      binding: "Hard",
      lamination: "None"
    },
    pricing: {
      paperCost: 12.00,
      colorCost: 150.00,
      bindingCost: 140.00,
      laminationCost: 0,
      deliveryFee: 50.00,
      deliveryZone: "Zone 2 (Velachery / Central)",
      subtotal: 352.00,
      gst: 0,
      discount: 0,
      total: 352.00
    },
    payment: {
      method: "UPI QR",
      utr: "482910394812",
      payerName: "Priya S",
      screenshotUrl: SAMPLE_SCREENSHOT_2,
      status: "Waiting Verification"
    },
    status: "Waiting Verification",
    createdAt: "2026-08-07T18:15:00Z",
    estimatedReady: "2026-08-08T16:00:00Z"
  }
];

export const FAQS = [
  {
    q: "How fast can I get my printed documents?",
    a: "Standard print orders are usually completed within 2 to 4 hours. Express same-day pickup and delivery options are available for urgent orders."
  },
  {
    q: "What file formats do you accept for upload?",
    a: "We support PDF, Microsoft Word (.docx), Excel (.xlsx), PowerPoint (.pptx), JPG, PNG, and ZIP archives up to 200MB."
  },
  {
    q: "How does the Business UPI QR payment work?",
    a: "Once you configure your print options, our system generates a dynamic UPI QR Code with your exact order total. Scan it using Google Pay, PhonePe, Paytm, or any UPI app, complete the transfer, and enter your 12-digit UTR/Ref number."
  },
  {
    q: "Can I inspect the status of my print order?",
    a: "Yes! Use the 'Track Order' page and enter your Order ID or registered Phone Number to view real-time progression from Pending to Printing and Pickup."
  }
];
