import React from 'react';
import { Calendar, Users, Package, Clock, ChevronRight, CheckCircle, DollarSign, Home, Palette } from 'lucide-react';
import PhilippinePeso from './PhilippinePeso';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, AreaChart, Area } from 'recharts';

/**
 * AnalyticsMetricCards — Shared metric card widgets.
 * Used primarily by AdminAnalytics.
 */
function AnalyticsMetricCards({ analytics, onCardClick, formatDuration, showAll = true }) {
    if (!analytics) return null;

    const cards = [
        {
            type: 'revenue',
            icon: <PhilippinePeso size={24} />,
            colorClass: 'green',
            colorHex: '#10b981',
            label: 'Total Revenue',
            value: `₱${Number(analytics.revenue?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'Click to view sources →',
            chart: analytics.revenue?.chart?.length > 0 ? (
                <div style={{ width: '100%', height: 60, marginTop: '12px' }}>
                    <ResponsiveContainer>
                        <BarChart data={analytics.revenue.chart}>
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : null
        },
        {
            type: 'expenses',
            icon: <DollarSign size={24} />,
            colorClass: 'orange',
            colorHex: '#f59e0b',
            label: 'Ops Expenses',
            value: `₱${Number(analytics.expenses?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'View audited transactions →',
            chart: (
                <div style={{ width: '100%', height: 60, marginTop: '12px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={[{v: 0}, {v: Number(analytics.expenses?.total || 0) * 0.4}, {v: Number(analytics.expenses?.total || 0)}]}>
                            <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            type: 'overhead',
            icon: <Home size={24} />,
            colorClass: 'purple',
            colorHex: '#8b5cf6',
            label: 'Overhead / Manual',
            value: `₱${Number(analytics.overhead?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'Log manual expenses →',
            chart: (
                <div style={{ width: '100%', height: 60, marginTop: '12px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={[{v: 0}, {v: Number(analytics.overhead?.total || 0) * 0.7}, {v: Number(analytics.overhead?.total || 0)}]}>
                            <Area type="monotone" dataKey="v" stroke="#8b5cf6" fill="#f3e8ff" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            type: 'appointments',
            icon: <Calendar size={24} />,
            colorClass: 'blue',
            colorHex: '#3b82f6',
            label: 'Total Appointments',
            value: analytics.appointments?.total || 0,
            hint: 'Click for status breakdown →',
            chart: (
                <div style={{ width: '100%', height: 60, marginTop: '12px', display: 'flex', alignItems: 'center' }}>
                    <ResponsiveContainer width="50%" height="100%">
                        <PieChart>
                            <Pie data={[
                                { name: 'Completed', value: Number(analytics.appointments?.completed) || 0 },
                                { name: 'Scheduled', value: Number(analytics.appointments?.scheduled) || 0 },
                                { name: 'Cancelled', value: Number(analytics.appointments?.cancelled) || 0 }
                            ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={12} outerRadius={26} paddingAngle={2} dataKey="value">
                                <Cell fill="#10b981" />
                                <Cell fill="#3b82f6" />
                                <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.4, flex: 1 }}>
                        <div style={{ color: '#10b981', fontWeight: 600 }}>{analytics.appointments?.completed || 0} done</div>
                        <div style={{ color: '#3b82f6', fontWeight: 600 }}>{analytics.appointments?.scheduled || 0} sched</div>
                        <div style={{ color: '#ef4444', fontWeight: 600 }}>{analytics.appointments?.cancelled || 0} canc</div>
                    </div>
                </div>
            )
        },
        {
            type: 'users',
            icon: <Users size={24} />,
            colorClass: 'blue',
            colorHex: '#3b82f6',
            label: 'Total Users',
            value: analytics.users?.total || 0,
            hint: 'Click for user audit →',
            chart: (
                <div style={{ width: '100%', height: 60, marginTop: '12px' }}>
                    <ResponsiveContainer>
                        <BarChart data={[
                            { name: 'Customers', count: Number(analytics.users?.customers) || 0 },
                            { name: 'Artists', count: Number(analytics.users?.artists) || 0 }
                        ]} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                                <Cell fill="#3b82f6" />
                                <Cell fill="#a855f7" />
                            </Bar>
                            <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            type: 'artists',
            icon: <Palette size={24} />,
            colorClass: 'orange',
            colorHex: '#f97316',
            label: 'Active Artists',
            value: analytics.artists?.length || 0,
            hint: 'Click for performance audit →',
            chart: analytics.artists?.length > 0 ? (
                <div style={{ width: '100%', height: 60, marginTop: '12px' }}>
                    <ResponsiveContainer>
                        <BarChart data={analytics.artists.slice(0, 4)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                                {analytics.artists.slice(0, 4).map((_, i) => <Cell key={i} fill={['#f97316', '#a855f7', '#3b82f6', '#10b981'][i % 4]} />)}
                            </Bar>
                            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : null
        },
        {
            type: 'inventory',
            icon: <Package size={24} />,
            colorClass: 'purple',
            colorHex: '#8b5cf6',
            label: 'Inventory Used',
            value: (analytics.inventory || []).reduce((s, i) => s + Number(i.used || 0), 0).toLocaleString(),
            hint: 'Stock consumed this period →',
            chart: (
                <div style={{ width: '100%', height: 60, marginTop: '12px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={[{v: 0}, {v: 10}, {v: 25}, {v: (analytics.inventory || []).reduce((s, i) => s + Number(i.used || 0), 0)}]}>
                            <Area type="step" dataKey="v" stroke="#a855f7" fill="#f3e8ff" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            type: 'completion',
            icon: <CheckCircle size={24} />,
            colorClass: 'green',
            colorHex: '#10b981',
            label: 'Completion Rate',
            value: `${analytics.appointments?.completionRate || 0}%`,
            hint: 'Successful vs Cancelled →',
            chart: (
                <div style={{ width: '100%', height: 60, marginTop: '12px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${analytics.appointments?.completionRate || 0}%`, background: '#10b981', height: '100%' }}></div>
                    </div>
                </div>
            )
        },
        {
            type: 'duration',
            icon: <Clock size={24} />,
            colorClass: 'blue',
            colorHex: '#3b82f6',
            label: 'Avg Session Duration',
            value: formatDuration(analytics.appointments?.avgDuration),
            hint: 'Per completed session →',
            chart: (
                <div style={{ width: '100%', height: 60, marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '4px solid #e0e7ff', borderTopColor: '#3b82f6', transform: 'rotate(45deg)' }}></div>
                </div>
            )
        }
    ];

    const visibleCards = showAll ? cards : cards.filter(c => ['revenue', 'appointments', 'users', 'artists'].includes(c.type));

    // Fallback for stat-icon-wrapper classes if not present globally
    const getIconColorStyle = (colorClass) => {
        switch (colorClass) {
            case 'blue': return { background: '#eff6ff', color: '#3b82f6' };
            case 'purple': return { background: '#f5f3ff', color: '#8b5cf6' };
            case 'green': return { background: '#f0fdf4', color: '#22c55e' };
            case 'orange': return { background: '#fff7ed', color: '#f97316' };
            default: return { background: '#f8fafc', color: '#64748b' };
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
        }}>
            {visibleCards.map(card => (
                <div
                    key={card.type}
                    onClick={() => onCardClick(card.type)}
                    style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ ...getIconColorStyle(card.colorClass), width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {card.icon}
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>{card.label}</span>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>{card.value}</h3>
                        </div>
                    </div>
                    
                    {card.chart}

                    <div style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '0.75rem', fontWeight: 600, color: card.colorHex }}>
                        {card.hint}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AnalyticsMetricCards;
