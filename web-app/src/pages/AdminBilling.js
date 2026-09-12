import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { Plus, FileText, CreditCard, Printer, X, Trash2, Edit, Search, Filter, ChevronUp, ChevronDown, User } from 'lucide-react';
import { filterName, filterMoney } from '../utils/validation';
import PhilippinePeso from '../components/PhilippinePeso';

import AdminSideNav from '../components/AdminSideNav';
import './AdminUsers.css';
import './AdminSettings.css'; // Reusing form styles
import './AdminBilling.css';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';
import { formatStatus } from '../utils/formatters';

const isEditableInvoiceRecord = (invoice) =>
    (invoice?.record_source === 'invoice' || Boolean(invoice?.invoice_number)) &&
    (invoice?.status || '').toLowerCase() === 'pending' &&
    !invoice?.payment_id && !invoice?.appointment_id;
const canDeleteInvoiceRecord = (invoice) => (invoice?.status || '').toLowerCase() === 'pending' && !invoice?.payment_id && !invoice?.appointment_id;
const MAX_PAYOUT_AMOUNT = 99999999.99;
const PAYOUT_METHODS = ['Bank Transfer', 'Cash', 'GCash'];
const PAYOUT_METHODS_REQUIRING_REFERENCE = ['Bank Transfer', 'GCash'];

const getInvoicePaymentMethod = (invoice) => {
    if (invoice?.payment_method) return invoice.payment_method;
    try {
        const event = typeof invoice?.raw_event === 'string' ? JSON.parse(invoice.raw_event) : invoice?.raw_event;
        if (event?.method) return event.method;
    } catch (_error) {}
    return 'Not recorded';
};

const getInvoiceSourceId = (invoice) => {
    if (invoice?.source_id) return invoice.source_id;
    if (invoice?.invoice_number && Number(invoice.id) >= 100000) return Number(invoice.id) - 100000;
    return invoice?.id;
};

const createRequestKey = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
};

