/**
 * AdminPOS.jsx -- Retail Point of Sale & Billing
 * 1:1 functional parity with web's AdminPOS.js
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, SafeAreaView, KeyboardAvoidingView, Platform, Modal, RefreshControl, Image,
} from 'react-native';
import { Search, ArrowLeft, ShoppingCart, CheckCircle, X, Banknote, CreditCard, Smartphone, Plus, Minus, Trash2, Package, Tag, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { useToast } from '../src/context/ToastContext';
import { typography, spacing, borderRadius, shadows } from '../src/theme';
import { AnimatedTouchable } from '../src/components/shared/AnimatedTouchable';
import { StaggerItem } from '../src/components/shared/StaggerItem';
import { PremiumLoader } from '../src/components/shared/PremiumLoader';
import { SuccessCheckmark } from '../src/components/shared/SuccessCheckmark';
import { getAdminInventory, getAllUsersForAdmin, createAdminInvoice, processInventoryTransaction } from '../src/utils/api';

export const AdminPOS = ({ navigation }) => {
  const { theme, hapticsEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);
  const { showToast } = useToast();

  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [cart, setCart] = useState([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1 = Cart, 2 = Payment, 3 = Success
  
  // Checkout Form
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [discountType, setDiscountType] = useState('none');
  const [customDiscount, setCustomDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, usersRes] = await Promise.all([
        getAdminInventory(),
        getAllUsersForAdmin({ status: 'active' })
      ]);
      if (invRes.success) setInventory(invRes.data || []);
      if (usersRes.success) {
        const onlyCustomers = (usersRes.data || usersRes.users || []).filter(u => u.user_type === 'customer');
        setCustomers(onlyCustomers);
      }
    } catch (e) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const categories = useMemo(() => {
    const cats = new Set((inventory || []).map(item => item?.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return (inventory || []).filter(item => {
      if (!item) return false;
      const matchesSearch = (item.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      const aOut = a.current_stock <= 0 ? 1 : 0;
      const bOut = b.current_stock <= 0 ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
      return a.name.localeCompare(b.name);
    });
  }, [inventory, search, activeCategory]);

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= item.current_stock) {
        showToast('Out of Stock', 'warning');
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (item.current_stock <= 0) {
        showToast('Item is out of stock', 'warning');
        return;
      }
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    showToast(`Added ${item.name}`, 'success');
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQty = c.quantity + delta;
        if (newQty <= 0) return c;
        if (newQty > c.current_stock) {
          showToast('Insufficient stock', 'warning');
          return c;
        }
        return { ...c, quantity: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + ((item.retail_price || item.cost) * item.quantity), 0);
  const discountAmount = useMemo(() => {
    if (discountType === 'pwd_senior') return cartSubtotal * 0.20;
    if (discountType === 'promo_10') return cartSubtotal * 0.10;
    if (discountType === 'custom') return (cartSubtotal * (parseFloat(customDiscount) || 0)) / 100;
    return 0;
  }, [discountType, customDiscount, cartSubtotal]);
  const cartTotal = cartSubtotal - discountAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validate Cash
    if (paymentMethod === 'Cash') {
      const tendered = parseFloat(amountTendered) || 0;
      if (tendered < cartTotal) {
        Alert.alert('Insufficient Payment', 'Amount tendered is less than the total due.');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const customer = customers.find(c => c.id.toString() === selectedCustomer.toString());
      const clientLabel = customer ? customer.name : 'Walk-in Customer';

      // Deduct stock
      await Promise.all(cart.map(item => 
        processInventoryTransaction(item.id, {
          type: 'out', quantity: item.quantity, reason: 'POS Sale'
        })
      ));

      // Create Invoice
      const invoiceRes = await createAdminInvoice({
        client: clientLabel,
        type: 'Retail POS Sale',
        amount: cartSubtotal,
        discount_amount: discountAmount,
        discount_type: discountType !== 'none' ? discountType : null,
        status: 'Paid',
        customerId: customer ? customer.id : null,
        items: cart
      });

      const tenderedNum = parseFloat(amountTendered) || 0;
      setLastOrder({
        orderId: invoiceRes.data?.invoiceNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        total: cartTotal,
        changeGiven: paymentMethod === 'Cash' ? Math.max(0, tenderedNum - cartTotal) : 0,
        paymentMethod
      });
      
      setCart([]);
      setCheckoutStep(3); // Success Screen
      loadData(); // Refresh stock
    } catch (error) {
      showToast('Checkout failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeCart = () => {
    setCartModalVisible(false);
    if (checkoutStep === 3) {
      setCheckoutStep(1);
      setSelectedCustomer('');
      setAmountTendered('');
      setPaymentMethod('Cash');
    }
  };

  const methods = [
    { key: 'Cash', icon: Banknote, color: '#10b981' },
    { key: 'Card', icon: CreditCard, color: '#6366f1' },
    { key: 'GCash', icon: Smartphone, color: '#3b82f6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedTouchable onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </AnimatedTouchable>
        <View>
          <Text style={styles.headerTitle}>Studio POS</Text>
          <Text style={styles.headerSub}>Retail & Inventory Transactions</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={theme.textTertiary} />
        <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={theme.textTertiary} value={search} onChangeText={setSearch} />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {categories.map((cat, i) => (
            <StaggerItem key={cat} index={i}>
              <AnimatedTouchable onPress={() => setActiveCategory(cat)} style={[styles.filterPill, activeCategory === cat && styles.filterPillActive]}>
                <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>{cat}</Text>
              </AnimatedTouchable>
            </StaggerItem>
          ))}
        </ScrollView>
      </View>

      {loading ? <PremiumLoader message="Syncing Inventory..." /> : (
        <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={theme.gold} />}>
          {filteredInventory.length === 0 ? (
            <EmptyState icon={Filter} title="No products found" subtitle="Try adjusting your search" />
          ) : (
            <View style={styles.grid}>
              {filteredInventory.map((item, index) => (
                <StaggerItem key={item.id} index={index} style={styles.cardWrapper}>
                  <AnimatedTouchable 
                    style={[styles.card, item.current_stock <= 0 && { opacity: 0.5 }]} 
                    onPress={() => item.current_stock > 0 && addToCart(item)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardIcon}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.cardImage} />
                      ) : (
                        item.category?.toLowerCase() === 'ink' ? <Tag size={24} color={theme.textSecondary} /> : <Package size={24} color={theme.textSecondary} />
                      )}
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardCat} numberOfLines={1}>{item.category}</Text>
                    <View style={styles.cardBottom}>
                      <Text style={styles.cardPrice}>P{parseFloat(item.retail_price || item.cost || 0).toLocaleString()}</Text>
                      <Text style={[styles.cardStock, item.current_stock <= item.min_stock && { color: theme.error }]}>
                        {item.current_stock} {item.unit}
                      </Text>
                    </View>
                  </AnimatedTouchable>
                </StaggerItem>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <AnimatedTouchable style={styles.fab} onPress={() => setCartModalVisible(true)}>
          <View style={styles.fabBadge}><Text style={styles.fabBadgeText}>{cart.reduce((s, c) => s + c.quantity, 0)}</Text></View>
          <ShoppingCart size={24} color={theme.backgroundDeep} />
          <Text style={styles.fabText}>P{cartTotal.toLocaleString()}</Text>
        </AnimatedTouchable>
      )}

      {/* Cart & Checkout Modal */}
      <Modal visible={cartModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {checkoutStep === 1 ? 'Current Order' : checkoutStep === 2 ? 'Checkout' : 'Complete'}
              </Text>
              <AnimatedTouchable onPress={closeCart} style={styles.closeBtn}>
                <X size={20} color={theme.textSecondary} />
              </AnimatedTouchable>
            </View>

            {checkoutStep === 1 && (
              <>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '60%' }}>
                  {cart.map((item, idx) => (
                    <View key={item.id} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>P{(item.retail_price || item.cost).toLocaleString()}</Text>
                      </View>
                      <View style={styles.qtyControls}>
                        <AnimatedTouchable style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                          <Minus size={14} color={theme.textPrimary} />
                        </AnimatedTouchable>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <AnimatedTouchable style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                          <Plus size={14} color={theme.textPrimary} />
                        </AnimatedTouchable>
                        <AnimatedTouchable style={[styles.qtyBtn, { backgroundColor: theme.errorBg, borderColor: theme.errorBg }]} onPress={() => removeFromCart(item.id)}>
                          <Trash2 size={14} color={theme.error} />
                        </AnimatedTouchable>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.cartFooter}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Due</Text>
                    <Text style={styles.summaryTotal}>P{cartTotal.toLocaleString()}</Text>
                  </View>
                  <AnimatedTouchable style={styles.processBtn} onPress={() => setCheckoutStep(2)}>
                    <Text style={styles.processBtnText}>Review & Pay</Text>
                  </AnimatedTouchable>
                </View>
              </>
            )}

            {checkoutStep === 2 && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Select Customer (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <AnimatedTouchable onPress={() => setSelectedCustomer('')} style={[styles.customerPill, !selectedCustomer && styles.customerPillActive]}>
                    <Text style={[styles.customerPillText, !selectedCustomer && styles.customerPillTextActive]}>Walk-in</Text>
                  </AnimatedTouchable>
                  {customers.map(c => (
                    <AnimatedTouchable key={c.id} onPress={() => setSelectedCustomer(c.id)} style={[styles.customerPill, selectedCustomer === c.id && styles.customerPillActive]}>
                      <Text style={[styles.customerPillText, selectedCustomer === c.id && styles.customerPillTextActive]}>{c.name}</Text>
                    </AnimatedTouchable>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {methods.map(m => (
                    <AnimatedTouchable key={m.key} style={[styles.methodBtn, paymentMethod === m.key && { borderColor: m.color, backgroundColor: `${m.color}15` }]} onPress={() => { setPaymentMethod(m.key); setAmountTendered(''); }}>
                      <m.icon size={20} color={paymentMethod === m.key ? m.color : theme.textSecondary} />
                      <Text style={[styles.methodText, paymentMethod === m.key && { color: m.color }]}>{m.key}</Text>
                    </AnimatedTouchable>
                  ))}
                </View>

                {paymentMethod === 'Cash' && (
                  <>
                    <Text style={styles.inputLabel}>Amount Tendered</Text>
                    <TextInput style={styles.amountInput} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.textTertiary} value={amountTendered} onChangeText={setAmountTendered} />
                    {amountTendered ? (
                      <View style={[styles.changeBox, parseFloat(amountTendered) >= cartTotal ? styles.changeBoxSuccess : styles.changeBoxError]}>
                        <Text style={[styles.changeLabel, parseFloat(amountTendered) >= cartTotal ? { color: '#166534' } : { color: '#991b1b' }]}>
                          {parseFloat(amountTendered) >= cartTotal ? 'Change Due' : 'Insufficient'}
                        </Text>
                        <Text style={[styles.changeValue, parseFloat(amountTendered) >= cartTotal ? { color: '#16a34a' } : { color: '#ef4444' }]}>
                          P{Math.max(0, parseFloat(amountTendered) - cartTotal).toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}

                <View style={{ marginTop: 20 }}>
                  <AnimatedTouchable 
                    style={[styles.processBtn, isProcessing && { opacity: 0.6 }]} 
                    onPress={handleCheckout} 
                    disabled={isProcessing || (paymentMethod === 'Cash' && (!amountTendered || parseFloat(amountTendered) < cartTotal))}
                  >
                    <Text style={styles.processBtnText}>{isProcessing ? 'Processing...' : `Pay P${cartTotal.toLocaleString()}`}</Text>
                  </AnimatedTouchable>
                  <AnimatedTouchable onPress={() => setCheckoutStep(1)} style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Back to Cart</Text>
                  </AnimatedTouchable>
                </View>
              </ScrollView>
            )}

            {checkoutStep === 3 && lastOrder && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <SuccessCheckmark size={60} />
                <Text style={{ ...typography.h3, color: theme.textPrimary, marginTop: 20 }}>Transaction Complete</Text>
                <Text style={{ color: theme.textSecondary, marginTop: 8 }}>Invoice {lastOrder.orderId}</Text>
                
                <View style={{ width: '100%', backgroundColor: theme.surfaceLight, padding: 16, borderRadius: borderRadius.md, marginTop: 20, marginBottom: 30 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: theme.textSecondary }}>Total Paid</Text>
                    <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>P{lastOrder.total.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: theme.textSecondary }}>Method</Text>
                    <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>{lastOrder.paymentMethod}</Text>
                  </View>
                  {lastOrder.paymentMethod === 'Cash' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textSecondary }}>Change Given</Text>
                      <Text style={{ fontWeight: 'bold', color: theme.success }}>P{lastOrder.changeGiven.toLocaleString()}</Text>
                    </View>
                  )}
                </View>

                <AnimatedTouchable style={styles.processBtn} onPress={closeCart}>
                  <Text style={styles.processBtnText}>New Sale</Text>
                </AnimatedTouchable>
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h2, color: theme.textPrimary },
  headerSub: { ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surfaceLight, margin: 16, marginBottom: 8,
    borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.border,
  },
  searchInput: { flex: 1, ...typography.body, color: theme.textPrimary },
  filterScroll: { marginBottom: 8, flexGrow: 0, maxHeight: 35 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.round,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderLight,
  },
  filterPillActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  filterText: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '600' },
  filterTextActive: { color: theme.backgroundDeep },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  cardWrapper: { width: '48%' },
  card: {
    backgroundColor: theme.surface, borderRadius: borderRadius.xl, padding: 12,
    borderWidth: 1, borderColor: theme.borderLight, ...shadows.subtle,
  },
  cardIcon: {
    height: 80, backgroundColor: theme.surfaceLight, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10,
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardTitle: { ...typography.bodySmall, fontWeight: '700', color: theme.textPrimary },
  cardCat: { ...typography.bodyXSmall, color: theme.textTertiary, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardPrice: { ...typography.body, fontWeight: '700', color: theme.success },
  cardStock: { ...typography.bodyXSmall, color: theme.textSecondary, fontWeight: '600' },

  fab: {
    position: 'absolute', bottom: 20, right: 20, left: 20,
    backgroundColor: theme.gold, borderRadius: borderRadius.xl,
    padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    ...shadows.cardStrong,
  },
  fabText: { ...typography.h3, color: theme.backgroundDeep },
  fabBadge: {
    position: 'absolute', top: -8, left: -8, backgroundColor: theme.error,
    width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: theme.background, zIndex: 2,
  },
  fabBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
    padding: 24, maxHeight: '90%', ...shadows.cardStrong,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { ...typography.h3, color: theme.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  cartItemInfo: { flex: 1 },
  cartItemName: { ...typography.body, fontWeight: '600', color: theme.textPrimary },
  cartItemPrice: { ...typography.bodySmall, color: theme.textSecondary, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.borderLight, justifyContent: 'center', alignItems: 'center' },
  qtyText: { ...typography.body, fontWeight: '700', width: 20, textAlign: 'center' },
  
  cartFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 2, borderTopColor: theme.borderLight },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryLabel: { ...typography.h3, color: theme.textPrimary },
  summaryTotal: { ...typography.h2, color: theme.success },

  inputLabel: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  customerPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.md, backgroundColor: theme.surfaceLight, marginRight: 8, borderWidth: 1, borderColor: theme.borderLight },
  customerPillActive: { backgroundColor: theme.gold, borderColor: theme.gold },
  customerPillText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '600' },
  customerPillTextActive: { color: theme.backgroundDeep },
  
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  methodBtn: {
    flex: 1, paddingVertical: 14, backgroundColor: theme.surfaceLight,
    borderRadius: borderRadius.md, alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: theme.borderLight,
  },
  methodText: { ...typography.bodySmall, color: theme.textSecondary, fontWeight: '700' },
  
  amountInput: {
    backgroundColor: theme.surfaceLight, color: theme.textPrimary,
    padding: 16, borderRadius: borderRadius.md, ...typography.h2,
    textAlign: 'center', marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  changeBox: { padding: 16, borderRadius: borderRadius.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeBoxSuccess: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 },
  changeBoxError: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 },
  changeLabel: { fontSize: 14, fontWeight: '600' },
  changeValue: { fontSize: 18, fontWeight: '800' },

  processBtn: { backgroundColor: theme.gold, paddingVertical: 16, borderRadius: borderRadius.md, alignItems: 'center', width: '100%', ...shadows.button },
  processBtnText: { ...typography.button, color: theme.backgroundDeep, fontSize: 16 },
});
