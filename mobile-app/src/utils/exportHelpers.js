/**
 * exportHelpers.js -- Shared CSV/PDF export utilities for mobile
 * Uses expo-file-system, expo-sharing, and expo-print for cross-platform export.
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert, Platform } from 'react-native';

/**
 * Generate a CSV string from an array of objects
 * @param {Array<Object>} data - Array of row objects
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @returns {string} CSV content
 */
export const generateCSV = (data, columns) => {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      // Escape double quotes and wrap in quotes
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
};

/**
 * Export data as a CSV file and open the native share sheet
 * @param {string} csvContent - Raw CSV string
 * @param {string} filename - Filename without extension
 */
export const exportCSV = async (csvContent, filename) => {
  try {
    const fileUri = `${FileSystem.cacheDirectory}${filename}_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${filename}`,
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Sharing Unavailable', 'File sharing is not available on this device.');
    }
  } catch (error) {
    console.error('CSV export error:', error);
    Alert.alert('Export Failed', 'Could not export the CSV file. Please try again.');
  }
};

/**
 * Build a styled HTML report string for PDF printing
 * @param {Object} options
 * @param {string} options.title - Report title
 * @param {string} options.subtitle - Report subtitle/period
 * @param {Array<{label: string, value: string}>} options.metrics - Summary KPI cards
 * @param {Array<{title: string, headers: string[], rows: string[][]}>} options.tables - Data tables
 * @returns {string} Full HTML document
 */
export const buildReportHTML = ({ title, subtitle, metrics = [], tables = [] }) => {
  const metricCards = metrics.map(m => `
    <div class="metric">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
    </div>
  `).join('');

  const tableSections = tables.map(t => `
    <div class="section">
      <h3>${t.title}</h3>
      <table>
        <thead>
          <tr>${t.headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${t.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          ${t.rows.length === 0 ? `<tr><td colspan="${t.headers.length}" class="empty">No data available</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b; background: #fff; padding: 32px; font-size: 12px;
        }
        .header {
          text-align: center; padding-bottom: 24px;
          border-bottom: 2px solid #be9055; margin-bottom: 24px;
        }
        .header h1 { font-size: 22px; color: #0f172a; margin-bottom: 4px; }
        .header h2 { font-size: 13px; color: #64748b; font-weight: 400; }
        .header .logo { font-size: 10px; color: #be9055; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
        .metrics {
          display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px;
        }
        .metric {
          flex: 1 1 22%; background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 8px; padding: 14px; min-width: 120px;
        }
        .metric-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
        .metric-value { font-size: 18px; font-weight: 800; color: #0f172a; }
        .section { margin-bottom: 24px; }
        .section h3 { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; border-left: 3px solid #be9055; padding-left: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        tr:last-child td { border-bottom: none; }
        .empty { text-align: center; color: #94a3b8; font-style: italic; padding: 24px; }
        .footer {
          text-align: center; margin-top: 32px; padding-top: 16px;
          border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px;
        }
        @media print {
          body { padding: 16px; }
          .metric { break-inside: avoid; }
          table { break-inside: auto; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">InkVistAR Studio</div>
        <h1>${title}</h1>
        <h2>${subtitle}</h2>
      </div>
      ${metricCards ? `<div class="metrics">${metricCards}</div>` : ''}
      ${tableSections}
      <div class="footer">
        <p>Confidential -- InkVistAR Studio</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print or export a PDF from an HTML string
 * @param {string} html - Full HTML document string
 */
export const printOrSharePDF = async (html) => {
  try {
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Failed', 'Could not generate the printable report.');
  }
};

/**
 * Generate a PDF file and open the share sheet (instead of printing)
 * @param {string} html - Full HTML document string
 * @param {string} filename - PDF filename without extension
 */
export const sharePDF = async (html, filename) => {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    // Move to a readable location with a proper name
    const newUri = `${FileSystem.cacheDirectory}${filename}_${Date.now()}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: newUri });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Export ${filename}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Sharing Unavailable', 'File sharing is not available on this device.');
    }
  } catch (error) {
    console.error('PDF share error:', error);
    Alert.alert('Export Failed', 'Could not generate the PDF file.');
  }
};
