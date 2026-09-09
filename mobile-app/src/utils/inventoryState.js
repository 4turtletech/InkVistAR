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
