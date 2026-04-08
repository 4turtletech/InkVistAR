import os

src_dir = "/Users/cpcelis/celis_gitclone/InkVistAR/web-app/src/pages"
files_to_process = [
    "AdminLogin.js", "AdminChat.js", "AdminReviews.js", "AdminStudio.js",
    "AdminCompletedSessions.js", "AdminClients.js", "AdminSettings.js",
    "AdminPOS.js", "AdminNotifications.js", "AdminUsers.js", "AdminBilling.js",
    "AdminStaff.js", "AdminDashboard.js", "AdminInventory.js", "AdminAppointments.js",
    "AdminAnalytics.js"
]

replacements = {
    "style={{ display: 'flex', alignItems: 'center' }}": 'className="admin-flex-center"',
    "style={{ display: 'flex', alignItems: 'center', gap: '5px' }}": 'className="admin-flex-center admin-gap-5"',
    "style={{ display: 'flex', alignItems: 'center', gap: '8px' }}": 'className="admin-flex-center admin-gap-5"',
    "style={{ display: 'flex', alignItems: 'center', gap: '10px' }}": 'className="admin-flex-center admin-gap-10"',
    "style={{ display: 'flex', alignItems: 'center', gap: '15px' }}": 'className="admin-flex-center admin-gap-15"',
    "style={{ display: 'flex', alignItems: 'center', gap: '20px' }}": 'className="admin-flex-center admin-gap-20"',
    "style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}": 'className="admin-flex-between"',
    "style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}": 'className="admin-flex-between admin-mb-15"',
    "style={{ display: 'flex', gap: '10px' }}": 'className="admin-flex-center admin-gap-10"',
    "style={{ display: 'flex', gap: '20px' }}": 'className="admin-flex-center admin-gap-20"',
    "style={{ marginBottom: '10px' }}": 'className="admin-mb-10"',
    "style={{ marginBottom: '20px' }}": 'className="admin-mb-20"',
    "style={{ marginBottom: '30px' }}": 'className="admin-mb-30"',
    "style={{ margin: 0 }}": 'className="admin-m-0"',
    "style={{ fontWeight: 'bold' }}": 'className="admin-fw-800"',
    "style={{ fontWeight: '600' }}": 'className="admin-fw-600"',
    "style={{ fontWeight: 600 }}": 'className="admin-fw-600"',
    "style={{ fontWeight: 700 }}": 'className="admin-fw-700"',
    "style={{ textAlign: 'center' }}": 'className="admin-text-center"',
    "style={{ width: '100%' }}": 'className="admin-w-full"',
}

for fname in files_to_process:
    path = os.path.join(src_dir, fname)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r') as f:
        content = f.read()

    # ensure AdminStyles.css is imported
    if "import './AdminStyles.css';" not in content:
        import_pos = content.find("import './PortalStyles.css';")
        if import_pos != -1:
            content = content.replace("import './PortalStyles.css';", "import './PortalStyles.css';\nimport './AdminStyles.css';")
        else:
            # fallback: import it before config
            if "import { API_URL } from '../config';" in content:
                content = content.replace("import { API_URL } from '../config';", "import './AdminStyles.css';\nimport { API_URL } from '../config';")


    for old_str, new_str in replacements.items():
        # A simple hack: if there's already `className="foo"` we don't want `className="foo" className="new"`, so
        # we can replace `className="([^"]+)" style={{...}}` with `className="\1 new"`
        # We will use re.sub for these exact permutations!
        import re
        escaped_old_str = re.escape(old_str)
        # Permutation 1: className="..." style={{...}}
        pattern1 = r'className="([^"]+)"\s+' + escaped_old_str
        new_class_only = new_str.replace('className="', '').replace('"', '')
        content = re.sub(pattern1, r'className="\1 ' + new_class_only + '"', content)
        
        # Permutation 2: style={{...}} className="..."
        pattern2 = escaped_old_str + r'\s+className="([^"]+)"'
        content = re.sub(pattern2, r'className="' + new_class_only + r' \1"', content)

        # Permutation 3: just style={{...}}
        content = content.replace(old_str, new_str)

    with open(path, 'w') as f:
        f.write(content)

print("Replacement complete.")
