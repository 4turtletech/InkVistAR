function getFallbackResponse(message, context = {}) {
  const msg = message.toLowerCase();
  const studio = context.studio || {};
  const has = (words) => words.some(w => new RegExp(`\\b${w}\\b`).test(msg));

  const studioName = typeof studio.name === 'string' && studio.name.trim() ? studio.name.trim() : 'the studio';
  const studioAddress = typeof studio.address === 'string' && studio.address.trim() ? studio.address.trim() : 'their location';
  const studioContact = typeof studio.phone === 'string' && studio.phone.trim() ? studio.phone.trim() : 'their contact number';

  if (has(['hours', 'opening', 'closing', 'open', 'close', 'what time'])) {
    const opening = typeof studio.openingTime === 'string' ? studio.openingTime.trim() : '';
    const closing = typeof studio.closingTime === 'string' ? studio.closingTime.trim() : '';
    if (opening && closing) return `${studioName}'s listed walk-in hours are ${opening} to ${closing}. Please contact ${studioContact} to confirm availability on your preferred day.`;
    return `Please contact ${studioContact} for ${studioName}'s current opening hours.`;
  }
  if (has(['price', 'cost', 'rate', 'charge', 'fee', 'quote', 'estimate', 'pricing', 'how much', 'price range'])) {
    return `To help you plan ahead, here is a general estimate guide from ${studioName}. These are baselines only; final pricing is confirmed during consultation based on design complexity, size, and style.`;
  }
  if (has(['book', 'appointment', 'schedule', 'consultation', 'session', 'reserve'])) {
    return "You can book an appointment by tapping 'Book Consultation' on our site or app, or log in and start a booking from there.";
  }
  if (has(['location', 'address', 'located', 'directions', 'nearby', 'proximity', 'how to get there', 'find you', 'close to', 'near'])) {
    return `We are located at ${studioAddress}. You can also reach us via ${studioContact} for updated directions and hours.`;
  }
  if (has(['style', 'design', 'tattoo ideas', 'portfolio', 'artwork', 'gallery', 'inspiration', 'examples'])) {
    return "We offer a wide range of styles and can work with your vision. Check the Portfolio on our landing page for ideas.";
  }
  if (has(['hello', 'hi', 'hey', 'help', 'support', 'assist', 'inquire', 'greet', 'sup', 'yo', "what's up", 'how are you', 'good morning', 'good afternoon', 'good evening'])) {
    return `Hi there! I'm ${studioName}'s assistant. How can I help you today?`;
  }
  if (has(['aftercare', 'after care', 'heal', 'healing', 'clean', 'peeling', 'moisturize', 'ointment', 'wash', 'tattoo care'])) {
    return "Keep your fresh ink clean and hydrated daily: wash gently, avoid direct sunlight, and avoid scratching.";
  }

  return "I'm not sure about that one. For specific questions, please contact us directly or visit the studio. We'd love to help!";
}

module.exports = { getFallbackResponse };
