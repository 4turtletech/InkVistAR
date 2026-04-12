/**
 * Unified tattoo style/specialization list.
 * This is the single source of truth used across:
 * - AdminStaff.js  (artist specialization dropdown + portfolio category)
 * - ArtistProfile.js  (specialization multi-select)
 * - ArtistGallery.js  (portfolio upload category)
 * - Gallery.js  (public style filter)
 * - CustomerGallery.js  (customer style filter)
 *
 * To add a new style, simply append it here and every UI will update.
 */

export const TATTOO_STYLES = [
  'Realism',
  'Traditional',
  'Neo-Traditional',
  'Japanese',
  'Tribal',
  'Fine Line',
  'Watercolor',
  'Blackwork',
  'Geometric',
  'Minimalist',
  'Dotwork',
  'Chicano',
  'Illustrative',
  'Lettering',
  'Ornamental',
  'Surrealism',
  'Trash Polka',
  'New School',
  'Biomechanical',
  'Portrait',
];
