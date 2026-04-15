import re

file_path = 'src/pages/AdminAppointments.js'
with open(file_path, 'r') as f:
    text = f.read()

# Replace the 2-column wrapper with 3-column wrapper
text = text.replace('<div className="admin-st-b97f1a79">', '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(3, 1fr)\', gap: \'24px\' }}>')

# Now move the Service Details block
# Find the Service Details block:
service_start_marker = '                                            <div>\n                                                <label className="premium-input-label">Service Details</label>'
service_end_marker = '                                            </div>\n                                        </div>\n\n                                        {/* Right Column: Schedule & Status */}'

# We extract this block, delete it, and insert it above 'Staff Assignment'.
start_idx = text.find(service_start_marker)
end_idx = text.find(service_end_marker) + len('                                            </div>\n')

if start_idx != -1 and end_idx != -1:
    service_block = text[start_idx:end_idx]
    
    # Remove from original position
    text = text[:start_idx] + text[end_idx:]

    # Find the target insertion point (before Staff Assignment)
    # Wait, Staff Assignment is inside `<div className="admin-st-d295c8d6">` which is Col 1.
    # Service Details needs to be appended at the end of Col 1, OR before Col 2.
    # Actually, if we put Service details inside Col 1 (beneath Client Info), we don't have to wrap it in a new Col.
    # Wait! The original structure:
    # <div className="admin-st-d295c8d6">
    #   <div> Client Info </div>
    #   <div> Staff Assignment </div>
    #   <div> Service Details </div>
    # </div>
    #
    # If we want 3 columns:
    # <div style={grid}>
    #   <div className="col-1"> <div> Client Info </div> <div> Service Details </div> </div>
    #   <div className="col-2"> <div> Staff Assignment </div> <div> Date/Time (new apps) </div> </div>
    #   <div className="col-3"> <div> Status </div> </div>
    # </div>

    # So we replace the original Col 1 wrapper structure.
    # Let's do it using raw replacement string!
    # Instead of manual index shifting, use python replace.

staff_start = '                                            <div>\n                                                <label className="premium-input-label">Staff Assignment</label>'

col2_start_injection = '                                        </div>\n\n                                        {/* Column 2: Staff & Date/Time */}\n                                        <div className="admin-st-d295c8d6">\n' + staff_start

text = text.replace(staff_start, col2_start_injection)

# Now, Service Details is already inside the document, but it's AFTER Col 2 (because it comes after Staff Assignment).
# We want to move Service Details up to Col 1, which means before `col2_start_injection`.

with open(file_path, 'w') as f:
    f.write(text)
