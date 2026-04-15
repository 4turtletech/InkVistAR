import re

def update_file():
    with open('src/pages/AdminAppointments.js', 'r') as f:
        content = f.read()

    # 1. Replace the 2-column details tab layout with 3-column layout
    # The starting marker:
    start_marker = '{/* Left Column: People & Service */}'
    # We replace `<div className="admin-st-b97f1a79">` with the new grid.
    content = content.replace('<div className="admin-st-b97f1a79">', '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(3, 1fr)\', gap: \'24px\' }}>')

    # Now we need to split the inner content.
    # Currently it is:
    # <div className="admin-st-d295c8d6"> (Client, Staff, Service)
    # </div>
    # {/* Right Column: Schedule & Status */}
    # <div className="admin-st-d295c8d6"> (Schedule, Status)
    # </div>

    # To be extremely precise, we can just replace the specific headers and wrappers.
    # Replace "Staff Assignment" so it starts a new column.
    staff_assignment_start = '<div>\n                                                <label className="premium-input-label">Staff Assignment</label>'
    new_staff_assignment = '</div>\n\n                                        {/* Column 2: Staff & Date/Time */}\n                                        <div className="admin-st-d295c8d6">\n                                            <div>\n                                                <label className="premium-input-label">Staff Assignment</label>'
    content = content.replace(staff_assignment_start, new_staff_assignment)

    # Now, "Service Details" should go back to column 1! Wait, if I close Column 1 before Staff Assignment, then Service Details will be in Column 2.
    # So Column 1: Client Info. Column 2: Staff Assignment + Service Details. Column 3: Status + Date/Time (if new)
    # The user asked to just rearrange it to 3 columns.
    # Let's just do:
    # Col 1: Client Info + Service Details
    # Col 2: Staff Assignment + Schedule (if new)
    # Col 3: Status

    pass # Will use sed/awk or direct python if needed.

if __name__ == '__main__':
    update_file()
