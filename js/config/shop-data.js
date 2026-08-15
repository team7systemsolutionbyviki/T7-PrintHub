/* T7 SHOP - separate sales & booking catalog */
export const T7_SHOP_CATEGORIES = [
  { id: 'computers', title: 'Laptop & PC Sales', icon: '💻', description: 'New and pre-owned laptops, desktops and custom PC builds.' },
  { id: 'amd', title: 'AMD & PC Accessories', icon: '🧩', description: 'AMD Ryzen components and everyday PC accessories.' },
  { id: 'design', title: 'Design & Printing', icon: '🎨', description: 'Flex, visiting cards, posters, photo frames and photo editing.' },
  { id: 'services', title: 'Computer Services', icon: '🛠️', description: 'Book laptop, PC, printer and software services.' },
  { id: 'driver', title: 'Driver Booking', icon: '🚗', description: 'Book a professional driver with your car or with a car.' }
];

export const T7_SHOP_ITEMS = [
  { id:'laptop-sales', category:'computers', title:'Laptop Sales', icon:'💻', description:'Dell, HP, Lenovo, ASUS and other laptops. New and selected used systems.', price:'Price on request', action:'enquiry' },
  { id:'pc-sales', category:'computers', title:'Desktop & Custom PC', icon:'🖥️', description:'Office, home, editing, gaming and custom AMD/Intel PC builds.', price:'Price on request', action:'enquiry' },
  { id:'amd-ryzen', category:'amd', title:'AMD Ryzen Processors', icon:'🔴', description:'Ryzen processor options for AM4 and AM5 builds.', price:'Price on request', action:'enquiry' },
  { id:'amd-motherboard', category:'amd', title:'AMD Motherboards', icon:'🧩', description:'AM4/AM5 compatible motherboards for Ryzen systems.', price:'Price on request', action:'enquiry' },
  { id:'ram-ssd', category:'amd', title:'RAM & SSD', icon:'💾', description:'DDR4/DDR5 RAM, NVMe SSD and SATA SSD upgrades.', price:'Price on request', action:'enquiry' },
  { id:'pc-accessories', category:'amd', title:'PC Accessories', icon:'⌨️', description:'Keyboard, mouse, cabinet, PSU, monitor, cables and other accessories.', price:'Price on request', action:'enquiry' },
  { id:'flex-print', category:'design', title:'Flex Printing', icon:'🖼️', description:'Flex banners for shops, events, offers and outdoor advertising.', price:'Price on request', action:'service' },
  { id:'visiting-card-design', category:'design', title:'Visiting Card Design', icon:'📇', description:'Professional visiting-card design and print-ready artwork.', price:'Price on request', action:'service' },
  { id:'poster-design', category:'design', title:'Poster Design', icon:'🪧', description:'Business, event, offer and social-media poster designs.', price:'Price on request', action:'service' },
  { id:'photo-frame', category:'design', title:'Photo Frame', icon:'🖼️', description:'Photo printing, frame selection and finished photo-frame orders.', price:'Price on request', action:'service' },
  { id:'photo-edit', category:'design', title:'Photo Editing', icon:'✨', description:'Background removal, retouching, passport photo and creative edits.', price:'Price on request', action:'service' },
  { id:'laptop-service', category:'services', title:'Laptop Service', icon:'💻', description:'Hardware repair, OS, SSD/RAM upgrade, cleaning and troubleshooting.', price:'Book a service', action:'service' },
  { id:'pc-service', category:'services', title:'PC Service', icon:'🖥️', description:'Desktop diagnosis, assembly, upgrade, software and hardware service.', price:'Book a service', action:'service' },
  { id:'printer-service', category:'services', title:'Printer Service', icon:'🖨️', description:'Printer troubleshooting, cleaning, cartridge/toner and setup service.', price:'Book a service', action:'service' },
  { id:'driver-with-car', category:'driver', title:'Driver With Car', icon:'🚗', description:'Book a driver who provides the car. Confirm vehicle type, route and duration.', price:'Price on request', action:'driver' },
  { id:'driver-without-car', category:'driver', title:'Driver Without Car', icon:'👨‍✈️', description:'Book a driver to drive your own car.', price:'Price on request', action:'driver' }
];
