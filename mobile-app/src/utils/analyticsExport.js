const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const currency = (value) => `PHP ${number(value).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const duration = (seconds) => {
  const total = number(seconds);
  if (total <= 0) return 'N/A';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
};

export const analyticsPeriodLabel = (period, customStart = '', customEnd = '') => {
  if (period === 'custom' && customStart && customEnd) return `${customStart} to ${customEnd}`;
  return ({
    all: 'All Time',
    weekly: 'This Week',
    monthly: 'This Month',
    yearly: 'This Year',
  })[period] || 'All Time';
};

export const buildAnalyticsExportReport = (analytics = {}, periodLabel = 'All Time') => {
  const appointments = analytics.appointments || {};
  const revenue = analytics.revenue || {};
  const expenses = analytics.expenses || {};
  const overhead = analytics.overhead || {};
  const users = analytics.users || {};
  const completionRate = number(appointments.completionRate);

  const metrics = [
    { label: 'Total Revenue', value: currency(revenue.total) },
    { label: 'Total Expenses', value: currency(expenses.total) },
    { label: 'Studio Overhead', value: currency(overhead.total) },
    { label: 'Appointments', value: String(number(appointments.total)) },
    { label: 'Completion Rate', value: `${completionRate}%` },
    { label: 'Average Session Duration', value: duration(appointments.avgDuration) },
    { label: 'Total Users', value: String(number(users.total)) },
  ];

  const tables = [
    {
      title: 'Appointment Status',
      headers: ['Status', 'Count'],
      rows: [
        ['Completed', String(number(appointments.completed))],
        ['Scheduled', String(number(appointments.scheduled))],
        ['Cancelled', String(number(appointments.cancelled))],
      ],
    },
    {
      title: 'Revenue Sources',
      headers: ['Source', 'Amount'],
      rows: (revenue.breakdown || []).map(item => [item.name || 'Other', currency(item.value)]),
    },
    {
      title: 'Revenue Trend',
      headers: ['Period', 'Appointments', 'Revenue'],
      rows: (revenue.chart || []).map(item => [
        item.month || item.label || '--',
        String(number(item.appointments)),
        currency(item.value),
      ]),
    },
    {
      title: 'Artist Performance',
      headers: ['Artist', 'Appointments', 'Revenue'],
      rows: (analytics.artists || []).map(item => [
        item.name || 'Unknown Artist',
        String(number(item.appointments)),
        currency(item.revenue),
      ]),
    },
    {
      title: 'Popular Styles',
      headers: ['Style', 'Works'],
      rows: (analytics.styles || []).map(item => [item.name || 'Uncategorized', String(number(item.count))]),
    },
    {
      title: 'Consumed Inventory',
      headers: ['Item', 'Quantity Used', 'Unit'],
      rows: (analytics.inventory || []).map(item => [
        item.name || 'Unknown Item',
        String(number(item.used)),
        item.unit || 'units',
      ]),
    },
    {
      title: 'Operating Expenses',
      headers: ['Category', 'Amount'],
      rows: (expenses.breakdown || []).map(item => [item.name || item.category || 'Other', currency(item.value ?? item.total_amount)]),
    },
    {
      title: 'Studio Overhead',
      headers: ['Category', 'Amount'],
      rows: (overhead.breakdown || []).map(item => [item.category || item.name || 'Other', currency(item.total_amount ?? item.value)]),
    },
  ];

  const csvRows = [
    ...metrics.map(item => ({ section: 'Summary', item: item.label, value: item.value, details: '' })),
    ...tables.flatMap(table => table.rows.map(row => ({
      section: table.title,
      item: row[0] || '',
      value: row[1] || '',
      details: row.slice(2).join(' | '),
    }))),
  ];

  const text = [
    'InkVistAR Analytics Report',
    `Period: ${periodLabel}`,
    `Generated: ${new Date().toLocaleString('en-PH')}`,
    '',
    'SUMMARY',
    ...metrics.map(item => `${item.label}: ${item.value}`),
    ...tables.flatMap(table => [
      '',
      table.title.toUpperCase(),
      ...(table.rows.length > 0
        ? table.rows.map(row => row.filter(Boolean).join(' | '))
        : ['No data available']),
    ]),
  ].join('\n');

  return { metrics, tables, csvRows, text };
};