function AdminBilling() {
    const [activeTab, setActiveTab] = useState('invoices');
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [billingLoadWarning, setBillingLoadWarning] = useState('');
    const [billingFeedback, setBillingFeedback] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [timePeriodFilter, setTimePeriodFilter] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [payouts, setPayouts] = useState([]);
    const [payoutBalances, setPayoutBalances] = useState([]);
    const [payoutBalanceLoading, setPayoutBalanceLoading] = useState(true);
    const [payoutBalanceError, setPayoutBalanceError] = useState('');
    const [studioBranch, setStudioBranch] = useState(null);
    const [artists, setArtists] = useState([]);
    const [payoutModal, setPayoutModal] = useState({ mounted: false, visible: false });
    const [newPayout, setNewPayout] = useState({ artistId: '', amount: '', method: 'Bank Transfer', reference: '' });
    const [payoutFeedback, setPayoutFeedback] = useState(null);
    const [payoutSubmitting, setPayoutSubmitting] = useState(false);
    const payoutSubmittingRef = useRef(false);

    // Payout filter states
    const [payoutSearchTerm, setPayoutSearchTerm] = useState('');
    const [showPayoutSuggestions, setShowPayoutSuggestions] = useState(false);
    const payoutSearchRef = useRef(null);
    const [payoutMethodFilter, setPayoutMethodFilter] = useState('all');

    useEffect(() => {
        function handleClickOutsidePayouts(event) {
            if (payoutSearchRef.current && !payoutSearchRef.current.contains(event.target)) {
                setShowPayoutSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutsidePayouts);
        return () => document.removeEventListener("mousedown", handleClickOutsidePayouts);
    }, []);

    // Customer + Appointment selector state for invoice modal
    const [customers, setCustomers] = useState([]);
    const [clientSearch, setClientSearch] = useState('');
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [customerAppointments, setCustomerAppointments] = useState([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);

    const [invoiceModal, setInvoiceModal] = useState({ mounted: false, visible: false, mode: 'create', id: null });
    const [newInvoice, setNewInvoice] = useState({ customerId: null, customerName: '', appointmentId: '', amount: '', type: '', method: 'Cash', status: 'Pending' });
    const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
    const invoiceSubmittingRef = useRef(false);
    const invoiceRequestKeyRef = useRef(createRequestKey());
    const [previewModal, setPreviewModal] = useState({ mounted: false, visible: false, invoice: null });
    
    // Validation states
    const [invoiceErrors, setInvoiceErrors] = useState({});
    const [payoutErrors, setPayoutErrors] = useState({});

    const validateInvoiceField = (field, value) => {
        let errorMsg = '';
        switch(field) {
            case 'customerId':
                if (!value) errorMsg = 'Client selection is required';
                break;
            case 'appointmentId':
                if (!value) errorMsg = 'Appointment selection is required';
                break;
            case 'amount':
                if (!value || parseFloat(value) <= 0) errorMsg = 'Amount must be greater than 0';
                break;
            case 'type':
                if (!value || !value.trim()) errorMsg = 'Service type is required';
                break;
            default: break;
        }
        setInvoiceErrors(prev => ({ ...prev, [field]: errorMsg }));
        return errorMsg === '';
    };

    const handleInvoiceChange = (field, value) => {
        setNewInvoice(prev => ({ ...prev, [field]: value }));
        validateInvoiceField(field, value);
    };

    const validatePayoutField = (field, value, form = newPayout) => {
        let errorMsg = '';
        switch (field) {
            case 'artistId':
                if (!value) errorMsg = 'Artist selection is required';
                break;
            case 'amount': {
                const amount = Number(value);
                const balance = payoutBalances.find(item => String(item.artistId) === String(form.artistId));
                if (!value || !Number.isFinite(amount) || amount <= 0) {
                    errorMsg = 'Amount must be greater than 0';
                } else if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
                    errorMsg = 'Use a valid amount with up to 2 decimal places';
                } else if (amount > MAX_PAYOUT_AMOUNT) {
                    errorMsg = 'Amount cannot exceed ₱99,999,999.99';
                } else if (balance && amount > Number(balance.availableBalance || 0)) {
                    errorMsg = `Amount cannot exceed the available balance of ₱${Number(balance.availableBalance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
                }
                break;
            }
            case 'method':
                if (!PAYOUT_METHODS.includes(value)) errorMsg = 'Select a valid payment method';
                break;
            case 'reference':
                if (PAYOUT_METHODS_REQUIRING_REFERENCE.includes(form.method) && !String(value || '').trim()) {
                    errorMsg = `Reference number is required for ${form.method}`;
                }
                break;
            default: break;
        }
        setPayoutErrors(prev => ({ ...prev, [field]: errorMsg }));
        return errorMsg === '';
    };

    const handlePayoutChange = (field, value) => {
        const cleanValue = field === 'reference' ? String(value).replace(/[<>\r\n]/g, '').substring(0, 100) : value;
        const nextPayout = { ...newPayout, [field]: cleanValue };
        setNewPayout(nextPayout);
        setPayoutFeedback(null);
        validatePayoutField(field, cleanValue, nextPayout);
        if (field === 'method') validatePayoutField('reference', nextPayout.reference, nextPayout);
    };

    const selectedPayoutBalance = payoutBalances.find(balance => String(balance.artistId) === String(newPayout.artistId));

    const openPayoutModal = (balance = null) => {
        setNewPayout({
            artistId: balance ? String(balance.artistId) : '',
            amount: balance && balance.availableBalance > 0 ? Number(balance.availableBalance).toFixed(2) : '',
            method: 'Bank Transfer',
            reference: ''
        });
        setPayoutErrors({});
        setPayoutFeedback(null);
        setPayoutModal({ mounted: true, visible: true });
    };

    const handlePayoutArtistChange = (artistId) => {
        const balance = payoutBalances.find(item => String(item.artistId) === String(artistId));
        const nextPayout = {
            ...newPayout,
            artistId,
            amount: balance && balance.availableBalance > 0 ? Number(balance.availableBalance).toFixed(2) : ''
        };
        setNewPayout(nextPayout);
        setPayoutFeedback(null);
        validatePayoutField('artistId', artistId, nextPayout);
        setPayoutErrors(prev => ({ ...prev, amount: '' }));
    };

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [payoutCurrentPage, setPayoutCurrentPage] = useState(1);
    const [payoutItemsPerPage, setPayoutItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    const [confirmDialog, setConfirmDialog] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: null,
        type: 'danger',
        isAlert: false
    });

    // Fetch appointments for a selected customer
    const fetchCustomerAppointments = async (custId) => {
        if (!custId) { setCustomerAppointments([]); return; }
        setLoadingAppointments(true);
        try {
            const res = await Axios.get(`${API_URL}/api/admin/appointments`);
            if (res.data.success) {
                // Filter to this customer's appointments that have a price and are not fully paid
                const custAppts = res.data.data.filter(a => {
                    if (String(a.customer_id) !== String(custId)) return false;
                    if (!a.price || a.price <= 0) return false;
                    const paid = parseFloat(a.total_paid) || 0;
                    return paid < a.price;
                });
                setCustomerAppointments(custAppts);
            }
        } catch (e) { console.error(e); }
        setLoadingAppointments(false);
    };

    // Modal animation handlers
    const openModal = (mode = 'create', invoice = null) => {
        setBillingFeedback(null);
        if (mode === 'edit' && invoice) {
            if (!isEditableInvoiceRecord(invoice)) {
                showAlert('Read-only Payment', 'Payment transactions are immutable. Edit the generated invoice record instead.', 'warning');
                return;
            }
            setNewInvoice({
                customerId: invoice.customer_id || invoice.client_id || null,
                customerName: invoice.client_name || '',
                appointmentId: invoice.appointment_id || '',
                amount: invoice.amount,
                type: invoice.service_type,
                method: invoice.payment_method || 'Digital',
                status: invoice.status
            });
            setClientSearch(invoice.client_name || '');
            setInvoiceErrors({});
            setInvoiceModal({ mounted: true, visible: false, mode: 'edit', id: getInvoiceSourceId(invoice) });
        } else {
            invoiceRequestKeyRef.current = createRequestKey();
            setNewInvoice({ customerId: null, customerName: '', appointmentId: '', amount: '', type: '', method: 'Cash', status: 'Pending' });
            setClientSearch('');
            setCustomerAppointments([]);
            setInvoiceErrors({});
            setInvoiceModal({ mounted: true, visible: false, mode: 'create', id: null });
        }
        setTimeout(() => setInvoiceModal(prev => ({ ...prev, visible: true })), 10);
    };

    const closeModal = () => {
        setInvoiceModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setInvoiceModal({ mounted: false, visible: false, mode: 'create', id: null });
        }, 400);
    };

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({
            isOpen: true,
            title,
            message,
            type,
            isAlert: true,
            onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        });
    };

    const openPreview = (invoice) => {
        setPreviewModal({ mounted: true, visible: false, invoice });
        setTimeout(() => setPreviewModal({ mounted: true, visible: true, invoice }), 10);
    };

    const closePreview = () => {
        setPreviewModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setPreviewModal({ mounted: false, visible: false, invoice: null });
        }, 400);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchPayoutBalances = async () => {
        setPayoutBalanceLoading(true);
        setPayoutBalanceError('');
        try {
            const response = await Axios.get(`${API_URL}/api/admin/payout-balances`);
            if (!response.data?.success) throw new Error(response.data?.message || 'Payout balance request failed');
            setPayoutBalances(response.data.data || []);
            return true;
        } catch (error) {
            console.error('Error fetching payout balances:', error);
            setPayoutBalances([]);
            setPayoutBalanceError(error.response?.data?.message || 'Unable to load payout balances. Please retry.');
            return false;
        } finally {
            setPayoutBalanceLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setBillingLoadWarning('');
        const failedSections = [];
        const loadSection = async (label, request, applyResponse) => {
            try {
                const response = await request;
                if (!response.data?.success) throw new Error(response.data?.message || `${label} request failed`);
                applyResponse(response.data);
            } catch (error) {
                console.error(`Error fetching ${label}:`, error);
                failedSections.push(label);
            }
        };

        const invoiceRequest = loadSection('invoices', Axios.get(`${API_URL}/api/admin/invoices`), data => {
            setInvoices(data.data || []);
        }).finally(() => setLoading(false));

        await Promise.all([
            invoiceRequest,
            loadSection('artists', Axios.get(`${API_URL}/api/customer/artists`), data => setArtists(data.artists || [])),
            loadSection('customers', Axios.get(`${API_URL}/api/admin/users`), data => {
                setCustomers((data.data || []).filter(u => u.user_type === 'customer' && !u.is_deleted));
            }),
            loadSection('payout history', Axios.get(`${API_URL}/api/admin/payouts`), data => setPayouts(data.data || [])),
            fetchPayoutBalances().then(success => {
                if (!success) failedSections.push('payout balances');
            }),
            loadSection('studio details', Axios.get(`${API_URL}/api/admin/branches`), data => {
                const branches = data.data || [];
                setStudioBranch(branches.find(branch => String(branch.status).toLowerCase() === 'open') || branches[0] || null);
            })
        ]);

        if (failedSections.length) {
            setBillingLoadWarning(`Some billing information could not be refreshed: ${failedSections.join(', ')}. Existing information is still shown where available.`);
        }
    };

    const handleInvoiceSubmit = async (e) => {
        e.preventDefault();
        if (invoiceSubmittingRef.current) return;

        if (invoiceModal.mode === 'edit') {
            const clientValid = newInvoice.customerName && newInvoice.customerName.trim();
            const typeValid = validateInvoiceField('type', newInvoice.type);
            const amountValid = validateInvoiceField('amount', newInvoice.amount);
            if (!clientValid || !typeValid || !amountValid) {
                setBillingFeedback({ type: 'error', message: 'Please fix the highlighted invoice fields.' });
                return;
            }
            try {
                invoiceSubmittingRef.current = true;
                setInvoiceSubmitting(true);
                setBillingFeedback(null);
                const response = await Axios.put(`${API_URL}/api/admin/invoices/${invoiceModal.id}`, {
                    client: newInvoice.customerName,
                    type: newInvoice.type,
                    amount: newInvoice.amount,
                    status: newInvoice.status,
                    payment_method: newInvoice.method
                });
                if (!response.data?.success) throw new Error(response.data?.message || 'Invoice update failed.');
                closeModal();
                await fetchData();
                setBillingFeedback({ type: 'success', message: 'The draft invoice was updated successfully.' });
            } catch (error) {
                setBillingFeedback({ type: 'error', message: error.response?.data?.message || error.message || 'The draft invoice could not be updated.' });
            } finally {
                invoiceSubmittingRef.current = false;
                setInvoiceSubmitting(false);
            }
            return;
        }

        const customerValid = validateInvoiceField('customerId', newInvoice.customerId);
        const appointmentValid = validateInvoiceField('appointmentId', newInvoice.appointmentId);
        const amountValid = validateInvoiceField('amount', newInvoice.amount);
        
        if (!customerValid || !appointmentValid || !amountValid) {
            setBillingFeedback({ type: 'error', message: 'Please fix the highlighted payment fields.' });
            return;
        }

        try {
            invoiceSubmittingRef.current = true;
            setInvoiceSubmitting(true);
            setBillingFeedback(null);
            const res = await Axios.post(`${API_URL}/api/admin/billing/record-payment`, {
                requestKey: invoiceRequestKeyRef.current,
                customerId: newInvoice.customerId,
                appointmentId: newInvoice.appointmentId,
                amount: newInvoice.amount,
                method: newInvoice.method
            });
            if (res.data.success) {
                closeModal();
                await fetchData();
                setBillingFeedback({ type: 'success', message: `${res.data.invoice.invoiceNumber}: payment of ₱${Number(res.data.invoice.amountPaid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} recorded for ${res.data.invoice.clientName}.` });
            }
        } catch (error) {
            console.error("Error recording payment:", error);
            setBillingFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to record payment. No duplicate payment was created.' });
        } finally {
            invoiceSubmittingRef.current = false;
            setInvoiceSubmitting(false);
        }
    };

    const handleDeleteInvoice = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Invoice',
            message: 'Are you sure you want to delete this invoice?',
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    const response = await Axios.delete(`${API_URL}/api/admin/invoices/${id}`);
                    if (!response.data?.success) throw new Error(response.data?.message || 'Invoice delete failed.');
                    await fetchData();
                    showAlert('Invoice Deleted', 'The invoice was deleted successfully.', 'success');
                } catch (error) {
                    console.error("Error deleting invoice:", error);
                    showAlert('Delete Failed', error.response?.data?.message || error.message || 'The invoice could not be deleted.', 'danger');
                }
            }
        });
    };



    const handlePrintAction = () => {
        window.print();
    };

    const handlePayoutSubmit = async (e) => {
        e.preventDefault();
        if (payoutSubmittingRef.current) return;
        if (payoutBalanceLoading || payoutBalanceError) {
            setPayoutFeedback({
                type: 'error',
                message: payoutBalanceLoading ? 'Payout balance is still loading.' : payoutBalanceError
            });
            return;
        }

        const artistValid = validatePayoutField('artistId', newPayout.artistId, newPayout);
        const amountValid = validatePayoutField('amount', newPayout.amount, newPayout);
        const methodValid = validatePayoutField('method', newPayout.method, newPayout);
        const referenceValid = validatePayoutField('reference', newPayout.reference, newPayout);
        if (!artistValid || !amountValid || !methodValid || !referenceValid) {
            setPayoutFeedback({ type: 'error', message: 'Please fix the highlighted fields.' });
            return;
        }

        try {
            payoutSubmittingRef.current = true;
            setPayoutSubmitting(true);
            setPayoutFeedback(null);
            const res = await Axios.post(`${API_URL}/api/admin/payouts`, newPayout);
            if (res.data.success) {
                await fetchData();
                setPayoutFeedback({ type: 'success', message: `Payout recorded. Remaining balance: ₱${Number(res.data.remainingBalance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` });
                setNewPayout(prev => ({ ...prev, amount: '', reference: '' }));
                setPayoutErrors({});
            }
        } catch (error) {
            setPayoutFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to record payout.' });
        } finally {
            payoutSubmittingRef.current = false;
            setPayoutSubmitting(false);
        }
    };



    // Helper for time period filtering
    const matchesTimePeriod = (dateStr) => {
        if (timePeriodFilter === 'all') return true;
        const d = new Date(dateStr);
        const now = new Date();
        if (timePeriodFilter === 'weekly') {
            const dayOfWeek = now.getDay();
            const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - mondayOffset);
            weekStart.setHours(0, 0, 0, 0);
            return d >= weekStart;
        }
        if (timePeriodFilter === 'monthly') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (timePeriodFilter === 'yearly') {
            return d.getFullYear() === now.getFullYear();
        }
        if (timePeriodFilter === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate + 'T00:00:00');
            const end = new Date(customEndDate + 'T23:59:59');
            return d >= start && d <= end;
        }
        return true;
    };

    const filteredInvoices = invoices.filter(inv => {
        const searchLower = searchTerm.toLowerCase();
        
        const paymentMethod = getInvoicePaymentMethod(inv);
        
        const dateObj = new Date(inv.created_at);
        const dateStr1 = dateObj.toLocaleDateString(); 
        const dateStr2 = dateObj.toISOString().split('T')[0]; 
        const dateStr3 = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); 
        const dateStr4 = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); 

        const amountStr = Number(inv.amount).toString();
        const amountFormatted = Number(inv.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const invoiceNumStr = inv.invoice_number || `INV-${String(inv.id).padStart(6, '0')}`;

        const matchesSearch = 
            (inv.client_name || '').toLowerCase().includes(searchLower) || 
            invoiceNumStr.toLowerCase().includes(searchLower) ||
            (inv.service_type || '').toLowerCase().includes(searchLower) ||
            paymentMethod.toLowerCase().includes(searchLower) ||
            amountStr.includes(searchLower) ||
            amountFormatted.includes(searchLower) ||
            dateStr1.toLowerCase().includes(searchLower) ||
            dateStr2.toLowerCase().includes(searchLower) ||
            dateStr3.toLowerCase().includes(searchLower) ||
            dateStr4.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === 'all' || (inv.status || '').toLowerCase() === statusFilter.toLowerCase();
        const isPOS = (inv.service_type || '').toLowerCase().includes('retail') || (inv.service_type || '').toLowerCase().includes('pos');
        const matchesSource = sourceFilter === 'all' || 
            (sourceFilter === 'pos' && isPOS) || 
            (sourceFilter === 'session' && !isPOS);
        const matchesDate = matchesTimePeriod(inv.created_at);
        return matchesSearch && matchesStatus && matchesSource && matchesDate;
    });

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'id') {
            valA = a.id;
            valB = b.id;
        } else if (sortConfig.key === 'client_name') {
            valA = (a.client_name || 'Walk-in Customer').toLowerCase();
            valB = (b.client_name || 'Walk-in Customer').toLowerCase();
        } else if (sortConfig.key === 'service_type') {
            valA = (a.service_type || '').toLowerCase();
            valB = (b.service_type || '').toLowerCase();
        } else if (sortConfig.key === 'created_at') {
            valA = new Date(a.created_at).getTime();
            valB = new Date(b.created_at).getTime();
        } else if (sortConfig.key === 'amount') {
            valA = parseFloat(a.amount) || 0;
            valB = parseFloat(b.amount) || 0;
        } else if (sortConfig.key === 'payment_method') {
            const getMethod = (inv) => getInvoicePaymentMethod(inv).toLowerCase();
            valA = getMethod(a);
            valB = getMethod(b);
        } else if (sortConfig.key === 'status') {
            valA = (a.status || '').toLowerCase();
            valB = (b.status || '').toLowerCase();
        }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination logic
    const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
    const paginatedInvoices = sortedInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, sourceFilter, timePeriodFilter, customStartDate, customEndDate]);

    useEffect(() => {
        setCurrentPage(page => Math.min(page, Math.max(1, totalPages)));
    }, [totalPages]);

    // Compute autocomplete suggestions dynamically from the dataset
    const searchSuggestions = Array.from(new Set([
        ...invoices.map(i => (i.invoice_number || `INV-${String(i.id).padStart(6, '0')}`).trim()),
        ...invoices.map(i => (i.client_name || '').trim()),
        ...invoices.map(i => (i.service_type || '').trim()),
        ...invoices.map(i => getInvoicePaymentMethod(i).trim())
    ])).filter(Boolean);

    const filteredPayouts = payouts.filter(p => {
        const matchesDate = matchesTimePeriod(p.created_at);
        const matchesMethod = payoutMethodFilter === 'all' || p.payout_method === payoutMethodFilter;
        const searchLower = payoutSearchTerm.toLowerCase();
        const artistName = p.artist_name || 'Artist #' + p.artist_id;
        const matchesSearch = artistName.toLowerCase().includes(searchLower) || (p.reference_no || '').toLowerCase().includes(searchLower);
        return matchesDate && matchesMethod && matchesSearch;
    });

    const payoutTotalPages = Math.ceil(filteredPayouts.length / payoutItemsPerPage);
    const paginatedPayouts = filteredPayouts.slice(
        (payoutCurrentPage - 1) * payoutItemsPerPage,
        payoutCurrentPage * payoutItemsPerPage
    );

    useEffect(() => {
        setPayoutCurrentPage(1);
    }, [payoutSearchTerm, payoutMethodFilter, timePeriodFilter, customStartDate, customEndDate]);

    useEffect(() => {
        setPayoutCurrentPage(page => Math.min(page, Math.max(1, payoutTotalPages)));
    }, [payoutTotalPages]);

    const payoutSearchSuggestions = Array.from(new Set([
        ...payouts.map(p => (p.artist_name || 'Artist #' + p.artist_id).trim()),
        ...payouts.map(p => (p.reference_no || '').trim())
    ])).filter(Boolean);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Billing & Payments</h1>
                    </div>
                    <div className="header-actions">
                        <div className="modern-view-toggle" style={{ margin: '0 8px' }}>
                            <button className={`toggle-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')} title="Transaction Logs">
                                <FileText size={16}/> <span>Transaction Logs</span>
                            </button>
                            <button className={`toggle-btn ${activeTab === 'payouts' ? 'active' : ''}`} onClick={() => setActiveTab('payouts')} title="Artist Payouts" style={{ color: activeTab === 'payouts' ? '#be9055' : '#1e293b' }}>
                                <CreditCard size={16}/> <span>Artist Payouts</span>
                            </button>
                        </div>
                        {activeTab === 'invoices' ? (
                            <button className="btn btn-primary admin-st-4796037d" onClick={openModal} >
                                <Plus size={18} className="admin-st-c02c7d9c" /> Record Payment
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={() => openPayoutModal()}>
                                <Plus size={18} className="admin-st-c02c7d9c" /> Record Payout
                            </button>
                        )}
                    </div>
                </header>
                <p className="header-subtitle">Manage studio revenue, invoices, and payment tracking</p>
                {billingLoadWarning && <div className="payout-inline-feedback payout-inline-feedback--error" role="status">{billingLoadWarning}</div>}
                {billingFeedback && !invoiceModal.mounted && <div className={`payout-inline-feedback payout-inline-feedback--${billingFeedback.type}`} role="status">{billingFeedback.message}</div>}

                {activeTab === 'invoices' ? (
                        <div className="page-container-enter" key="invoices">
                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="stat-label">Total Revenue</span>
                                <span className="stat-count">₱{invoices.filter(i => i.status?.toLowerCase() === 'paid').reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending Receivable</span>
                                <span className="stat-count">₱{invoices.filter(i => i.status?.toLowerCase() === 'pending').reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Invoices Issued</span>
                                <span className="stat-count">{invoices.length}</span>
                            </div>
                        </div>

                        <div className="premium-filter-bar premium-filter-bar--stacked">
                            <div className="premium-search-box premium-search-box--full" ref={searchRef} style={{ position: 'relative' }}>
                                <Search size={16} className="premium-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search invoices by client or ID..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    maxLength={100}
                                />
                                {showSuggestions && searchTerm && searchSuggestions.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 && (
                                    <div className="autocomplete-dropdown waterfall-dropdown">
                                        {searchSuggestions
                                            .filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .slice(0, 8)
                                            .map((suggestion, index) => (
                                                <div 
                                                    key={suggestion} 
                                                    className="autocomplete-item waterfall-item"
                                                    style={{ animationDelay: `${index * 0.05}s` }}
                                                    onClick={() => {
                                                        setSearchTerm(suggestion);
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    {suggestion}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            <div className="premium-filters-row">
                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Status:</span>
                                    <select 
                                        value={statusFilter} 
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Source:</span>
                                    <select 
                                        value={sourceFilter} 
                                        onChange={(e) => setSourceFilter(e.target.value)}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Sources</option>
                                        <option value="session">Session Payments</option>
                                        <option value="pos">POS Sales</option>
                                    </select>
                                </div>

                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Period:</span>
                                    <select
                                        value={timePeriodFilter}
                                        onChange={(e) => { setTimePeriodFilter(e.target.value); if (e.target.value !== 'custom') { setCustomStartDate(''); setCustomEndDate(''); } }}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="weekly">This Week</option>
                                        <option value="monthly">This Month</option>
                                        <option value="yearly">This Year</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                    {timePeriodFilter === 'custom' && (
                                        <>
                                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="premium-select-v2" style={{ height: '38px', padding: '0 10px' }} />
                                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>to</span>
                                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="premium-select-v2" style={{ height: '38px', padding: '0 10px' }} />
                                        </>
                                    )}
                                </div>

                            </div>
                        </div>

                        <div className="table-card-container">
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {[
                                                { key: 'id', label: 'Invoice ID' },
                                                { key: 'client_name', label: 'Client' },
                                                { key: 'service_type', label: 'Service Type' },
                                                { key: 'created_at', label: 'Date' },
                                                { key: 'amount', label: 'Amount' },
                                                { key: 'payment_method', label: 'Method' },
                                                { key: 'status', label: 'Status' },
                                            ].map(col => (
                                                <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        {col.label}
                                                        {sortConfig.key === col.key && (
                                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} style={{ color: '#be9055' }} /> : <ChevronDown size={14} style={{ color: '#be9055' }} />
                                                        )}
                                                    </span>
                                                </th>
                                            ))}
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="8" className="no-data admin-st-3927920f">Loading invoices...</td></tr>
                                        ) : paginatedInvoices.map(inv => (
                                            <tr key={`${inv.record_source || 'record'}-${inv.id}`}>
                                                <td data-label="Invoice ID">{inv.invoice_number || `INV-${String(inv.id).padStart(6, '0')}`}</td>
                                                <td data-label="Client">{inv.client_name || 'Walk-in Customer'}</td>
                                                <td data-label="Service">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {inv.service_type}
                                                        {((inv.service_type || '').toLowerCase().includes('retail') || (inv.service_type || '').toLowerCase().includes('pos')) && (
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', whiteSpace: 'nowrap' }}>POS</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td data-label="Date">{new Date(inv.created_at).toLocaleDateString()}</td>
                                                <td data-label="Amount">₱{Number(inv.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td data-label="Method">
                                                    <span style={{fontWeight: '600', color: '#475569'}}>{getInvoicePaymentMethod(inv)}</span>
                                                </td>
                                                <td data-label="Status">
                                                    <span className={`badge status-${(inv.status || '').toLowerCase() === 'paid' ? 'active' : 'pending'}`}>
                                                        {formatStatus(inv.status)}
                                                    </span>
                                                </td>
                                                <td data-label="Actions">
                                                    <div className="admin-st-ce770332">
                                                        <button className="action-btn" title="View / Print Invoice" onClick={() => openPreview(inv)}>
                                                            <FileText size={16}/>
                                                        </button>
                                                        {isEditableInvoiceRecord(inv) && (
                                                            <>
                                                                <button className="action-btn" title="Edit Invoice" onClick={() => openModal('edit', inv)}>
                                                                    <Edit size={16}/>
                                                                </button>
                                                                {canDeleteInvoiceRecord(inv) && (
                                                                    <button className="action-btn delete-btn" title="Delete Draft Invoice" onClick={() => handleDeleteInvoice(getInvoiceSourceId(inv))}>
                                                                        <Trash2 size={16}/>
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {!loading && paginatedInvoices.length === 0 && <tr><td colSpan="8" className="no-data admin-st-3927920f">No invoices match the selected filters.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                onItemsPerPageChange={(newVal) => {
                                    setItemsPerPage(newVal);
                                    setCurrentPage(1);
                                }}
                                totalItems={sortedInvoices.length}
                                unit="invoices"
                            />
                        </div>
                    </div>
                ) : activeTab === 'payouts' ? (
                    <div className="payouts-container page-container-enter" key="payouts">
                        <div className="stats-row admin-st-2579959f">
                            <div className="stat-item glass-card">
                                <span className="stat-label" >Total Paid to Artists</span>
                                <span className="stat-count">₱{payouts.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Available to Pay</span>
                                <span className="stat-count text-warning">
                                    {payoutBalanceLoading ? 'Loading…' : payoutBalanceError ? 'Unavailable' : `₱${payoutBalances.reduce((sum, balance) => sum + Number(balance.availableBalance || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </span>
                            </div>
                        </div>

                        <section className="artist-payout-balances" aria-labelledby="artist-payout-balances-title">
                            <div className="artist-payout-balances__header">
                                <div>
                                    <h2 id="artist-payout-balances-title">Artists to Pay</h2>
                                    <p>Completed and fully paid commissions, minus recorded payouts.</p>
                                </div>
                            </div>
                            <div className="artist-payout-balances__grid">
                                {payoutBalanceLoading ? (
                                    <div className="artist-payout-balances__empty">Loading payout balances…</div>
                                ) : payoutBalanceError ? (
                                    <div className="payout-balance-error" role="alert">
                                        <span>{payoutBalanceError}</span>
                                        <button type="button" className="payout-balance-retry" onClick={fetchPayoutBalances}>Retry</button>
                                    </div>
                                ) : (
                                    <>
                                        {payoutBalances.filter(balance => Number(balance.availableBalance) > 0).map(balance => (
                                            <article className="artist-payout-balance-card" key={balance.artistId}>
                                                <div>
                                                    <strong>{balance.artistName}</strong>
                                                    <span>Available balance</span>
                                                </div>
                                                <div className="artist-payout-balance-card__amount">
                                                    <strong>₱{Number(balance.availableBalance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                    <button type="button" className="btn btn-primary" onClick={() => openPayoutModal(balance)}>Pay</button>
                                                </div>
                                            </article>
                                        ))}
                                        {payoutBalances.filter(balance => Number(balance.availableBalance) > 0).length === 0 && (
                                            <div className="artist-payout-balances__empty">No artist payouts are currently due.</div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>

                        <div className="premium-filter-bar premium-filter-bar--stacked">
                            <div className="premium-search-box premium-search-box--full" ref={payoutSearchRef} style={{ position: 'relative' }}>
                                <Search size={16} className="premium-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search payouts by artist or reference..."
                                    value={payoutSearchTerm}
                                    onChange={(e) => {
                                        setPayoutSearchTerm(e.target.value);
                                        setShowPayoutSuggestions(true);
                                    }}
                                    onFocus={() => setShowPayoutSuggestions(true)}
                                    maxLength={100}
                                />
                                {showPayoutSuggestions && payoutSearchTerm && payoutSearchSuggestions.filter(s => s.toLowerCase().includes(payoutSearchTerm.toLowerCase())).length > 0 && (
                                    <div className="autocomplete-dropdown waterfall-dropdown">
                                        {payoutSearchSuggestions
                                            .filter(s => s.toLowerCase().includes(payoutSearchTerm.toLowerCase()))
                                            .slice(0, 8)
                                            .map((suggestion, index) => (
                                                <div 
                                                    key={suggestion} 
                                                    className="autocomplete-item waterfall-item"
                                                    style={{ animationDelay: `${index * 0.05}s` }}
                                                    onClick={() => {
                                                        setPayoutSearchTerm(suggestion);
                                                        setShowPayoutSuggestions(false);
                                                    }}
                                                >
                                                    {suggestion}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            <div className="premium-filters-row">
                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Method:</span>
                                    <select 
                                        value={payoutMethodFilter} 
                                        onChange={(e) => setPayoutMethodFilter(e.target.value)}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Methods</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="GCash">GCash</option>
                                        <option value="Maya">Maya</option>
                                    </select>
                                </div>
                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Period:</span>
                                    <select
                                        value={timePeriodFilter}
                                        onChange={(e) => { setTimePeriodFilter(e.target.value); if (e.target.value !== 'custom') { setCustomStartDate(''); setCustomEndDate(''); } }}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="weekly">This Week</option>
                                        <option value="monthly">This Month</option>
                                        <option value="yearly">This Year</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                    {timePeriodFilter === 'custom' && (
                                        <>
                                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="premium-select-v2" style={{ height: '38px', padding: '0 10px' }} />
                                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>to</span>
                                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="premium-select-v2" style={{ height: '38px', padding: '0 10px' }} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="table-card-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Staff</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Reference</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPayouts.map(p => (
                                        <tr key={p.id}>
                                            <td data-label="Date">{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td data-label="Staff">{p.artist_name || 'Artist #' + p.artist_id}</td>
                                            <td data-label="Amount">₱{Number(p.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td data-label="Method">{p.payout_method}</td>
                                            <td data-label="Reference">{p.reference_no}</td>
                                            <td data-label="Status"><span className="badge status-active">{formatStatus(p.status)}</span></td>
                                        </tr>
                                    ))}
                                    {filteredPayouts.length === 0 && <tr><td colSpan="6" className="admin-st-3927920f">No payouts found matching your criteria.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={payoutCurrentPage}
                            totalPages={payoutTotalPages}
                            onPageChange={setPayoutCurrentPage}
                            itemsPerPage={payoutItemsPerPage}
                            onItemsPerPageChange={(newVal) => {
                                setPayoutItemsPerPage(newVal);
                                setPayoutCurrentPage(1);
                            }}
                            totalItems={filteredPayouts.length}
                            unit="payouts"
                        />
                    </div>
                ) : null}

            </div>

                {/* Create Invoice Modal */}
                {invoiceModal.mounted && (
                    <div className={`modal-overlay ${invoiceModal.visible ? 'open' : ''}`} onClick={closeModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-15">
                                    <div className="admin-st-c911153f">
                                        <FileText size={20} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0">{invoiceModal.mode === 'edit' ? 'Update Draft Invoice' : 'Record Payment & Issue Invoice'}</h2>
                                        <p className="admin-st-925e4e02">{invoiceModal.mode === 'edit' ? 'Update document details' : 'Record an appointment payment and create its receipt'}</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24}/></button>
                            </div>
                            <form onSubmit={handleInvoiceSubmit}>
                                <div className="modal-body admin-st-7cea880d">

                                    {/* ── Client Selector ── */}
                                    <div className="form-group admin-mb-20">
                                        <label className={`admin-st-19644797 ${invoiceErrors.customerId ? 'text-red-500' : ''}`}>Recipient Entity (Client) <span style={{ color: '#ef4444' }}>*</span></label>
                                        {invoiceModal.mode === 'edit' ? (
                                            <input type="text" className="form-input" value={newInvoice.customerName} readOnly style={{ background: '#f8fafc', color: '#64748b' }} />
                                        ) : newInvoice.customerId ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #be9055, #d4af37)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{(newInvoice.customerName || '?').charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#1e293b', flex: 1 }}>{newInvoice.customerName}</span>
                                                <button type="button" onClick={() => { setNewInvoice(prev => ({ ...prev, customerId: null, customerName: '', appointmentId: '', amount: '', type: '' })); setClientSearch(''); setCustomerAppointments([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${invoiceErrors.customerId ? '#ef4444' : '#e2e8f0'}`, borderRadius: '10px', padding: '0 12px', background: invoiceErrors.customerId ? '#fef2f2' : '#fff' }}>
                                                    <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        style={{ border: 'none', padding: '10px 0', background: 'transparent' }}
                                                        placeholder="Search for a registered client..."
                                                        value={clientSearch}
                                                        onChange={(e) => setClientSearch(filterName(e.target.value).slice(0, 100))}
                                                        onFocus={() => setClientDropdownOpen(true)}
                                                        onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                                                        maxLength={100}
                                                    />
                                                </div>
                                                {clientDropdownOpen && clientSearch && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                                        {customers.filter(c => c.name && c.name.toLowerCase().includes(clientSearch.toLowerCase())).length > 0 ? (
                                                            customers.filter(c => c.name && c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                                                                <div key={c.id} onClick={() => {
                                                                    setNewInvoice(prev => ({ ...prev, customerId: c.id, customerName: c.name, appointmentId: '', amount: '', type: '' }));
                                                                    setClientSearch(c.name);
                                                                    setClientDropdownOpen(false);
                                                                    fetchCustomerAppointments(c.id);
                                                                }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <User size={16} color="#be9055" />
                                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>{c.email}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No matching clients found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {invoiceErrors.customerId && <span className="text-red-500 text-xs mt-1 block">{invoiceErrors.customerId}</span>}
                                    </div>

                                    {/* ── Appointment Selector (shown after client is picked) ── */}
                                    {newInvoice.customerId && invoiceModal.mode !== 'edit' && (
                                        <div className="form-group admin-mb-20">
                                            <label className={`admin-st-19644797 ${invoiceErrors.appointmentId ? 'text-red-500' : ''}`}>Linked Appointment <span style={{ color: '#ef4444' }}>*</span></label>
                                            {loadingAppointments ? (
                                                <div style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Loading appointments...</div>
                                            ) : customerAppointments.length > 0 ? (
                                                <select
                                                    className={`form-input ${invoiceErrors.appointmentId ? 'border-red-500 bg-red-50' : ''}`}
                                                    value={newInvoice.appointmentId}
                                                    onChange={e => {
                                                        const apptId = e.target.value;
                                                        const appt = customerAppointments.find(a => String(a.id) === String(apptId));
                                                        if (appt) {
                                                            const remaining = Math.max(0, appt.price - (parseFloat(appt.total_paid) || 0));
                                                            setNewInvoice(prev => ({
                                                                ...prev,
                                                                appointmentId: apptId,
                                                                type: appt.design_title || appt.service_type || 'Session Payment',
                                                                amount: Number(remaining).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
                                                            }));
                                                        } else {
                                                            setNewInvoice(prev => ({ ...prev, appointmentId: apptId, type: '', amount: '' }));
                                                        }
                                                        validateInvoiceField('appointmentId', apptId);
                                                    }}
                                                >
                                                    <option value="">Select an appointment with balance...</option>
                                                    {customerAppointments.map(a => {
                                                        const bal = Math.max(0, a.price - (parseFloat(a.total_paid) || 0));
                                                        const code = a.booking_code || `APT-${String(a.id).padStart(4, '0')}`;
                                                        const dateStr = a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : 'No date';
                                                        return <option key={a.id} value={a.id}>{code} -- {a.design_title || a.service_type} -- {dateStr} -- Balance: ₱{bal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</option>;
                                                    })}
                                                </select>
                                            ) : (
                                                <div style={{ padding: '14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', color: '#92400e', fontSize: '0.85rem', fontWeight: 500 }}>
                                                    This client has no appointments with an outstanding balance.
                                                </div>
                                            )}
                                            {invoiceErrors.appointmentId && <span className="text-red-500 text-xs mt-1 block">{invoiceErrors.appointmentId}</span>}
                                        </div>
                                    )}

                                    {/* ── Service Type (auto-populated, read-only in create) ── */}
                                    {newInvoice.appointmentId && invoiceModal.mode !== 'edit' && (
                                        <div className="form-group admin-mb-20">
                                            <label className="admin-st-19644797">Service Classification</label>
                                            <input type="text" className="form-input" value={newInvoice.type} readOnly style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }} />
                                        </div>
                                    )}

                                    {invoiceModal.mode === 'edit' && (
                                        <div className="form-group admin-mb-20">
                                            <label className={`admin-st-19644797 ${invoiceErrors.type ? 'text-red-500' : ''}`}>Service Classification <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                className={`form-input ${invoiceErrors.type ? 'border-red-500 bg-red-50' : ''}`}
                                                value={newInvoice.type || ''}
                                                onChange={e => handleInvoiceChange('type', e.target.value.substring(0, 255))}
                                                required
                                            />
                                            {invoiceErrors.type && <span className="text-red-500 text-xs mt-1 block">{invoiceErrors.type}</span>}
                                        </div>
                                    )}

                                    {/* ── Amount + Payment Method ── */}
                                    <div className="admin-st-f9a903f8">
                                        <div className="form-group">
                                            <label className={`admin-st-19644797 ${invoiceErrors.amount ? 'text-red-500' : ''}`}>Settlement Amount (₱) <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                className={`form-input ${invoiceErrors.amount ? 'border-red-500 bg-red-50' : ''}`}
                                                required
                                                value={newInvoice.amount}
                                                onChange={e => handleInvoiceChange('amount', filterMoney(e.target.value))}
                                            />
                                            {invoiceErrors.amount && <span className="text-red-500 text-xs mt-1 block">{invoiceErrors.amount}</span>}
                                            {newInvoice.appointmentId && invoiceModal.mode !== 'edit' && (() => {
                                                const appt = customerAppointments.find(a => String(a.id) === String(newInvoice.appointmentId));
                                                if (appt) {
                                                    const bal = Math.max(0, appt.price - (parseFloat(appt.total_paid) || 0));
                                                    return <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>Remaining balance: ₱{bal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} -- Amount will be capped at balance.</span>;
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <div className="form-group">
                                            <label className="admin-st-19644797">Payment Method</label>
                                            <select className="form-input" value={newInvoice.method} onChange={e => handleInvoiceChange('method', e.target.value)}>
                                                <option value="Cash">Cash</option>
                                                <option value="GCash">GCash</option>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Card">Card</option>
                                                <option value="Digital">Digital</option>
                                                <option value="Manual">Manual</option>
                                            </select>
                                        </div>
                                    </div>

                                    {invoiceModal.mode === 'edit' && (
                                        <div className="form-group admin-mb-20">
                                            <label className="admin-st-19644797">Invoice Status</label>
                                            <select
                                                className="form-input"
                                                value={String(newInvoice.status || 'Pending').toLowerCase()}
                                                onChange={e => handleInvoiceChange('status', e.target.value)}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="admin-st-7460b907">
                                        <p className="admin-st-76a35748">
                                            {invoiceModal.mode === 'edit'
                                                ? '* This updates the invoice document only. It does not create, reverse, or alter the underlying payment transaction.'
                                                : '* This action will record a payment against the selected appointment, generate an invoice, send a notification and receipt email to the client, and update payment status across the system.'}
                                        </p>
                                    </div>
                                    {billingFeedback && invoiceModal.mounted && (
                                        <div className={`payout-inline-feedback payout-inline-feedback--${billingFeedback.type}`} role="status">
                                            {billingFeedback.message}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={invoiceSubmitting}>Cancel</button>
                                    <button type="submit" className="btn btn-primary admin-st-f9a92399" disabled={invoiceSubmitting || (invoiceModal.mode !== 'edit' && (!newInvoice.customerId || !newInvoice.appointmentId || !newInvoice.amount || parseFloat(newInvoice.amount) <= 0))}>
                                        {invoiceSubmitting ? 'Saving…' : invoiceModal.mode === 'edit' ? 'Update Draft' : 'Record Payment & Issue Invoice'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            {/* Invoice Preview Modal */}
            {previewModal.mounted && (
                <div className={`modal-overlay ${previewModal.visible ? 'open' : ''}`} onClick={closePreview}>
                    <div className="modal-content xl admin-st-980ed307" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="admin-flex-center admin-gap-15">
                                <div className="admin-st-c911153f">
                                    <Printer size={20} className="text-bronze" />
                                </div>
                                <div>
                                    <h2 className="admin-m-0">Document Preview</h2>
                                    <p className="admin-st-925e4e02">Invoice ID: {previewModal.invoice.invoice_number || `INV-${String(previewModal.invoice.id).padStart(6, '0')}`}</p>
                                </div>
                            </div>
                            <div className="admin-flex-center admin-gap-10">
                                <button className="btn btn-primary admin-st-a829cff3" onClick={handlePrintAction} >
                                    <Printer size={18} /> Print / Export PDF
                                </button>
                                <button className="close-btn" onClick={closePreview}><X size={24}/></button>
                            </div>
                        </div>

                        <div className="modal-body admin-st-9fb01d54">
                            <div id="printable-invoice" className="invoice-paper admin-st-e2ff4a71">
                                <div className="invoice-header admin-st-7d0a52ef">
                                    <div className="invoice-biz-info">
                                        <h1 className="admin-st-fea585a8">{studioBranch?.name || 'InkVistAR Tattoo Studio'}</h1>
                                        {studioBranch?.address && <p className="admin-st-04bfc9c7">{studioBranch.address}</p>}
                                        {studioBranch?.phone && <p className="admin-st-04bfc9c7">Phone: {studioBranch.phone}</p>}
                                        {!studioBranch?.address && <p className="admin-st-04bfc9c7">inkvictusstudio.com</p>}
                                    </div>
                                    <div className="invoice-meta admin-st-7851dbc0">
                                        <h2 className="admin-st-208c2b41">INVOICE</h2>
                                        <p className="admin-st-04bfc9c7">Ref: {previewModal.invoice.invoice_number || `INV-${String(previewModal.invoice.id).padStart(6, '0')}`}</p>
                                        <p className="admin-st-04bfc9c7">Date: {new Date(previewModal.invoice.created_at).toLocaleDateString()}</p>
                                        <p className="admin-st-04bfc9c7">Method: <strong className="admin-st-ca12521c">{getInvoicePaymentMethod(previewModal.invoice)}</strong></p>
                                    </div>
                                </div>

                                <div className="admin-st-f54ed4c4"></div>

                                <div className="invoice-bill-to admin-st-138f8f43">
                                    <h3 className="admin-st-8a586d88">Bill To</h3>
                                    <p className="admin-st-02a7e1b4">{previewModal.invoice.client_name || 'Walk-in Customer'}</p>
                                    {previewModal.invoice.client_id && <p className="admin-st-a0bdeeca">Client ID: CU-{previewModal.invoice.client_id}</p>}
                                </div>

                                {(() => {
                                    let items = null;
                                    try {
                                        items = typeof previewModal.invoice.items === 'string' ? JSON.parse(previewModal.invoice.items) : previewModal.invoice.items;
                                    } catch(e) {}
                                    
                                    if (items && Array.isArray(items) && items.length > 0) {
                                        return (
                                            <table className="admin-st-0c6b9fcd">
                                                <thead>
                                                    <tr className="admin-st-a7cac501">
                                                        <th className="admin-st-3d480a7a">Item Description</th>
                                                        <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569' }}>Qty</th>
                                                        <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569' }}>Unit Price</th>
                                                        <th className="admin-st-528bd0d7" style={{ textAlign: 'right' }}>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((item, idx) => (
                                                        <tr key={idx} className="admin-st-bd4d1d67">
                                                            <td className="admin-st-34eca13f">{item.name}</td>
                                                            <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</td>
                                                            <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '14px' }}>₱{Number(item.retail_price || item.cost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            <td className="admin-st-cd7ba92a" style={{ textAlign: 'right' }}>₱{(Number(item.retail_price || item.cost) * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    {Number(previewModal.invoice.discount_amount || 0) > 0 && (
                                                        <>
                                                            <tr>
                                                                <td colSpan="3" className="admin-st-6bcbfc83" style={{ textAlign: 'right' }}>Subtotal:</td>
                                                                <td className="admin-st-b88baa1e" style={{ textAlign: 'right' }}>₱{(Number(previewModal.invoice.amount) + Number(previewModal.invoice.discount_amount)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="3" className="admin-st-6bcbfc83" style={{ textAlign: 'right' }}>Discount:</td>
                                                                <td className="admin-st-b88baa1e" style={{ textAlign: 'right' }}>-₱{Number(previewModal.invoice.discount_amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        </>
                                                    )}
                                                    <tr>
                                                        <td colSpan="3" className="admin-st-6bcbfc83" style={{ textAlign: 'right' }}>Total Settlement Amount:</td>
                                                        <td className="admin-st-b88baa1e" style={{ textAlign: 'right' }}>₱{Number(previewModal.invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        );
                                    }
                                    
                                    return (
                                        <table className="admin-st-0c6b9fcd">
                                            <thead>
                                                <tr className="admin-st-a7cac501">
                                                    <th className="admin-st-3d480a7a">Description of Services</th>
                                                    <th className="admin-st-528bd0d7">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="admin-st-bd4d1d67">
                                                    <td className="admin-st-34eca13f">{previewModal.invoice.service_type}</td>
                                                    <td className="admin-st-cd7ba92a">₱{Number(previewModal.invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td className="admin-st-6bcbfc83">Total Settlement Amount:</td>
                                                    <td className="admin-st-b88baa1e">₱{Number(previewModal.invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    );
                                })()}

                                <div className="invoice-footer admin-st-ba43e19b">
                                    <p className="admin-st-4e29dcb8">Thank you for choosing InkVistAR Studio for your creative projects.</p>
                                    <div className="admin-st-4e8808c5">
                                        <div>
                                            <p className="admin-st-b31ebddf">Invoice Status</p>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: (previewModal.invoice.status || '').toLowerCase() === 'paid' ? '#10b981' : '#f59e0b' }}>
                                                {formatStatus(previewModal.invoice.status).toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="signature-line admin-text-center">
                                            <div className="admin-st-a1012144"></div>
                                            <p className="admin-st-857cce3f">Authorized Studio Signature</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closePreview}>Close Preview</button>
                        </div>
                    </div>
                </div>
            )}
                {/* Record Payout Modal */}
                {payoutModal.mounted && (
                    <div className={`modal-overlay ${payoutModal.visible ? 'open' : ''}`} onClick={() => setPayoutModal({ mounted: false, visible: false })}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-15">
                                    <div className="admin-st-c911153f">
                                        <PhilippinePeso size={20} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0">Artist Remittance</h2>
                                        <p className="admin-st-925e4e02">Record internal staff payout</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={() => setPayoutModal({ mounted: false, visible: false })}><X size={24}/></button>
                            </div>
                            <form onSubmit={handlePayoutSubmit}>
                                <div className="modal-body admin-st-7cea880d">
                                    <div className="form-group admin-st-7002f9ca">
                                        <label className={`admin-st-19644797 ${payoutErrors.artistId ? 'text-red-500' : ''}`}>Target Recipient (Artist)</label>
                                        <select className={`form-input ${payoutErrors.artistId ? 'border-red-500 bg-red-50' : ''}`} required value={newPayout.artistId} onChange={e => handlePayoutArtistChange(e.target.value)}>
                                            <option value="">Select Professional Artist...</option>
                                            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                        {payoutErrors.artistId && <span className="text-red-500 text-xs mt-1 block">{payoutErrors.artistId}</span>}
                                        {newPayout.artistId && (
                                            payoutBalanceLoading ? (
                                                <div className="payout-available-balance payout-available-balance--loading">Loading available balance…</div>
                                            ) : payoutBalanceError ? (
                                                <div className="payout-balance-error payout-balance-error--compact" role="alert">
                                                    <span>{payoutBalanceError}</span>
                                                    <button type="button" className="payout-balance-retry" onClick={fetchPayoutBalances}>Retry</button>
                                                </div>
                                            ) : (
                                                <div className="payout-available-balance">
                                                    <span>Available to pay</span>
                                                    <strong>₱{Number(selectedPayoutBalance?.availableBalance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <div className="admin-st-c200c71d">
                                        <div className="form-group">
                                            <label className={`admin-st-19644797 ${payoutErrors.amount ? 'text-red-500' : ''}`}>Remittance Amount (₱)</label>
                                            <input type="number" step="0.01" min="0.01" max={MAX_PAYOUT_AMOUNT} className={`form-input ${payoutErrors.amount ? 'border-red-500 bg-red-50' : ''}`} required value={newPayout.amount} onChange={e => handlePayoutChange('amount', filterMoney(e.target.value))} />
                                            {payoutErrors.amount && <span className="text-red-500 text-xs mt-1 block">{payoutErrors.amount}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label className={`admin-st-19644797 ${payoutErrors.method ? 'text-red-500' : ''}`}>Transfer Protocol</label>
                                            <select className={`form-input ${payoutErrors.method ? 'border-red-500 bg-red-50' : ''}`} value={newPayout.method} onChange={e => handlePayoutChange('method', e.target.value)}>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Cash">Cash Disbursement</option>
                                                <option value="GCash">GCash</option>
                                            </select>
                                            {payoutErrors.method && <span className="text-red-500 text-xs mt-1 block">{payoutErrors.method}</span>}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className={`admin-st-19644797 ${payoutErrors.reference ? 'text-red-500' : ''}`}>
                                            Transaction Reference / Memo {newPayout.method === 'Cash' ? '(Optional)' : '*'}
                                        </label>
                                        <input type="text" className={`form-input ${payoutErrors.reference ? 'border-red-500 bg-red-50' : ''}`} placeholder="Bank ref # or payout notes..." value={newPayout.reference} onChange={e => handlePayoutChange('reference', e.target.value)} maxLength={100} />
                                        {payoutErrors.reference && <span className="text-red-500 text-xs mt-1 block">{payoutErrors.reference}</span>}
                                    </div>
                                    <p className="payout-external-note">Record this payout only after the cash, GCash, or bank transfer has been completed outside the system.</p>
                                    {payoutFeedback && (
                                        <div className={`payout-inline-feedback payout-inline-feedback--${payoutFeedback.type}`} role="status">
                                            {payoutFeedback.message}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setPayoutModal({ mounted: false, visible: false })}>Cancel</button>
                                    <button type="submit" disabled={payoutSubmitting || payoutBalanceLoading || !!payoutBalanceError || !newPayout.artistId || !newPayout.amount || Number(selectedPayoutBalance?.availableBalance || 0) <= 0} className="btn btn-primary admin-st-f9a92399">
                                        {payoutSubmitting ? 'Recording…' : 'Record Payout'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            <ConfirmModal 
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                onConfirm={confirmDialog.onConfirm}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                type={confirmDialog.type}
                isAlert={confirmDialog.isAlert}
            />
        </div>
    );
}

export default AdminBilling;
