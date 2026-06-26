// Vercel Serverless Function for /api/documents/next-number

let documents = [];
let seeded = false;

function seedIfNeeded() {
  if (seeded) return;
  seeded = true;

  const seedDocs = [
    { type: 'Quote', number: 'QT-001' },
    { type: 'Tax Invoice', number: 'INV-001' },
    { type: 'Delivery Challan', number: 'DC-001' }
  ];

  seedDocs.forEach((doc) => {
    documents.push(doc);
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  seedIfNeeded();

  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Document type is required' });
  }

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
  const formattedNum = `${prefix}${String(next).padStart(3, '0')}`;

  return res.status(200).json({ nextNumber: formattedNum });
}
