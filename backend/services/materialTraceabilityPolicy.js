const cleanOptionalText = (value, maxLength) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().slice(0, maxLength);
  return cleaned || null;
};

const toDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
};

function getMaterialTraceabilitySnapshot(inventoryItem) {
  return {
    batchNumber: cleanOptionalText(inventoryItem?.batch_number, 100),
    lotNumber: cleanOptionalText(inventoryItem?.lot_number, 100),
    serialNumber: cleanOptionalText(inventoryItem?.serial_number, 100),
    expirationDate: toDateOnly(inventoryItem?.expiration_date),
  };
}

function validateInventoryMaterial(inventoryItem, now = new Date()) {
  if (!inventoryItem || inventoryItem.is_deleted) {
    return { valid: false, message: 'Inventory item is not available.' };
  }

  if (String(inventoryItem.recall_status || '').trim().toLowerCase() === 'recalled') {
    return { valid: false, message: `Cannot use item "${inventoryItem.name}": Item is recalled.` };
  }

  const snapshot = getMaterialTraceabilitySnapshot(inventoryItem);
  const today = toDateOnly(now);
  if (snapshot.expirationDate && today && snapshot.expirationDate < today) {
    return {
      valid: false,
      message: `Cannot use item "${inventoryItem.name}": Stock expired on ${snapshot.expirationDate}.`,
    };
  }

  return { valid: true, snapshot };
}

module.exports = {
  getMaterialTraceabilitySnapshot,
  validateInventoryMaterial,
};
