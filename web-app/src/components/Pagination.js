import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.css';

/**
 * Modern Pagination Component
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {number} itemsPerPage - Number of items shown per page
 * @param {function} onItemsPerPageChange - Callback when items per page changes
 * @param {number} totalItems - Total count of items
 * @param {string} unit - Label for items (e.g., "users", "items")
 */
function Pagination({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    itemsPerPage, 
    onItemsPerPageChange, 
    totalItems,
    unit = "items"
}) {
    if (totalItems === 0) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end === totalPages) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    className={`pagination-number ${currentPage === i ? 'active' : ''}`}
                    onClick={() => onPageChange(i)}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className="modern-pagination">
            <div className="pagination-info">
                <div className="items-per-page">
                    <span>Show</span>
                    <select 
                        value={itemsPerPage} 
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className="pagination-select"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <span>{unit} per page</span>
                </div>
                <div className="total-count">
                    Total: <strong>{totalItems}</strong> {unit}
                </div>
            </div>

            <div className="pagination-controls">
                <button 
                    className="pagination-btn" 
                    onClick={() => onPageChange(1)} 
                    disabled={currentPage === 1}
                    title="First Page"
                >
                    <ChevronsLeft size={18} />
                </button>
                <button 
                    className="pagination-btn" 
                    onClick={() => onPageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    title="Previous Page"
                >
                    <ChevronLeft size={18} />
                </button>
                
                <div className="pagination-numbers">
                    {renderPageNumbers()}
                </div>

                <button 
                    className="pagination-btn" 
                    onClick={() => onPageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    title="Next Page"
                >
                    <ChevronRight size={18} />
                </button>
                <button 
                    className="pagination-btn" 
                    onClick={() => onPageChange(totalPages)} 
                    disabled={currentPage === totalPages}
                    title="Last Page"
                >
                    <ChevronsRight size={18} />
                </button>
            </div>
        </div>
    );
}

export default Pagination;
