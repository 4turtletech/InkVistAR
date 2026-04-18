import React from 'react';
import { Calendar, Users, Package, Clock, CheckCircle, DollarSign, Home, Palette } from 'lucide-react';
import PhilippinePeso from './PhilippinePeso';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, Legend } from 'recharts';

/**
 * AnalyticsMetricCards — Shared metric card widgets.
 * Used primarily by AdminAnalytics.
 */
function AnalyticsMetricCards({ analytics, onCardClick, formatDuration, showAll = true }) {
    if (!analytics) return null;

    const CHART_HEIGHT = 140;

    const cards = [
        {
            type: 'revenue',
            icon: <PhilippinePeso size={22} />,
            colorClass: 'green',
            colorHex: '#10b981',
            label: 'Total Revenue',
            value: `₱${Number(analytics.revenue?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'Click to view sources →',
            chart: (analytics.revenue?.breakdown?.length > 0 ? (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', alignItems: 'center' }}>
                    <ResponsiveContainer width="60%" height="100%">
                        <PieChart>
                            <Pie data={analytics.revenue.breakdown} cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2} dataKey="value">
                                {analytics.revenue.breakdown.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][i % 4]} />)}
                            </Pie>
                            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.8, flex: 1 }}>
                        {analytics.revenue.breakdown.map((b, i) => (
                            <div key={i}><span style={{ color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][i % 4], fontWeight: 700 }}>₱{Number(b.value).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span> {b.name}</div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No revenue data</div>
            ))
        },
        {
            type: 'expenses',
            icon: <DollarSign size={22} />,
            colorClass: 'orange',
            colorHex: '#f59e0b',
            label: 'Ops Expenses',
            value: `₱${Number(analytics.expenses?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'View audited transactions →',
            chart: (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={[{v: 0}, {v: Number(analytics.expenses?.total || 0) * 0.2}, {v: Number(analytics.expenses?.total || 0) * 0.4}, {v: Number(analytics.expenses?.total || 0) * 0.65}, {v: Number(analytics.expenses?.total || 0)}]}>
                            <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            type: 'overhead',
            icon: <Home size={22} />,
            colorClass: 'purple',
            colorHex: '#8b5cf6',
            label: 'Overhead / Manual',
            value: `₱${Number(analytics.overhead?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: 'Log manual expenses →',
            chart: (analytics.overhead?.breakdown?.length > 0 ? (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', alignItems: 'center' }}>
                    <ResponsiveContainer width="60%" height="100%">
                        <PieChart>
                            <Pie data={analytics.overhead.breakdown} cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2} dataKey="value">
                                {analytics.overhead.breakdown.map((_, i) => <Cell key={i} fill={['#8b5cf6', '#a855f7', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'][i % 8]} />)}
                            </Pie>
                            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.8, flex: 1 }}>
                        {analytics.overhead.breakdown.slice(0, 4).map((b, i) => (
                            <div key={i}><span style={{ color: ['#8b5cf6', '#a855f7', '#6366f1', '#ec4899'][i % 4], fontWeight: 700 }}>₱{Number(b.value).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span> {b.name}</div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No expenses recorded yet</div>
            ))
        },
        {
            type: 'appointments',
            icon: <Calendar size={22} />,
            colorClass: 'blue',
            colorHex: '#3b82f6',
            label: 'Total Appointments',
            value: analytics.appointments?.total || 0,
            hint: 'Click for status breakdown →',
            chart: (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', alignItems: 'center' }}>
                    <ResponsiveContainer width="60%" height="100%">
                        <PieChart>
                            <Pie data={[
                                { name: 'Completed', value: Number(analytics.appointments?.completed) || 0 },
                                { name: 'Scheduled', value: Number(analytics.appointments?.scheduled) || 0 },
                                { name: 'Cancelled', value: Number(analytics.appointments?.cancelled) || 0 }
                            ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2} dataKey="value">
                                <Cell fill="#10b981" />
                                <Cell fill="#3b82f6" />
                                <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.8, flex: 1 }}>
                        <div><span style={{ color: '#10b981', fontWeight: 700 }}>{analytics.appointments?.completed || 0}</span> completed</div>
                        <div><span style={{ color: '#3b82f6', fontWeight: 700 }}>{analytics.appointments?.scheduled || 0}</span> scheduled</div>
                        <div><span style={{ color: '#ef4444', fontWeight: 700 }}>{analytics.appointments?.cancelled || 0}</span> cancelled</div>
                    </div>
                </div>
            )
        },
        {
            type: 'users',
            icon: <Users size={22} />,
            colorClass: 'blue',
            colorHex: '#3b82f6',
            label: 'Total Users',
            value: analytics.users?.total || 0,
            hint: 'Click for user audit →',
            chart: (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px' }}>
                    <ResponsiveContainer>
                        <BarChart data={[
                            { name: 'Customers', count: Number(analytics.users?.customers) || 0 },
                            { name: 'Artists', count: Number(analytics.users?.artists) || 0 },
                            { name: 'Admins', count: Number(analytics.users?.admins) || 0 }
                        ]} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                                <Cell fill="#3b82f6" />
                                <Cell fill="#a855f7" />
                                <Cell fill="#f59e0b" />
                            </Bar>
                            <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ fontSize: '0.7rem', color: '#171516' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )
        },
        {
            type: 'artists',
            icon: <Palette size={22} />,
            colorClass: 'orange',
            colorHex: '#f97316',
            label: 'Active Artists',
            value: analytics.artists?.length || 0,
            hint: 'Click for performance audit →',
            chart: analytics.artists?.length > 0 ? (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px' }}>
                    <ResponsiveContainer>
                        <BarChart data={analytics.artists.slice(0, 5)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                                {analytics.artists.slice(0, 5).map((_, i) => <Cell key={i} fill={['#f97316', '#a855f7', '#3b82f6', '#10b981', '#ec4899'][i % 5]} />)}
                            </Bar>
                            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : null
        },
        {
            type: 'inventory',
            icon: <Package size={22} />,
            colorClass: 'purple',
            colorHex: '#8b5cf6',
            label: 'Inventory Used',
            value: (analytics.inventory || []).reduce((s, i) => s + Number(i.used || 0), 0).toLocaleString(),
            hint: 'Stock consumed this period →',
            chart: ((analytics.inventory_trend || []).length > 0 ? (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px' }}>
                    <ResponsiveContainer>
                        <AreaChart data={analytics.inventory_trend} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                            <Area type="monotone" dataKey="v" stroke="#a855f7" fill="#f3e8ff" strokeWidth={2} activeDot={{ r: 4 }} />
                            <Tooltip
                                formatter={(value) => [value, 'Items used']}
                                labelFormatter={(label) => `Day ${label}`}
                                contentStyle={{ fontSize: '0.75rem', borderRadius: '8px', color: '#a855f7' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : null)
        },
        {
            type: 'completion',
            icon: <CheckCircle size={22} />,
            colorClass: 'green',
            colorHex: '#10b981',
            label: 'Completion Rate',
            value: `${analytics.appointments?.completionRate || 0}%`,
            hint: 'Successful vs Cancelled →',
            chart: (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
                    <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '6px', height: '14px', overflow: 'hidden' }}>
                        <div style={{ width: `${analytics.appointments?.completionRate || 0}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', height: '100%', borderRadius: '6px', transition: 'width 0.6s ease' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
                        <span><span style={{ color: '#10b981', fontWeight: 700 }}>{analytics.appointments?.completed || 0}</span> completed</span>
                        <span><span style={{ color: '#ef4444', fontWeight: 700 }}>{analytics.appointments?.cancelled || 0}</span> cancelled</span>
                    </div>
                </div>
            )
        },
        {
            type: 'duration',
            icon: <Clock size={22} />,
            colorClass: 'blue',
            colorHex: '#3b82f6',
            label: 'Avg Session Duration',
            value: formatDuration(analytics.appointments?.avgDuration),
            hint: 'Per completed session →',
            chart: (
                <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                        <svg width="90" height="90" viewBox="0 0 90 90">
                            <circle cx="45" cy="45" r="38" fill="none" stroke="#e0e7ff" strokeWidth="6" />
                            <circle cx="45" cy="45" r="38" fill="none" stroke="#3b82f6" strokeWidth="6"
                                strokeDasharray={`${Math.min(((analytics.appointments?.avgDuration || 0) / 14400) * 238.76, 238.76)} 238.76`}
                                strokeLinecap="round" transform="rotate(-90 45 45)" />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                            {formatDuration(analytics.appointments?.avgDuration)}
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const visibleCards = showAll ? cards : cards.filter(c => ['revenue', 'appointments', 'users', 'artists'].includes(c.type));

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
        <>
            <style>
            {`
                .metric-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    padding: 0 2rem;
                    margin-bottom: 2rem;
                }
                .metric-card-box {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(16px);
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                    padding: 1.5rem;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .metric-card-box:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                }
                .metric-col-wide {
                    grid-column: span 2;
                }
                .metric-col-narrow {
                    grid-column: span 1;
                }
                @media (max-width: 1200px) {
                    .metric-cards-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .metric-col-wide, .metric-col-narrow {
                        grid-column: span 1;
                    }
                }
                @media (max-width: 768px) {
                    .metric-cards-grid {
                        grid-template-columns: 1fr;
                        padding: 0 1rem;
                    }
                }
            `}
            </style>
            <div className="metric-cards-grid">
                {visibleCards.map((card, index) => {
                    // Create an asymmetrical layout: 2-1, 1-2, 2-1...
                    // If showAll is false, visibleCards is 4 cards (Revenue, Appointments, Users, Artists).
                    // we can base it on index.
                    let colClass = "metric-col-narrow";
                    if (visibleCards.length > 4) {
                        // All cards mode
                        if (index === 0 || index === 3 || index === 4) {
                            colClass = "metric-col-wide";
                        }
                    } else {
                        // Filtered cards mode (4 cards) - make them 2x2 equal, or 2-1, 1-2
                        if (index === 0 || index === 3) {
                            colClass = "metric-col-wide";
                        }
                    }

                    return (
                        <div
                            key={card.type}
                            onClick={() => onCardClick(card.type)}
                            className={`metric-card-box ${colClass}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ ...getIconColorStyle(card.colorClass), width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {card.icon}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>{card.label}</span>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.value}</h3>
                                </div>
                            </div>
                            
                            {card.chart}

                            <div style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '0.75rem', fontWeight: 600, color: card.colorHex }}>
                                {card.hint}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

export default AnalyticsMetricCards;
