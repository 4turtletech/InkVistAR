/**
 * Shared CSV Export Utilities for InkVistAR
 * Provides consistent escaping, report headers, and download logic across all portals.
 */

/**
 * Escapes a value for safe CSV inclusion (RFC 4180 compliant).
 * Always wraps in double-quotes for consistency.
 */
export const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str);
    // Escape internal double-quotes by doubling them, then wrap in quotes
    return `"${s.replace(/"/g, '""')}"`;
};

/**
 * Generates a standardized report header block for the top of CSV files.
 * Returns an array of row-arrays that should be prepended before column headers.
 *
 * @param {string} reportTitle - e.g. "Appointments Export", "Inventory Report"
 * @param {Object} [filters] - key/value pairs of active filters to display
 * @returns {string[][]} Array of CSV rows (each row is an array of cell values)
 */
export const generateReportHeader = (reportTitle, filters = {}) => {
    const rows = [
        ['InkVistAR Studio'],
        ['Report', reportTitle],
        ['Generated On', new Date().toLocaleString()],
    ];

    // Append active filter metadata
    const filterEntries = Object.entries(filters).filter(([, v]) => v && v !== 'all');
    if (filterEntries.length > 0) {
        rows.push([]); // spacing row
        rows.push(['Active Filters']);
        filterEntries.forEach(([key, value]) => {
            rows.push([`  ${key}`, String(value)]);
        });
    }

    rows.push([]); // spacing row before data
    return rows;
};

/**
 * Converts an array of row-arrays into a CSV string and triggers a browser download.
 *
 * @param {string[][]} rows - All rows including header + data
 * @param {string} filename - File name without extension (date will be appended)
 */
export const downloadCsv = (rows, filename) => {
    const csvContent = rows
        .map(row => (row || []).map(cell => escapeCsv(cell)).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};
