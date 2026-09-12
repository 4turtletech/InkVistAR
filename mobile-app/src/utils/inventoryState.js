const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const normalizeInventoryItem = (item) => ({
  ...item,
  current_stock: numeric(item.current_stock ?? item.currentStock ?? item.quantity ?? item.stock ?? 0),
  min_stock: numeric(item.min_stock ?? item.minStock ?? item.minimum_stock ?? item.reorder_level ?? 0),
  max_stock: numeric(item.max_stock ?? item.maxStock ?? 0),
  cost_per_unit: numeric(item.cost_per_unit ?? item.cost ?? 0),
});

export const inventoryAlerts = (items) => {
  const active = items.filter(item => ![true, 1, '1'].includes(item.is_deleted)).map(normalizeInventoryItem);
  return {
    outOfStock: active.filter(item => item.current_stock <= 0),
    lowStock: active.filter(item => item.current_stock > 0 && item.current_stock <= item.min_stock),
  };
};

const INVENTORY_CATEGORIES = ['ink', 'needles', 'jewelry', 'supplies', 'aftercare', 'machinery'];

export const inventoryItemErrors = (form = {}, existingItems = [], editingId = null) => {
  const errors = {};
  const name = String(form.name || '').trim();
  const category = String(form.category || '').trim().toLowerCase();
  const unit = String(form.unit || '').trim();

  if (!name) errors.name = 'Item name is required.';
  else if (name.length > 255) errors.name = 'Item name cannot exceed 255 characters.';
  else if (/[<>]/.test(name)) errors.name = 'Item name cannot contain < or > characters.';
  else if (existingItems.some(item => (
    String(item.id) !== String(editingId ?? '')
    && ![true, 1, '1'].includes(item.is_deleted)
    && String(item.name || '').trim().toLowerCase() === name.toLowerCase()
  ))) errors.name = 'An active item with this name already exists.';

  if (!category) errors.category = 'Select a category.';
  else if (!INVENTORY_CATEGORIES.includes(category)) errors.category = 'Select a valid category.';

  if (!unit) errors.unit = 'Unit is required.';
  else if (unit.length > 20) errors.unit = 'Unit cannot exceed 20 characters.';
  else if (/[<>]/.test(unit)) errors.unit = 'Unit cannot contain < or > characters.';

  for (const [field, label] of [['current_stock', 'Current stock'], ['min_stock', 'Minimum stock']]) {
    const value = String(form[field] ?? '').trim();
    if (!value) errors[field] = `${label} is required.`;
    else if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
      errors[field] = `${label} must be a non-negative whole number.`;
    }
  }

  const cost = String(form.cost_per_unit ?? '').trim();
  if (!cost) errors.cost_per_unit = 'Cost per unit is required.';
  else if (!/^\d+(?:\.\d{1,2})?$/.test(cost) || !Number.isFinite(Number(cost)) || Number(cost) > 99999999.99) {
    errors.cost_per_unit = 'Enter a non-negative cost with up to 2 decimal places.';
  }

  return errors;
};
