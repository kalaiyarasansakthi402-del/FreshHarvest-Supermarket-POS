/**
 * FreshHarvest Supermarket Management & POS System
 * Central Data Store & Real-time State Engine
 * 
 * Manages dual-key localStorage persistence, financial calculations,
 * stock alert transitions, Web Audio chimes, and messaging logs.
 */

(function(window) {
  'use strict';

  const STORAGE_KEYS = {
    PRODUCTS: 'freshHarvestProducts',
    BILLS: 'freshHarvestBills',
    CUSTOMERS: 'freshHarvestCustomers',
    CATEGORIES: 'freshHarvestCategories',
    SUPPLIERS: 'freshHarvestSuppliers',
    PURCHASES: 'freshHarvestPurchases',
    RETURNS: 'freshHarvestReturns',
    OFFERS: 'freshHarvestOffers',
    LOYALTY: 'freshHarvestLoyalty',
    STAFF: 'freshHarvestStaff',
    SETTINGS: 'freshHarvestSettings',
    ALERTS: 'freshHarvestAlerts',
    MESSAGES: 'freshHarvestMessages',
    SHIFTS: 'freshHarvestShifts',
    CART: 'freshHarvestCurrentCart'
  };

  const LEGACY_KEYS = {
    PRODUCTS: 'pos_products',
    BILLS: 'pos_bills',
    CUSTOMERS: 'pos_customers',
    CATEGORIES: 'pos_categories',
    SUPPLIERS: 'pos_suppliers',
    PURCHASES: 'pos_purchases',
    RETURNS: 'pos_returns',
    SETTINGS: 'pos_settings'
  };

  // Helper for consistent Date Formatting: DD MMM YYYY, hh:mm A
  function formatDateTime(dateInput) {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
  }

  function formatDateOnly(dateInput) {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatCurrency(amount) {
    const val = Number(amount) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Indian Mobile Number Validator and Normalizer (+91 format)
  function normalizeIndianMobileNumber(val) {
    if (!val) return '';
    const str = String(val).trim();
    let digits = str.replace(/[^\d+]/g, '');
    if (digits.startsWith('+91')) {
      digits = digits.slice(3);
    } else if (digits.startsWith('0')) {
      digits = digits.slice(1);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    const raw10 = digits.replace(/\D/g, '');
    if (/^[6-9]\d{9}$/.test(raw10)) {
      return `+91${raw10}`;
    }
    return '';
  }

  normalizeIndianMobileNumber.validate = function(val) {
    const norm = normalizeIndianMobileNumber(val);
    return {
      isValid: !!norm,
      phone: norm,
      e164: norm,
      raw10: norm ? norm.slice(3) : ''
    };
  };

  // Web Audio Alert Synthesizer (Zero external mp3 dependencies)
  function playAlertChime(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'out_of_stock') {
        // Urgent descending double beep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.2); // D4
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'restored') {
        // Pleasant ascending major chord chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440.00, now); // A4
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.25); // E5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Low Stock warning gentle chime (440Hz -> 330Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch (e) {
      console.warn('AudioContext alert chime suppressed or not allowed:', e);
    }
  }

  // Toast Notification Manager
  function showToast(message, type = 'info', title = 'Notification') {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('fh-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fh-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `fh-toast fh-toast-${type}`;
    
    let borderColor = '#22c55e';
    let icon = 'ℹ️';
    if (type === 'warning') { borderColor = '#f59e0b'; icon = '⚠️'; }
    if (type === 'danger') { borderColor = '#ef4444'; icon = '🛑'; }
    if (type === 'success') { borderColor = '#10b981'; icon = '✅'; }

    toast.style.cssText = `
      background: #1e293b;
      color: #f8fafc;
      padding: 14px 18px;
      border-radius: 10px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      border-left: 5px solid ${borderColor};
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      font-size: 13.5px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
      animation: fhSlideInRight 0.3s ease-out forwards;
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    toast.innerHTML = `
      <span style="font-size: 18px; line-height: 1;">${icon}</span>
      <div style="flex: 1;">
        <strong style="display: block; font-size: 14px; font-weight: 700; margin-bottom: 2px; color: #ffffff;">${title}</strong>
        <div style="color: #cbd5e1; line-height: 1.4;">${message}</div>
      </div>
      <button style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 0;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => {
        if (typeof toast.remove === 'function') {
          toast.remove();
        } else if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4500);
  }

  // Inject CSS animations if needed
  if (typeof document !== 'undefined' && !document.getElementById('fh-global-animations')) {
    const style = document.createElement('style');
    style.id = 'fh-global-animations';
    style.innerHTML = `
      @keyframes fhSlideInRight {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // DEFAULT SEED DATA
  const DEFAULT_SETTINGS = {
    storeName: 'FreshHarvest Supermarket',
    tagline: 'Fresh Products • Smart Billing • Better Shopping',
    address: 'Shop #14, Green Valley High Street, Bengaluru, Karnataka 560001',
    phone: '+91 98765 43210',
    email: 'contact@freshharvest.store',
    gstNumber: '29ABCDE1234F1Z5',
    currency: '₹',
    taxRate: 5.0,
    lowStockDefaultThreshold: 5,
    receiptFooterMessage: 'Thank you for shopping at FreshHarvest! Healthy Food, Healthy Life.',
    enableAudioAlerts: true,
    autoPrintReceipt: false
  };

  const DEFAULT_CATEGORIES = [
    { id: 'cat-1', name: 'Fruits & Vegetables', icon: '🥦', color: '#16a34a', count: 6, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80' },
    { id: 'cat-2', name: 'Dairy & Eggs', icon: '🥛', color: '#0284c7', count: 4, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80' },
    { id: 'cat-3', name: 'Bakery & Bread', icon: '🍞', color: '#d97706', count: 3, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80' },
    { id: 'cat-4', name: 'Meat & Seafood', icon: '🥩', color: '#dc2626', count: 2, image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=300&q=80' },
    { id: 'cat-5', name: 'Beverages', icon: '🥤', color: '#059669', count: 3, image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=300&q=80' },
    { id: 'cat-6', name: 'Snacks & Sweets', icon: '🍪', color: '#7c3aed', count: 2, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=300&q=80' },
    { id: 'cat-7', name: 'Grains & Staples', icon: '🌾', color: '#b45309', count: 3, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80' }
  ];

  const DEFAULT_PRODUCTS = [
    {
      id: 'prod-1',
      name: 'Fresh Farm Organic Milk',
      category: 'Dairy & Eggs',
      brand: 'HarvestDairy',
      price: 64.00,
      sellingPrice: 64.00,
      costPrice: 52.00,
      cost: 52.00,
      stock: 35,
      stockQty: 35,
      minStock: 8,
      unit: '1 Ltr',
      discount: 0,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2026-09-24'
    },
    {
      id: 'prod-2',
      name: 'Bananas (Fresh)',
      category: 'Fruits & Vegetables',
      brand: 'FreshFarm',
      price: 60.00,
      sellingPrice: 60.00,
      costPrice: 40.00,
      cost: 40.00,
      stock: 85,
      stockQty: 85,
      minStock: 15,
      unit: '1 kg',
      discount: 10,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: true,
      expiryDate: '2026-09-21'
    },
    {
      id: 'prod-3',
      name: 'Farm Fresh Brown Eggs (Pack of 12)',
      category: 'Dairy & Eggs',
      brand: 'NaturePure',
      price: 110.00,
      sellingPrice: 110.00,
      costPrice: 85.00,
      cost: 85.00,
      stock: 40,
      stockQty: 40,
      minStock: 10,
      unit: '12 pcs',
      discount: 5,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2026-09-30'
    },
    {
      id: 'prod-4',
      name: 'Artisan Brown Bread',
      category: 'Bakery & Bread',
      brand: 'BakerStreet',
      price: 150.00,
      sellingPrice: 150.00,
      costPrice: 95.00,
      cost: 95.00,
      stock: 20,
      stockQty: 20,
      minStock: 8,
      unit: '400 g',
      discount: 0,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: false,
      isFlashDeal: true,
      expiryDate: '2026-09-20'
    },
    {
      id: 'prod-5',
      name: 'Premium Royal Basmati Rice (5kg)',
      category: 'Grains & Staples',
      brand: 'RoyalGrain',
      price: 499.00,
      sellingPrice: 499.00,
      costPrice: 380.00,
      cost: 380.00,
      stock: 22,
      stockQty: 22,
      minStock: 5,
      unit: 'Bag',
      discount: 8,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2027-03-15'
    },
    {
      id: 'prod-6',
      name: 'Cold Pressed Extra Virgin Olive Oil (1L)',
      category: 'Grains & Staples',
      brand: 'OlioVerde',
      price: 799.00,
      sellingPrice: 799.00,
      costPrice: 620.00,
      cost: 620.00,
      stock: 0,
      stockQty: 0,
      minStock: 4,
      unit: 'Bottle',
      discount: 15,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
      status: 'Out of Stock',
      isFeatured: false,
      isFlashDeal: false,
      expiryDate: '2027-08-10'
    },
    {
      id: 'prod-7',
      name: 'Vine Tomatoes',
      category: 'Fruits & Vegetables',
      brand: 'GreenField',
      price: 120.00,
      sellingPrice: 120.00,
      costPrice: 80.00,
      cost: 80.00,
      stock: 60,
      stockQty: 60,
      minStock: 15,
      unit: '1 kg',
      discount: 0,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: true,
      expiryDate: '2026-09-22'
    },
    {
      id: 'prod-8',
      name: 'Red Apples (Crisp)',
      category: 'Fruits & Vegetables',
      brand: 'FreshFarm',
      price: 180.00,
      sellingPrice: 180.00,
      costPrice: 120.00,
      cost: 120.00,
      stock: 39,
      stockQty: 39,
      minStock: 15,
      unit: '1 KG',
      discount: 10,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2026-09-29'
    },
    {
      id: 'prod-9',
      name: 'Tender Chicken Breast',
      category: 'Meat & Seafood',
      brand: 'PrimeCuts',
      price: 450.00,
      sellingPrice: 450.00,
      costPrice: 340.00,
      cost: 340.00,
      stock: 25,
      stockQty: 25,
      minStock: 10,
      unit: '500 g',
      discount: 0,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: false,
      isFlashDeal: true,
      expiryDate: '2026-09-21'
    },
    {
      id: 'prod-10',
      name: 'Fresh Spinach',
      category: 'Fruits & Vegetables',
      brand: 'OrganicValley',
      price: 60.00,
      sellingPrice: 60.00,
      costPrice: 35.00,
      cost: 35.00,
      stock: 30,
      stockQty: 30,
      minStock: 10,
      unit: '250 g',
      discount: 0,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2026-09-21'
    },
    {
      id: 'prod-11',
      name: 'Nestlé Pure Milk',
      category: 'Dairy & Eggs',
      brand: 'Nestlé',
      price: 220.00,
      sellingPrice: 220.00,
      costPrice: 170.00,
      cost: 170.00,
      stock: 50,
      stockQty: 50,
      minStock: 15,
      unit: '1 Ltr',
      discount: 0,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2026-09-25'
    },
    {
      id: 'prod-12',
      name: 'Farm Fresh Eggs',
      category: 'Dairy & Eggs',
      brand: 'NaturePure',
      price: 280.00,
      sellingPrice: 280.00,
      costPrice: 200.00,
      cost: 200.00,
      stock: 40,
      stockQty: 40,
      minStock: 12,
      unit: '12 pcs',
      discount: 0,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2026-09-28'
    },
    {
      id: 'prod-13',
      name: 'Authentic South Indian Filter Coffee (250g)',
      category: 'Beverages',
      brand: 'CoorgRoast',
      price: 165.00,
      sellingPrice: 165.00,
      costPrice: 120.00,
      cost: 120.00,
      stock: 19,
      stockQty: 19,
      minStock: 5,
      unit: 'Pack',
      discount: 0,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: false,
      isFlashDeal: true,
      expiryDate: '2027-01-20'
    },
    {
      id: 'prod-14',
      name: 'Artisan Dark Belgian Chocolate Bar (100g)',
      category: 'Snacks & Sweets',
      brand: 'CocoaCraft',
      price: 140.00,
      sellingPrice: 140.00,
      costPrice: 95.00,
      cost: 95.00,
      stock: 2,
      stockQty: 2,
      minStock: 5,
      unit: 'Bar',
      discount: 0,
      tax: 18,
      image: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=400&q=80',
      status: 'Low Stock',
      isFeatured: false,
      isFlashDeal: false,
      expiryDate: '2026-11-15'
    },
    {
      id: 'prod-15',
      name: 'Natural Thick Greek Style Yogurt (400g)',
      category: 'Dairy & Eggs',
      brand: 'Epigamia',
      price: 95.00,
      sellingPrice: 95.00,
      costPrice: 70.00,
      cost: 70.00,
      stock: 14,
      stockQty: 14,
      minStock: 4,
      unit: 'Tub',
      discount: 0,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: true,
      isFlashDeal: false,
      expiryDate: '2026-09-25'
    },
    {
      id: 'prod-16',
      name: 'Butter Croissants Box of 4',
      category: 'Bakery & Bread',
      brand: 'BakerStreet',
      price: 160.00,
      sellingPrice: 160.00,
      costPrice: 110.00,
      cost: 110.00,
      stock: 0,
      stockQty: 0,
      minStock: 4,
      unit: 'Box',
      discount: 10,
      tax: 5,
      image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80',
      status: 'Out of Stock',
      isFeatured: false,
      isFlashDeal: false,
      expiryDate: '2026-09-20'
    },
    {
      id: 'prod-17',
      name: 'Fresh Carrots',
      category: 'Fruits & Vegetables',
      brand: 'FreshFarm',
      price: 100.00,
      sellingPrice: 100.00,
      costPrice: 65.00,
      cost: 65.00,
      stock: 35,
      stockQty: 35,
      minStock: 10,
      unit: '1 kg',
      discount: 0,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: false,
      isFlashDeal: false,
      expiryDate: '2026-09-30'
    },
    {
      id: 'prod-18',
      name: 'Green Cucumbers',
      category: 'Fruits & Vegetables',
      brand: 'FreshFarm',
      price: 90.00,
      sellingPrice: 90.00,
      costPrice: 55.00,
      cost: 55.00,
      stock: 40,
      stockQty: 40,
      minStock: 12,
      unit: '1 kg',
      discount: 0,
      tax: 0,
      image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=400&q=80',
      status: 'In Stock',
      isFeatured: false,
      isFlashDeal: false,
      expiryDate: '2026-09-30'
    }
  ];

  // Helper to generate dynamic dates relative to today
  function getSampleDates() {
    const today = new Date();
    const isoToday = today.toISOString().split('T')[0];
    
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const isoYest = yest.toISOString().split('T')[0];

    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 2);
    const isoD2 = d2.toISOString().split('T')[0];

    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 3);
    const isoD3 = d3.toISOString().split('T')[0];

    const d5 = new Date(today);
    d5.setDate(d5.getDate() - 5);
    const isoD5 = d5.toISOString().split('T')[0];

    return { today, isoToday, isoYest, isoD2, isoD3, isoD5 };
  }

  function generateDefaultBills() {
    const { isoToday, isoYest, isoD2, isoD3, isoD5 } = getSampleDates();

    return [
      {
        id: 'FH-BILL-1091',
        billNumber: 'FH-1091',
        date: `${isoToday}T14:32:00`,
        customerName: 'Aarav Sharma',
        customerPhone: '+91 98451 23456',
        items: [
          { productId: 'prod-1', name: 'Fresh Farm Organic Milk', price: 64, quantity: 2, subtotal: 128 },
          { productId: 'prod-5', name: 'Premium Royal Basmati Rice (5kg)', price: 459.08, quantity: 1, subtotal: 459.08 },
          { productId: 'prod-8', name: 'Crisp Royal Gala Apples', price: 171, quantity: 1.5, subtotal: 256.50 }
        ],
        subtotal: 843.58,
        discount: 42.18,
        tax: 38.60,
        grandTotal: 840.00,
        paymentMethod: 'UPI',
        status: 'Paid',
        cashier: 'Priya Cashier'
      },
      {
        id: 'FH-BILL-1092',
        billNumber: 'FH-1092',
        date: `${isoToday}T11:15:00`,
        customerName: 'Ananya Iyer',
        customerPhone: '+91 99887 76655',
        items: [
          { productId: 'prod-2', name: 'Cavendish Fresh Bananas', price: 43.20, quantity: 2, subtotal: 86.40 },
          { productId: 'prod-3', name: 'Farm Fresh Brown Eggs (Pack of 12)', price: 104.50, quantity: 2, subtotal: 209.00 },
          { productId: 'prod-11', name: 'Natural Thick Greek Style Yogurt (400g)', price: 95, quantity: 1, subtotal: 95.00 }
        ],
        subtotal: 390.40,
        discount: 19.50,
        tax: 15.10,
        grandTotal: 386.00,
        paymentMethod: 'Cash',
        status: 'Paid',
        cashier: 'Priya Cashier'
      },
      {
        id: 'FH-BILL-1093',
        billNumber: 'FH-1093',
        date: `${isoToday}T09:40:00`,
        customerName: 'Rohan Verma',
        customerPhone: '+91 91234 56789',
        items: [
          { productId: 'prod-7', name: 'Fresh Green Broccoli Florets', price: 75, quantity: 2, subtotal: 150 },
          { productId: 'prod-9', name: 'Authentic South Indian Filter Coffee (250g)', price: 165, quantity: 1, subtotal: 165 }
        ],
        subtotal: 315.00,
        discount: 0,
        tax: 15.75,
        grandTotal: 330.75,
        paymentMethod: 'Card',
        status: 'Paid',
        cashier: 'Vikram Singh'
      },
      {
        id: 'FH-BILL-1088',
        billNumber: 'FH-1088',
        date: `${isoYest}T18:20:00`,
        customerName: 'Meera Patel',
        customerPhone: '+91 97654 32109',
        items: [
          { productId: 'prod-5', name: 'Premium Royal Basmati Rice (5kg)', price: 459.08, quantity: 2, subtotal: 918.16 },
          { productId: 'prod-1', name: 'Fresh Farm Organic Milk', price: 64, quantity: 3, subtotal: 192.00 }
        ],
        subtotal: 1110.16,
        discount: 55.50,
        tax: 52.70,
        grandTotal: 1107.36,
        paymentMethod: 'UPI',
        status: 'Paid',
        cashier: 'Vikram Singh'
      },
      {
        id: 'FH-BILL-1089',
        billNumber: 'FH-1089',
        date: `${isoYest}T12:05:00`,
        customerName: 'Kavita Nair',
        customerPhone: '+91 98112 23344',
        items: [
          { productId: 'prod-8', name: 'Crisp Royal Gala Apples', price: 171, quantity: 2, subtotal: 342.00 }
        ],
        subtotal: 342.00,
        discount: 17.10,
        tax: 0,
        grandTotal: 324.90,
        paymentMethod: 'Cash',
        status: 'Paid',
        cashier: 'Priya Cashier'
      },
      {
        id: 'FH-BILL-1085',
        billNumber: 'FH-1085',
        date: `${isoD2}T16:45:00`,
        customerName: 'Suresh Menon',
        customerPhone: '+91 98760 12345',
        items: [
          { productId: 'prod-1', name: 'Fresh Farm Organic Milk', price: 64, quantity: 4, subtotal: 256.00 },
          { productId: 'prod-4', name: 'Artisanal Sourdough Whole Bread', price: 85, quantity: 2, subtotal: 170.00 }
        ],
        subtotal: 426.00,
        discount: 0,
        tax: 21.30,
        grandTotal: 447.30,
        paymentMethod: 'Card',
        status: 'Paid',
        cashier: 'Priya Cashier'
      },
      {
        id: 'FH-BILL-1080',
        billNumber: 'FH-1080',
        date: `${isoD3}T10:10:00`,
        customerName: 'Divya Rao',
        customerPhone: '+91 99001 12233',
        items: [
          { productId: 'prod-5', name: 'Premium Royal Basmati Rice (5kg)', price: 459.08, quantity: 1, subtotal: 459.08 },
          { productId: 'prod-7', name: 'Fresh Green Broccoli Florets', price: 75, quantity: 1, subtotal: 75.00 }
        ],
        subtotal: 534.08,
        discount: 25.00,
        tax: 25.45,
        grandTotal: 534.53,
        paymentMethod: 'UPI',
        status: 'Paid',
        cashier: 'Vikram Singh'
      },
      {
        id: 'FH-BILL-1075',
        billNumber: 'FH-1075',
        date: `${isoD5}T15:30:00`,
        customerName: 'Aditya Kulkarni',
        customerPhone: '+91 98440 98765',
        items: [
          { productId: 'prod-9', name: 'Authentic South Indian Filter Coffee (250g)', price: 165, quantity: 2, subtotal: 330.00 }
        ],
        subtotal: 330.00,
        discount: 0,
        tax: 16.50,
        grandTotal: 346.50,
        paymentMethod: 'Cash',
        status: 'Paid',
        cashier: 'Vikram Singh'
      }
    ];
  }

  const DEFAULT_CUSTOMERS = [
    { id: 'cust-1', name: 'Aarav Sharma', phone: '+91 98451 23456', email: 'aarav.s@example.com', points: 340, totalSpent: 4520.00, visits: 8, joinDate: '2026-01-15' },
    { id: 'cust-2', name: 'Ananya Iyer', phone: '+91 99887 76655', email: 'ananya.i@example.com', points: 210, totalSpent: 2890.00, visits: 5, joinDate: '2026-03-10' },
    { id: 'cust-3', name: 'Rohan Verma', phone: '+91 91234 56789', email: 'rohan.v@example.com', points: 150, totalSpent: 1980.00, visits: 4, joinDate: '2026-05-22' },
    { id: 'cust-4', name: 'Meera Patel', phone: '+91 97654 32109', email: 'meera.p@example.com', points: 480, totalSpent: 6200.00, visits: 12, joinDate: '2026-02-01' },
    { id: 'cust-5', name: 'Kavita Nair', phone: '+91 98112 23344', email: 'kavita.n@example.com', points: 80, totalSpent: 1120.00, visits: 2, joinDate: '2026-08-05' }
  ];

  const DEFAULT_SUPPLIERS = [
    { id: 'sup-1', name: 'GreenField Organic Farms', contactPerson: 'Ramesh Gowda', phone: '+91 94480 11223', email: 'orders@greenfield.farm', category: 'Fruits & Vegetables', address: 'Mandya, Karnataka' },
    { id: 'sup-2', name: 'Nandini & Harvest Dairy Cooperative', contactPerson: 'Girish Kumar', phone: '+91 94481 22334', email: 'supply@harvestdairy.coop', category: 'Dairy & Eggs', address: 'Kolar, Karnataka' },
    { id: 'sup-3', name: 'Royal Staples & Grains Wholesalers', contactPerson: 'Harish Gupta', phone: '+91 94482 33445', email: 'sales@royalgrains.in', category: 'Grains & Staples', address: 'Yeshwanthpur APMC, Bengaluru' }
  ];

  const DEFAULT_RETURNS = [
    {
      id: 'ret-101',
      billId: 'FH-BILL-1088',
      date: '2026-09-17T19:10:00',
      customerName: 'Meera Patel',
      customerPhone: '+91 97654 32109',
      items: [{ productId: 'prod-1', name: 'Fresh Farm Organic Milk', quantity: 1, refundAmount: 64.00 }],
      refundAmount: 64.00,
      reason: 'Packaging seal broke during transit',
      action: 'Stock Written Off',
      status: 'Refunded'
    }
  ];

  const DEFAULT_OFFERS = [
    { id: 'off-1', title: 'Weekend Fresh Fruits Bonanza', code: 'FRUITS10', discountPercent: 10, category: 'Fruits & Vegetables', validTill: '2026-10-31', status: 'Active' },
    { id: 'off-2', title: 'Dairy Essentials 5% Off', code: 'DAIRY5', discountPercent: 5, category: 'Dairy & Eggs', validTill: '2026-12-31', status: 'Active' },
    { id: 'off-3', title: 'Flat ₹50 Off on orders above ₹1000', code: 'SUPER50', flatDiscount: 50, minBillAmount: 1000, validTill: '2026-11-30', status: 'Active' }
  ];

  const DEFAULT_STAFF = [
    { id: 'stf-1', name: 'Priya Cashier', role: 'Cashier', phone: '+91 98800 11111', pin: '1234', shift: 'Morning (8 AM - 4 PM)', status: 'Active' },
    { id: 'stf-2', name: 'Vikram Singh', role: 'Cashier / Inventory Lead', phone: '+91 98800 22222', pin: '5678', shift: 'Evening (2 PM - 10 PM)', status: 'Active' },
    { id: 'stf-3', name: 'Admin Manager', role: 'Store Manager', phone: '+91 98800 33333', pin: '9999', shift: 'Full Time', status: 'Active' }
  ];

  const DEFAULT_ALERTS = [
    { id: 'alt-1', timestamp: '2026-09-18T14:30:00', formattedTime: '18 Sep 2026, 02:30 PM', type: 'low_stock', productId: 'prod-4', productName: 'Artisanal Sourdough Whole Bread', message: '⚠️ Low Stock Warning: Only 3 Loaves remaining in inventory.' },
    { id: 'alt-2', timestamp: '2026-09-18T13:15:00', formattedTime: '18 Sep 2026, 01:15 PM', type: 'out_of_stock', productId: 'prod-6', productName: 'Cold Pressed Extra Virgin Olive Oil (1L)', message: '🛑 Out of Stock: Product has reached 0 units.' },
    { id: 'alt-3', timestamp: '2026-09-18T10:00:00', formattedTime: '18 Sep 2026, 10:00 AM', type: 'low_stock', productId: 'prod-3', productName: 'Farm Fresh Brown Eggs (Pack of 12)', message: '⚠️ Low Stock Warning: Only 4 Packs left.' }
  ];

  const DEFAULT_MESSAGES = [
    { id: 'msg-1', timestamp: '2026-09-18T14:33:00', formattedTime: '18 Sep 2026, 02:33 PM', channel: 'WhatsApp', phone: '+91 98451 23456', customerName: 'Aarav Sharma', billId: 'FH-BILL-1091', amount: 840.00, status: 'Sent' },
    { id: 'msg-2', timestamp: '2026-09-18T11:16:00', formattedTime: '18 Sep 2026, 11:16 AM', channel: 'WhatsApp', phone: '+91 99887 76655', customerName: 'Ananya Iyer', billId: 'FH-BILL-1092', amount: 386.00, status: 'Sent' }
  ];

  // Core Data Access Layer
  const DataStore = {
    // Initializer
    init() {
      // Products initialization with dual-key fallback and full product normalization
      try {
        let prods = null;
        const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS) || localStorage.getItem(LEGACY_KEYS.PRODUCTS);
        if (stored) {
          try {
            prods = JSON.parse(stored);
          } catch(e) {
            prods = null;
          }
        }
        if (!Array.isArray(prods) || prods.length === 0) {
          prods = DEFAULT_PRODUCTS;
        } else {
          // Ensure all target DEFAULT_PRODUCTS exist and have dual fields normalized
          DEFAULT_PRODUCTS.forEach(dp => {
            const idx = prods.findIndex(p => String(p.id) === String(dp.id) || (p.name && p.name.toLowerCase() === dp.name.toLowerCase()));
            if (idx === -1) {
              prods.push(dp);
            } else {
              const p = prods[idx];
              if (p.stock === undefined && p.stockQty !== undefined) p.stock = p.stockQty;
              if (p.stockQty === undefined && p.stock !== undefined) p.stockQty = p.stock;
              if (p.sellingPrice === undefined && p.price !== undefined) p.sellingPrice = p.price;
              if (p.price === undefined && p.sellingPrice !== undefined) p.price = p.sellingPrice;
              if (p.cost === undefined && p.costPrice !== undefined) p.cost = p.costPrice;
              if (p.costPrice === undefined && p.cost !== undefined) p.costPrice = p.cost;
              if (!p.image && dp.image) p.image = dp.image;
              if (!p.unit && dp.unit) p.unit = dp.unit;
            }
          });
          prods.forEach(p => {
            if (p.stock === undefined && p.stockQty !== undefined) p.stock = p.stockQty;
            if (p.stockQty === undefined && p.stock !== undefined) p.stockQty = p.stock;
            if (p.sellingPrice === undefined && p.price !== undefined) p.sellingPrice = p.price;
            if (p.price === undefined && p.sellingPrice !== undefined) p.price = p.sellingPrice;
            if (p.cost === undefined && p.costPrice !== undefined) p.cost = p.costPrice;
            if (p.costPrice === undefined && p.cost !== undefined) p.costPrice = p.cost;
          });
        }
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
        localStorage.setItem(LEGACY_KEYS.PRODUCTS, JSON.stringify(prods));
      } catch(e) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
      }

      // Bills initialization
      if (!localStorage.getItem(STORAGE_KEYS.BILLS)) {
        const legacy = localStorage.getItem(LEGACY_KEYS.BILLS);
        if (legacy) {
          try {
            localStorage.setItem(STORAGE_KEYS.BILLS, legacy);
          } catch(e) {
            localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(generateDefaultBills()));
          }
        } else {
          localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(generateDefaultBills()));
        }
      }

      // Customers
      if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
      }

      // Categories
      if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      }

      // Settings
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }

      // Suppliers
      if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(DEFAULT_SUPPLIERS));
      }

      // Returns
      if (!localStorage.getItem(STORAGE_KEYS.RETURNS)) {
        localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(DEFAULT_RETURNS));
      }

      // Offers
      if (!localStorage.getItem(STORAGE_KEYS.OFFERS)) {
        localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(DEFAULT_OFFERS));
      }

      // Staff
      if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
      }

      // Alerts
      if (!localStorage.getItem(STORAGE_KEYS.ALERTS)) {
        localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(DEFAULT_ALERTS));
      }

      // Messages
      if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(DEFAULT_MESSAGES));
      }
    },

    // Generic Getters/Setters with dual-key sync
    get(key, fallback = null) {
      try {
        const val = localStorage.getItem(STORAGE_KEYS[key] || key);
        return val ? JSON.parse(val) : (fallback !== null ? fallback : null);
      } catch (e) {
        console.error('DataStore get error for key:', key, e);
        return fallback !== null ? fallback : null;
      }
    },

    set(key, data) {
      try {
        const storageKey = STORAGE_KEYS[key] || key;
        const serialized = JSON.stringify(data);
        localStorage.setItem(storageKey, serialized);
        
        // Sync legacy key if exists
        if (LEGACY_KEYS[key]) {
          localStorage.setItem(LEGACY_KEYS[key], serialized);
        }

        // Emit change event
        window.dispatchEvent(new CustomEvent('freshHarvestDataUpdated', { detail: { key, data } }));
        return true;
      } catch (e) {
        console.error('DataStore set error for key:', key, e);
        return false;
      }
    },

    // PRODUCTS
    getProducts() {
      const prods = this.get('PRODUCTS');
      return Array.isArray(prods) && prods.length > 0 ? prods : DEFAULT_PRODUCTS;
    },

    getProductById(id) {
      if (id === undefined || id === null || id === '') return null;
      const prods = this.getProducts();
      const idStr = String(id).trim();

      // 1. Direct or String ID match
      let prod = prods.find(p => String(p.id) === idStr || p.id == id);
      if (prod) return prod;

      // 2. Barcode or SKU match if any
      prod = prods.find(p => (p.barcode && String(p.barcode) === idStr) || (p.sku && String(p.sku) === idStr));
      if (prod) return prod;

      // 3. Exact Name match (case-insensitive)
      const lowerQuery = idStr.toLowerCase();
      prod = prods.find(p => p.name && p.name.toLowerCase() === lowerQuery);
      if (prod) return prod;

      // 4. Substring name match
      prod = prods.find(p => p.name && (p.name.toLowerCase().includes(lowerQuery) || lowerQuery.includes(p.name.toLowerCase())));
      return prod || null;
    },

    saveProduct(product) {
      const prods = this.getProducts();
      const idStr = product.id ? String(product.id).trim() : '';
      const idx = prods.findIndex(p => (idStr && (String(p.id) === idStr || p.id == product.id)) || (p.name && product.name && p.name.toLowerCase() === product.name.toLowerCase()));
      
      let prevStock = 0;
      if (idx >= 0) {
        prevStock = Number(prods[idx].stock) || 0;
        prods[idx] = { ...prods[idx], ...product };
      } else {
        if (!product.id) product.id = 'prod-' + Date.now();
        prods.unshift(product);
      }
      
      this.set('PRODUCTS', prods);

      // Check stock status transition
      if (typeof product.stock === 'number') {
        this.evaluateStockTransition(product, prevStock, product.stock);
      }

      return product;
    },

    deleteProduct(id) {
      const idStr = String(id).trim();
      const prods = this.getProducts().filter(p => String(p.id) !== idStr && p.id != id);
      this.set('PRODUCTS', prods);
      return true;
    },

    // CART OPERATIONS (SHARED ACROSS POS AND ALL PAGES)
    getCart() {
      try {
        const val = localStorage.getItem(STORAGE_KEYS.CART) || localStorage.getItem('freshHarvestCurrentCart') || localStorage.getItem('currentCart') || localStorage.getItem('pos_cart') || localStorage.getItem('freshHarvestCart');
        return val ? JSON.parse(val) : [];
      } catch (e) {
        return [];
      }
    },

    saveCart(cart) {
      try {
        const serialized = JSON.stringify(cart || []);
        localStorage.setItem(STORAGE_KEYS.CART, serialized);
        localStorage.setItem('freshHarvestCurrentCart', serialized);
        localStorage.setItem('currentCart', serialized);
        localStorage.setItem('pos_cart', serialized);
        localStorage.setItem('freshHarvestCart', serialized);
        window.dispatchEvent(new CustomEvent('freshHarvestCartUpdated', { detail: cart }));
        return true;
      } catch (e) {
        console.error('DataStore failed to save cart:', e);
        return false;
      }
    },

    addToCart(productId, qtyToAdd = 1) {
      if (!productId) {
        showToast('❌ Product ID missing', 'danger', 'Error');
        return { success: false, reason: 'missing_id' };
      }

      const prod = this.getProductById(productId);
      if (!prod) {
        showToast('❌ Product not found', 'danger', 'Error');
        return { success: false, reason: 'not_found' };
      }

      const availableStock = Number(prod.stock !== undefined ? prod.stock : prod.stockQty) || 0;
      if (availableStock <= 0) {
        showToast('⚠️ Product is out of stock', 'warning', 'Out of Stock');
        return { success: false, reason: 'out_of_stock', product: prod };
      }

      const cart = this.getCart();
      const pIdStr = String(prod.id);
      const existing = cart.find(item => String(item.productId || item.id) === pIdStr);

      const currentQ = existing ? (Number(existing.quantity || existing.qty) || 1) : 0;
      const newQ = currentQ + Number(qtyToAdd);

      if (newQ > availableStock) {
        showToast('⚠️ Maximum available stock reached', 'warning', 'Max Stock Limit');
        return { success: false, reason: 'stock_limit', currentQty: currentQ, maxStock: availableStock, product: prod };
      }

      const unitPrice = Number(prod.sellingPrice !== undefined ? prod.sellingPrice : prod.price) || 0;
      const unitCost = Number(prod.costPrice !== undefined ? prod.costPrice : prod.cost) || 0;

      if (existing) {
        existing.quantity = newQ;
        existing.qty = newQ;
        existing.price = unitPrice;
        existing.sellingPrice = unitPrice;
        existing.costPrice = unitCost;
        if (!existing.image && prod.image) existing.image = prod.image;
        if (!existing.unit && prod.unit) existing.unit = prod.unit;
      } else {
        cart.push({
          id: prod.id,
          productId: prod.id,
          name: prod.name,
          price: unitPrice,
          sellingPrice: unitPrice,
          costPrice: unitCost,
          cost: unitCost,
          unit: prod.unit || '1 unit',
          quantity: newQ,
          qty: newQ,
          image: prod.image || '',
          sku: prod.sku || '',
          category: prod.category || ''
        });
      }

      this.saveCart(cart);
      showToast(`✅ ${prod.name} added to bill`, 'success', 'Cart Updated');
      return { success: true, cart, product: prod, quantity: newQ };
    },

    updateCartItemQty(productId, delta) {
      const cart = this.getCart();
      const pIdStr = String(productId);
      const itemIndex = cart.findIndex(item => String(item.productId || item.id) === pIdStr);
      if (itemIndex === -1) return { success: false };

      const prod = this.getProductById(productId);
      const item = cart[itemIndex];
      const currentQ = Number(item.quantity || item.qty) || 1;
      const newQ = currentQ + Number(delta);
      const availableStock = prod ? (Number(prod.stock !== undefined ? prod.stock : prod.stockQty) || 0) : 9999;

      if (prod && newQ > availableStock) {
        showToast('⚠️ Maximum available stock reached', 'warning', 'Max Stock Limit');
        return { success: false, reason: 'stock_limit' };
      }

      if (newQ <= 0) {
        cart.splice(itemIndex, 1);
      } else {
        item.quantity = newQ;
        item.qty = newQ;
      }

      this.saveCart(cart);
      return { success: true, cart };
    },

    removeCartItem(productId) {
      const pIdStr = String(productId);
      const cart = this.getCart().filter(item => String(item.productId || item.id) !== pIdStr);
      this.saveCart(cart);
      return { success: true, cart };
    },

    clearCart() {
      this.saveCart([]);
      return { success: true, cart: [] };
    },

    // STOCK EVALUATION & ALERT TRIGGER
    evaluateStockTransition(product, prevStock, newStock) {
      const settings = this.getSettings();
      const threshold = product.minStock || settings.lowStockDefaultThreshold || 5;

      let alertType = null;
      let alertMsg = null;
      let toastTitle = null;

      if (prevStock > 0 && newStock <= 0) {
        alertType = 'out_of_stock';
        toastTitle = '🛑 Out of Stock';
        alertMsg = `Product "${product.name}" is completely sold out! (0 left)`;
      } else if (prevStock > threshold && newStock <= threshold && newStock > 0) {
        alertType = 'low_stock';
        toastTitle = '⚠️ Low Stock Warning';
        alertMsg = `Product "${product.name}" is running low! Only ${newStock} ${product.unit || 'units'} remaining.`;
      } else if (prevStock <= threshold && newStock > threshold) {
        alertType = 'restored';
        toastTitle = '✅ Stock Restored';
        alertMsg = `Product "${product.name}" has been restocked to ${newStock} ${product.unit || 'units'}.`;
      }

      if (alertType) {
        // Record in alerts log
        this.addAlert({
          type: alertType,
          productId: product.id,
          productName: product.name,
          message: alertMsg,
          currentStock: newStock,
          threshold
        });

        // Audio chime if enabled
        if (settings.enableAudioAlerts !== false) {
          playAlertChime(alertType);
        }

        // Show Toast
        const toastType = alertType === 'out_of_stock' ? 'danger' : (alertType === 'low_stock' ? 'warning' : 'success');
        showToast(alertMsg, toastType, toastTitle);

        // Broadcast event
        window.dispatchEvent(new CustomEvent('freshHarvestStockAlert', { 
          detail: { product, prevStock, newStock, alertType, message: alertMsg } 
        }));
      }
    },

    // Stock adjustment helper
    adjustStock(productId, deltaOrNewQty, isDelta = true, reason = 'Adjustment') {
      const prods = this.getProducts();
      const pIdStr = String(productId).trim();
      const prod = prods.find(p => String(p.id) === pIdStr || p.id == productId || (p.name && p.name.toLowerCase() === pIdStr.toLowerCase()));
      if (!prod) return false;

      const prevStock = Number(prod.stock) || 0;
      let newStock = isDelta ? prevStock + Number(deltaOrNewQty) : Number(deltaOrNewQty);
      if (newStock < 0) newStock = 0;

      prod.stock = newStock;
      if (newStock <= 0) {
        prod.status = 'Out of Stock';
      } else if (newStock <= (prod.minStock || 5)) {
        prod.status = 'Low Stock';
      } else {
        prod.status = 'In Stock';
      }

      this.set('PRODUCTS', prods);
      this.evaluateStockTransition(prod, prevStock, newStock);
      return prod;
    },

    // ALERTS
    getAlerts() {
      const alerts = this.get('ALERTS');
      return Array.isArray(alerts) ? alerts : [];
    },

    addAlert(alertData) {
      const alerts = this.getAlerts();
      const now = new Date();
      const newAlert = {
        id: 'alt-' + Date.now(),
        timestamp: now.toISOString(),
        formattedTime: formatDateTime(now),
        ...alertData
      };
      alerts.unshift(newAlert);
      if (alerts.length > 50) alerts.length = 50; // Cap at 50 recent
      this.set('ALERTS', alerts);
      return newAlert;
    },

    clearAlerts() {
      this.set('ALERTS', []);
      return true;
    },

    // BILLS & POS CHECKOUT
    getBills() {
      const bills = this.get('BILLS');
      return Array.isArray(bills) ? bills : [];
    },

    createBill(billData) {
      const bills = this.getBills();
      const now = new Date();
      const billId = billData.id || 'FH-BILL-' + Math.floor(1000 + Math.random() * 9000);
      const billNumber = billData.billNumber || billId.replace('FH-BILL-', 'FH-');

      const newBill = {
        id: billId,
        billNumber,
        date: billData.date || now.toISOString(),
        customerName: billData.customerName || 'Walk-in Customer',
        customerPhone: billData.customerPhone || '',
        items: billData.items || [],
        subtotal: Number(billData.subtotal) || 0,
        discount: Number(billData.discount) || 0,
        tax: Number(billData.tax) || 0,
        grandTotal: Number(billData.grandTotal) || 0,
        paymentMethod: billData.paymentMethod || 'Cash',
        status: 'Paid',
        cashier: billData.cashier || 'Cashier Desk',
        notes: billData.notes || ''
      };

      bills.unshift(newBill);
      this.set('BILLS', bills);

      // Decrement stock for all items
      if (Array.isArray(newBill.items)) {
        newBill.items.forEach(item => {
          if (item.productId) {
            this.adjustStock(item.productId, -Math.abs(item.quantity || 1), true, 'POS Sale Bill ' + billNumber);
          }
        });
      }

      // Update or register customer if phone is provided
      if (newBill.customerPhone && newBill.customerPhone.trim().length >= 10) {
        this.recordCustomerPurchase(newBill.customerPhone, newBill.customerName, newBill.grandTotal);
      }

      window.dispatchEvent(new CustomEvent('freshHarvestBillCreated', { detail: newBill }));
      return newBill;
    },

    // CUSTOMERS
    getCustomers() {
      const custs = this.get('CUSTOMERS');
      return Array.isArray(custs) ? custs : [];
    },

    recordCustomerPurchase(phone, name, amount) {
      const custs = this.getCustomers();
      const cleanPhone = phone.trim();
      let customer = custs.find(c => c.phone && c.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''));

      const earnedPoints = Math.floor(amount / 10); // 1 point per ₹10

      if (customer) {
        customer.totalSpent = (Number(customer.totalSpent) || 0) + Number(amount);
        customer.points = (Number(customer.points) || 0) + earnedPoints;
        customer.visits = (Number(customer.visits) || 0) + 1;
        if (name && name !== 'Walk-in Customer') customer.name = name;
      } else {
        customer = {
          id: 'cust-' + Date.now(),
          name: (name && name !== 'Walk-in Customer') ? name : 'Valued Customer',
          phone: cleanPhone,
          email: '',
          points: earnedPoints,
          totalSpent: Number(amount),
          visits: 1,
          joinDate: new Date().toISOString().split('T')[0]
        };
        custs.unshift(customer);
      }

      this.set('CUSTOMERS', custs);
      return customer;
    },

    // MESSAGING & WHATSAPP LOG
    getMessages() {
      const msgs = this.get('MESSAGES');
      return Array.isArray(msgs) ? msgs : [];
    },

    logMessage(msgData) {
      const msgs = this.getMessages();
      const now = new Date();
      const channel = msgData.channel || msgData.type || 'SMS';
      const defaultStatus = channel.toUpperCase() === 'SMS' ? 'OPENED_COMPOSER' : 'Sent';
      const newMsg = {
        id: 'msg-' + Date.now(),
        timestamp: now.toISOString(),
        formattedTime: formatDateTime(now),
        channel: channel,
        phone: msgData.phone || '',
        customerName: msgData.customerName || 'Customer',
        billId: msgData.billId || '—',
        amount: Number(msgData.amount) || 0,
        status: msgData.status || defaultStatus,
        previewText: msgData.text ? msgData.text.substring(0, 80) + '...' : ''
      };
      msgs.unshift(newMsg);
      if (msgs.length > 100) msgs.length = 100;
      this.set('MESSAGES', msgs);
      return newMsg;
    },

    // RETURNS & REFUNDS
    getReturns() {
      const rets = this.get('RETURNS');
      return Array.isArray(rets) ? rets : [];
    },

    createReturn(returnData) {
      const returns = this.getReturns();
      const now = new Date();
      const newReturn = {
        id: 'ret-' + Date.now(),
        date: now.toISOString(),
        formattedTime: formatDateTime(now),
        billId: returnData.billId,
        customerName: returnData.customerName || 'Customer',
        customerPhone: returnData.customerPhone || '',
        items: returnData.items || [],
        refundAmount: Number(returnData.refundAmount) || 0,
        reason: returnData.reason || 'Customer Return',
        action: returnData.action || 'Stock Restocked',
        status: 'Refunded'
      };

      returns.unshift(newReturn);
      this.set('RETURNS', returns);

      // If restocked, increase inventory
      if (returnData.action === 'Stock Restocked' && Array.isArray(returnData.items)) {
        returnData.items.forEach(item => {
          if (item.productId) {
            this.adjustStock(item.productId, Math.abs(item.quantity || 1), true, 'Return Restock for Bill ' + returnData.billId);
          }
        });
      }

      window.dispatchEvent(new CustomEvent('freshHarvestReturnCreated', { detail: newReturn }));
      return newReturn;
    },

    // SETTINGS
    getSettings() {
      const s = this.get('SETTINGS');
      return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS;
    },

    saveSettings(newSettings) {
      const current = this.getSettings();
      const updated = { ...current, ...newSettings };
      this.set('SETTINGS', updated);
      return updated;
    },

    // CATEGORIES
    getCategories() {
      const cats = this.get('CATEGORIES');
      return Array.isArray(cats) ? cats : DEFAULT_CATEGORIES;
    },

    saveCategory(category) {
      const cats = this.getCategories();
      const idx = cats.findIndex(c => c.id === category.id);
      if (idx >= 0) {
        cats[idx] = { ...cats[idx], ...category };
      } else {
        if (!category.id) category.id = 'cat-' + Date.now();
        cats.push(category);
      }
      this.set('CATEGORIES', cats);
      return category;
    },

    // SUPPLIERS
    getSuppliers() {
      const sups = this.get('SUPPLIERS');
      return Array.isArray(sups) ? sups : DEFAULT_SUPPLIERS;
    },

    // FINANCIAL COMPUTATIONS (NO HARDCODING)
    getIncomeAnalytics() {
      const bills = this.getBills();
      const returns = this.getReturns();

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const yestDate = new Date(now);
      yestDate.setDate(yestDate.getDate() - 1);
      const yestStr = yestDate.toISOString().split('T')[0];

      // 7 Days ago
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - 7);

      // Start of Month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Start of Year
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Today's stats
      let todaySales = 0;
      let todayBillCount = 0;
      let todayCustomers = new Set();
      let todayCash = 0;
      let todayUpi = 0;
      let todayCard = 0;

      // Yesterday's stats
      let yestSales = 0;

      // Periods
      let weeklySales = 0;
      let monthlySales = 0;
      let yearlySales = 0;
      let totalSales = 0;

      bills.forEach(b => {
        const bTotal = Number(b.grandTotal) || 0;
        const bDate = new Date(b.date);
        const bDateStr = b.date ? b.date.split('T')[0] : '';

        totalSales += bTotal;

        if (bDateStr === todayStr) {
          todaySales += bTotal;
          todayBillCount++;
          if (b.customerPhone) todayCustomers.add(b.customerPhone);
          else if (b.customerName) todayCustomers.add(b.customerName + '-' + b.id);

          const method = (b.paymentMethod || 'Cash').toLowerCase();
          if (method.includes('upi') || method.includes('qr') || method.includes('gpay')) todayUpi += bTotal;
          else if (method.includes('card') || method.includes('debit') || method.includes('credit')) todayCard += bTotal;
          else todayCash += bTotal;
        }

        if (bDateStr === yestStr) {
          yestSales += bTotal;
        }

        if (bDate >= weekDate) {
          weeklySales += bTotal;
        }

        if (bDate >= startOfMonth) {
          monthlySales += bTotal;
        }

        if (bDate >= startOfYear) {
          yearlySales += bTotal;
        }
      });

      // Refunds calculation
      let todayRefunds = 0;
      let totalRefunds = 0;

      returns.forEach(r => {
        const rAmt = Number(r.refundAmount) || 0;
        totalRefunds += rAmt;
        const rDateStr = r.date ? r.date.split('T')[0] : '';
        if (rDateStr === todayStr) {
          todayRefunds += rAmt;
        }
      });

      const todayNet = Math.max(0, todaySales - todayRefunds);
      const totalNet = Math.max(0, totalSales - totalRefunds);

      // Percentage Change vs Yesterday
      let percentageChange = 0;
      let isPositiveChange = true;
      if (yestSales > 0) {
        percentageChange = Math.round(((todaySales - yestSales) / yestSales) * 100);
        isPositiveChange = percentageChange >= 0;
      } else if (todaySales > 0) {
        percentageChange = 100;
        isPositiveChange = true;
      }

      return {
        today: {
          grossIncome: todaySales,
          refunds: todayRefunds,
          netIncome: todayNet,
          billCount: todayBillCount,
          customerCount: todayCustomers.size || todayBillCount,
          cash: todayCash,
          upi: todayUpi,
          card: todayCard,
          yesterdaySales: yestSales,
          percentageChange: Math.abs(percentageChange),
          isPositiveChange
        },
        periods: {
          today: todaySales,
          weekly: weeklySales,
          monthly: monthlySales,
          yearly: yearlySales,
          total: totalSales,
          totalNet
        }
      };
    },

    // Date-wise breakdown table generator
    getDateWiseBreakdown() {
      const bills = this.getBills();
      const returns = this.getReturns();

      const dateMap = {};

      bills.forEach(b => {
        const dateStr = b.date ? b.date.split('T')[0] : 'Unknown Date';
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = {
            dateStr,
            dateObj: new Date(dateStr),
            formattedDate: formatDateOnly(dateStr),
            billsCount: 0,
            grossIncome: 0,
            cash: 0,
            upi: 0,
            card: 0,
            refunds: 0,
            netIncome: 0,
            billsList: []
          };
        }

        const amt = Number(b.grandTotal) || 0;
        dateMap[dateStr].billsCount++;
        dateMap[dateStr].grossIncome += amt;
        dateMap[dateStr].billsList.push(b);

        const method = (b.paymentMethod || 'Cash').toLowerCase();
        if (method.includes('upi')) dateMap[dateStr].upi += amt;
        else if (method.includes('card')) dateMap[dateStr].card += amt;
        else dateMap[dateStr].cash += amt;
      });

      // Factor in returns
      returns.forEach(r => {
        const dateStr = r.date ? r.date.split('T')[0] : '';
        if (dateStr && dateMap[dateStr]) {
          const refAmt = Number(r.refundAmount) || 0;
          dateMap[dateStr].refunds += refAmt;
        }
      });

      // Compute Net
      const breakdown = Object.values(dateMap).map(d => {
        d.netIncome = Math.max(0, d.grossIncome - d.refunds);
        return d;
      });

      // Sort descending by date
      breakdown.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));
      return breakdown;
    }
  };

  // Global cart helpers
  window.addToBill = function(productId) {
    return DataStore.addToCart(productId, 1);
  };
  window.addProductToBill = window.addToBill;
  window.addToPOSCart = window.addToBill;
  window.addToCart = window.addToBill;

  // Global delegation listener for any + Add / Add to Bill buttons across pages
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', function(e) {
      const btn = e.target.closest && e.target.closest('.add-to-bill, .btn-card-add, .btn-add-cart, .add-btn, [data-action="add-to-bill"]');
      if (btn) {
        const pId = btn.dataset?.productId || (btn.getAttribute && btn.getAttribute('data-product-id'));
        if (pId) {
          if (btn._fhClicked) return;
          btn._fhClicked = true;
          setTimeout(() => { btn._fhClicked = false; }, 250);
          window.addToBill(pId);
        }
      }
    });
  }

  // Auto initialize when loaded
  DataStore.init();

  DataStore.normalizeIndianMobileNumber = normalizeIndianMobileNumber;

  // Expose globally
  window.DataStore = DataStore;
  window.normalizeIndianMobileNumber = normalizeIndianMobileNumber;
  window.formatDateTime = formatDateTime;
  window.formatDateOnly = formatDateOnly;
  window.formatCurrency = formatCurrency;
  window.showToast = showToast;
  window.playAlertChime = playAlertChime;

})(window);
