import re

with open('./src/pages/AdminSettings.js', 'r') as f:
    content = f.read()

# 1. Add definitions
state_def = """    const [activeTab, setActiveTab] = useState('studio');
    const [isSaved, setIsSaved] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });
    const [errors, setErrors] = useState({});

    const validateField = (section, field, value) => {
        let errorMsg = "";
        if (section === 'studio') {
            if ((field === 'name' || field === 'email' || field === 'phone' || field === 'address') && !value) {
                errorMsg = "This field is required";
            } else if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errorMsg = "Invalid email format";
            }
        } else if ((section === 'policies' || section === 'care' || section === 'templates') && !value) {
            errorMsg = "Content cannot be empty";
        }
        setErrors(prev => ({ ...prev, [f"{section}_{field}"]: errorMsg }));
        return errorMsg === "";
    };

    const handleChangeWithValidation = (section, field, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
        validateField(section, field, value);
    };"""

content = content.replace(
    "    const [activeTab, setActiveTab] = useState('studio');\n    const [isSaved, setIsSaved] = useState(false);\n    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });\n",
    state_def + "\n"
)

# 2. Update handleSave
save_def = """    const handleSave = async () => {
        let isValid = true;
        isValid = validateField('studio', 'name', settings.studio.name) && isValid;
        isValid = validateField('studio', 'email', settings.studio.email) && isValid;
        isValid = validateField('studio', 'phone', settings.studio.phone) && isValid;
        isValid = validateField('studio', 'address', settings.studio.address) && isValid;
        if (!isValid) {
            setActiveTab('studio');
            showAlert("Validation Error", "Please correct the highlighted errors.", "warning");
            return;
        }

        try {"""

content = content.replace("    const handleSave = async () => {\n        try {", save_def)

# 3. Replace all onChange to handleChangeWithValidation
content = content.replace("handleChange(", "handleChangeWithValidation(")

# 4. Inject errors below inputs. We can do a regex search for value={settings.([a-z]+).([a-zA-Z]+)} -> inject small tag after the input closure.
# This requires replacing the input tags. 
# actually, it's easier to use a quick python regex.

def repl_input(match):
    before = match.group(1)
    section = match.group(2)
    field = match.group(3)
    after = match.group(4)
    tag_name = "input" if "/>" in after else "textarea"
    
    # We replace class="form-input" with class plus error class
    # Actually just add the small under it
    # We find the end of the tag
    parts = after.split(">" if "/>" not in after else "/>", 1)
    
    if tag_name == "input":
        end_str = parts[0] + "/>\n" + f"                                        {{errors.{section}_{field} && <small style={{{{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}}}>{{errors.{section}_{field}}}</small>}}" + parts[1]
    else:
        # text area ends with /> inside react usually? Wait let's check AdminSettings.js
        # AdminSettings uses: className="form-input" rows="3" maxLength={500} />
        if "/>" in after:
             end_str = parts[0] + "/>\n" + f"                                        {{errors.{section}_{field} && <small style={{{{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}}}>{{errors.{section}_{field}}}</small>}}" + parts[1]
        else:
            end_str = parts[0] + ">\n" + f"                                        {{errors.{section}_{field} && <small style={{{{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}}}>{{errors.{section}_{field}}}</small>}}" + parts[1]
        
    return before + section + "." + field + end_str

# This regex is messy, I'll just do manual replacement since there are only about 15
