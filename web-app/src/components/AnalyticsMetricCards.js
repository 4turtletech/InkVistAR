import React from 'react';
import { Calendar, Users, Package, Clock, ChevronRight, CheckCircle, DollarSign, Home } from 'lucide-react';
import PhilippinePeso from './PhilippinePeso';

const DARK_BRAND = '#e2e8f0';

/**
 * AnalyticsMetricCards — Shared metric card widgets.
 * Used by both AdminAnalytics and AdminDashboard.
 *
 * Props:
 *  - analytics: full analytics data object
 *  - onCardClick: (type: string) => void
 *  - formatDuration: (seconds) => string
 *  - showAll: boolean (true = all 9 cards, false = condensed top 4 for dashboard)
 *  - variant: 'dark' | 'light' — controls icon and text colors
 */
function AnalyticsMetricCards({ analytics, onCardClick, formatDuration, showAll = true, variant = 'dark' }) {
    if (!analytics) return null;

    const iconColor = variant === 'dark' ? DARK_BRAND : '#1e293b';

    const cards = [
        {
            type: 'revenue',
            icon: <PhilippinePeso className="metric-icon" size={32} color={iconColor} />,
            label: 'Total Revenue',
            value: `₱${Number(analytics.revenue?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'Click to view sources',
            className: 'primary-metric'
        },
        {
            type: 'expenses',
            icon: <DollarSign className="metric-icon" size={32} color={iconColor} />,
            label: 'Ops Expenses',
            value: `₱${Number(analytics.expenses?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'View audited transactions'
        },
        {
            type: 'overhead',
            icon: <Home className="metric-icon" size={32} color={iconColor} />,
            label: 'Overhead / Manual',
            value: `₱${Number(analytics.overhead?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'Log manual expenses'
        },
        {
            type: 'appointments',
            icon: <Calendar className="metric-icon" size={32} color={iconColor} />,
            label: 'Total Appointments',
            value: analytics.appointments?.total || 0,
            subInfo: <span style={{ color: '#10b981', fontWeight: 600 }}>{analytics.appointments?.completed || 0} completed</span>
        },
        {
            type: 'users',
            icon: <Users className="metric-icon" size={32} color={iconColor} />,
            label: 'Total Users',
            value: analytics.users?.total || 0,
            subInfo: <span>{analytics.users?.artists || 0} artists · {analytics.users?.customers || 0} customers</span>
        },
        {
            type: 'artists',
            icon: <Users className="metric-icon" size={32} color={iconColor} />,
            label: 'Active Artists',
            value: analytics.artists?.length || 0,
            subInfo: 'Producing Revenue'
        },
        {
            type: 'inventory',
            icon: <Package className="metric-icon" size={32} color={iconColor} />,
            label: 'Inventory Used',
            value: (analytics.inventory || []).reduce((s, i) => s + Number(i.used || 0), 0).toLocaleString(),
            subInfo: 'Items consumed'
        },
        {
            type: 'completion',
            icon: <CheckCircle className="metric-icon" size={32} color={iconColor} />,
            label: 'Completion Rate',
            value: `${analytics.appointments?.completionRate || 0}%`,
            subInfo: <span style={{ color: '#ef4444' }}>{analytics.appointments?.cancelled || 0} cancelled</span>
        },
        {
            type: 'duration',
            icon: <Clock className="metric-icon" size={32} color={iconColor} />,
            label: 'Avg Session Duration',
            value: formatDuration(analytics.appointments?.avgDuration),
            subInfo: 'Per completed session'
        }
    ];

    const visibleCards = showAll ? cards : cards.filter(c => ['revenue', 'appointments', 'users', 'artists'].includes(c.type));

    return (
        <div className="metrics-section">
            {visibleCards.map(card => (
                <div
                    key={card.type}
                    className={`metric-card glass-card metric-clickable ${card.className || ''}`}
                    onClick={() => onCardClick(card.type)}
                >
                    {card.icon}
                    <div className="metric-content">
                        <p className="metric-label">{card.label}</p>
                        <p className="metric-value">{card.value}</p>
                        {card.hint ? (
                            <p className="metric-info metric-clickable-hint"><ChevronRight size={12} /> {card.hint}</p>
                        ) : card.subInfo ? (
                            <p className="metric-info">{card.subInfo}</p>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AnalyticsMetricCards;
