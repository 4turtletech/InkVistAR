export const tattooBodyParts = ['Face', 'Neck', 'Chest', 'Back', 'Left Shoulder', 'Right Shoulder', 'Left Upper Arm', 'Right Upper Arm', 'Left Forearm', 'Right Forearm', 'Left Wrist', 'Right Wrist', 'Left Hand', 'Right Hand', 'Left Ribs', 'Right Ribs', 'Left Hip', 'Right Hip', 'Left Thigh', 'Right Thigh', 'Left Calf', 'Right Calf', 'Left Ankle', 'Right Ankle', 'Other'];
export const piercingBodyParts = ['Left Ear Lobe', 'Right Ear Lobe', 'Left Helix', 'Right Helix', 'Left Tragus', 'Right Tragus', 'Left Conch', 'Right Conch', 'Left Industrial', 'Right Industrial', 'Left Nostril', 'Right Nostril', 'Septum', 'Left Eyebrow', 'Right Eyebrow', 'Lip/Oral', 'Navel', 'Left Nipple', 'Right Nipple', 'Other'];

export const calendarCells = (year, month) => [
  ...Array(new Date(year, month, 1).getDay()).fill(null),
  ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1),
];
export const shiftCalendarMonth = (date, offset) => new Date(date.getFullYear(), date.getMonth() + offset, 1);

export const changeBookingServices = (form, services) => ({
  ...form, selectedServices: services, placement: [], tattooPlacement: [], piercingPlacement: [], placementNotes: '',
});

export const toggleBookingPlacement = (form, field, part) => {
  const choices = field === 'tattooPlacement' ? tattooBodyParts : piercingBodyParts;
  if (!choices.includes(part)) return form;
  const previous = form[field] || [];
  const next = { ...form, [field]: previous.includes(part) ? previous.filter(item => item !== part) : [...previous, part] };
  next.placement = [...new Set([...(next.tattooPlacement || []), ...(next.piercingPlacement || [])])];
  if (!next.placement.includes('Other')) next.placementNotes = '';
  return next;
};

export const bookingPlacementErrors = (form) => {
  const errors = {};
  const tattoo = form.selectedServices.some(service => ['Tattoo Session', 'Consultation'].includes(service));
  const piercing = form.selectedServices.includes('Piercing');
  const validGroup = (selected = [], allowed) => selected.length > 0 && selected.every(part => allowed.includes(part));
  if (tattoo && !validGroup(form.tattooPlacement, tattooBodyParts)) errors.tattooPlacement = 'Select at least one tattoo placement.';
  if (piercing && !validGroup(form.piercingPlacement, piercingBodyParts)) errors.piercingPlacement = 'Select at least one piercing placement.';
  const hasOther = (tattoo && form.tattooPlacement?.includes('Other')) || (piercing && form.piercingPlacement?.includes('Other'));
  if (hasOther) {
    const notes = form.placementNotes || '';
    if (!notes.trim()) errors.placementNotes = 'Specify location notes.';
    else if (notes.trim().length < 5) errors.placementNotes = 'Location notes must be at least 5 characters.';
    else if (notes.length > 150) errors.placementNotes = 'Location notes must not exceed 150 characters.';
  }
  return errors;
};
