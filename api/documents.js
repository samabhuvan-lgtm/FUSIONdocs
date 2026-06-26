// Vercel Serverless Function for /api/documents
// Uses in-memory storage (Vercel has a read-only filesystem, so SQLite won't work)

let documents = [];
let nextId = 1;
let seeded = false;

function seedIfNeeded() {
  if (seeded) return;
  seeded = true;

  const seedDocs = [
    {
      type: 'Quote',
      number: 'QT-001',
      date: '2026-06-15',
      customer_name: 'Acme Corporates Ltd',
      billing_address: '102 Industrial Area, Sector 4, Gandhinagar, Gujarat',
      shipping_address: '102 Industrial Area, Sector 4, Gandhinagar, Gujarat',
      gstin: '24AAAAC1234A1Z1',
      po_reference: 'PO-2026-991',
      discount_type: 'percentage',
      discount_value: 5,
      transaction_type: 'CGST_SGST',
      bom_items: [
        { id: 1, name: 'Precision Steel Rods', hsn: '7214', quantity: 200, unit: 'pcs', unitPrice: 45000 },
        { id: 2, name: 'Heavy Duty Bearings', hsn: '8482', quantity: 50, unit: 'pcs', unitPrice: 120000 }
      ],
      totals: {
        totalQuantity: 250,
        subtotalPaise: 15000000,
        discountPaise: 750000,
        taxBasisPaise: 14250000,
        cgstPaise: 1282500,
        sgstPaise: 1282500,
        igstPaise: 0,
        grandTotalPaise: 16815000,
        grandTotalWithoutGstPaise: 14250000
      }
    },
    {
      type: 'Tax Invoice',
      number: 'INV-001',
      date: '2026-06-16',
      customer_name: 'Apex Global Enterprises',
      billing_address: 'Building 4B, Tech Park, Gachibowli, Hyderabad, Telangana',
      shipping_address: 'Building 4B, Tech Park, Gachibowli, Hyderabad, Telangana',
      gstin: '36ABCDE1234F2Z5',
      po_reference: 'PO-7721-AX',
      discount_type: 'flat',
      discount_value: 100000,
      transaction_type: 'IGST',
      bom_items: [
        { id: 1, name: 'High-Speed Networking Switches', hsn: '8517', quantity: 5, unit: 'pcs', unitPrice: 2800000 },
        { id: 2, name: 'Cat6 Ethernet Spool (305m)', hsn: '8544', quantity: 12, unit: 'coils', unitPrice: 850000 }
      ],
      totals: {
        totalQuantity: 17,
        subtotalPaise: 24200000,
        discountPaise: 100000,
        taxBasisPaise: 24100000,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 4338000,
        grandTotalPaise: 28438000,
        grandTotalWithoutGstPaise: 24100000
      }
    },
    {
      type: 'Delivery Challan',
      number: 'DC-001',
      date: '2026-06-17',
      customer_name: 'Zenith Logistics',
      billing_address: 'Sector 15, Kalamboli, Navi Mumbai, Maharashtra',
      shipping_address: 'Warehouse A1, Gate 5, JNPT Area, Uran, Navi Mumbai, Maharashtra',
      gstin: '27GHIJK5678L1Z9',
      po_reference: 'PO-LOG-009',
      discount_type: 'percentage',
      discount_value: 0,
      transaction_type: 'CGST_SGST',
      bom_items: [
        { id: 1, name: 'Industrial Conveyor Belts (Heavy)', hsn: '4010', quantity: 3, unit: 'rolls', unitPrice: 15000000 }
      ],
      totals: {
        totalQuantity: 3,
        subtotalPaise: 45000000,
        discountPaise: 0,
        taxBasisPaise: 45000000,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        grandTotalPaise: 45000000,
        grandTotalWithoutGstPaise: 45000000
      }
    }
  ];

  seedDocs.forEach((doc) => {
    documents.push({
      id: nextId++,
      ...doc,
      created_at: new Date().toISOString()
    });
  });
}

function getNextNumber(type) {
  let prefix = 'QT-';
  if (type === 'Tax Invoice') prefix = 'INV-';
  else if (type === 'Delivery Challan') prefix = 'DC-';

  let maxNum = 0;
  documents
    .filter((d) => d.type === type)
    .forEach((d) => {
      const part = d.number.substring(prefix.length);
      const numVal = parseInt(part, 10);
      if (!isNaN(numVal) && numVal > maxNum) maxNum = numVal;
    });

  const next = maxNum + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  seedIfNeeded();

  // Route: GET /api/documents?customer=...&number=...&date=...
  if (req.method === 'GET') {
    const { customer, number, date } = req.query;

    let results = [...documents];

    if (customer) {
      results = results.filter((d) =>
        d.customer_name.toLowerCase().includes(customer.toLowerCase())
      );
    }
    if (number) {
      results = results.filter((d) =>
        d.number.toLowerCase().includes(number.toLowerCase())
      );
    }
    if (date) {
      results = results.filter((d) => d.date === date);
    }

    // Sort by created_at descending
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json(results);
  }

  // Route: POST /api/documents
  if (req.method === 'POST') {
    const {
      type,
      number: docNumber,
      date,
      customer_name,
      billing_address,
      shipping_address,
      gstin,
      po_reference,
      discount_type,
      discount_value,
      transaction_type,
      bom_items,
      totals
    } = req.body;

    if (!type || !docNumber || !date || !customer_name || !billing_address || !shipping_address) {
      return res.status(400).json({ error: 'Missing mandatory fields' });
    }

    if (!bom_items || !Array.isArray(bom_items) || bom_items.length === 0) {
      return res.status(400).json({ error: 'Bill of Materials (BOM) must contain at least one item' });
    }

    // Check for duplicate number
    if (documents.some((d) => d.number === docNumber)) {
      return res.status(400).json({ error: `Document number ${docNumber} already exists.` });
    }

    const newDoc = {
      id: nextId++,
      type,
      number: docNumber,
      date,
      customer_name,
      billing_address,
      shipping_address,
      gstin: gstin || '',
      po_reference: po_reference || '',
      discount_type: discount_type || '',
      discount_value: discount_value || 0,
      transaction_type,
      bom_items,
      totals,
      created_at: new Date().toISOString()
    };

    documents.push(newDoc);

    return res.status(201).json({ id: newDoc.id, message: 'Document saved successfully!' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
