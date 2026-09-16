/**
 * Generates clearly labelled SYNTHETIC/TEST responses in COPIES of Google Forms.
 *
 * This script has two flows:
 *  1) Random synthetic generation (existing behavior) to hit 100-110 total.
 *  2) CSV reference extension, which reuses your CSV rows as templates and only
 *     regenerates identity fields (name + email) with Filipino-looking values.
 *
 * For the CSV flow, upload the CSV to Drive and set csvSource to its Drive name
 * or file ID.
 */

const ORIGINAL_FORM_IDS = new Set([
  '1Bg1OV23iHfrNMEmpyxl2melnjRIMdfN1J7os4TWIsTA',
]);

const FORM_CONFIGS = [
  {
    originalFormId: '1Bg1OV23iHfrNMEmpyxl2melnjRIMdfN1J7os4TWIsTA',
    copyFormId: '1tgF37uLOlaY9lTSn0cX0Y_EjxDoT4oOjQwg4J4E_Csw',
    targetCombinedTotal: 100,
  },
];

// Fill one form-copy from a CSV export of that same survey.
// Set csvSource to either:
// - a Google Drive file ID (string of chars), or
// - an exact Drive file name (string).
const CSV_AUTOSUBMIT_CONFIGS = [
  {
    copyFormId: '1tgF37uLOlaY9lTSn0cX0Y_EjxDoT4oOjQwg4J4E_Csw',
    csvSource: 'InkVistAR System Evaluation Questionnaire Responses - Form Responses 1.csv',
    targetCombinedTotal: 100,
    // Optional: set to choose where extended rows are saved.
    //csvExtendedSource: 'InkVistAR System Evaluation Questionnaire Responses - Extended.csv',
  },
];

const REQUIRED_COPY_TITLE_ENDING = '';
const DRY_RUN = true; // Change to false only after inspectConfiguredForms() looks right.
const MAX_ADDITIONS_PER_FORM_PER_RUN = 110;
const MAX_AUTOSUBMIT_ROWS_PER_RUN = 110;
const CSV_BATCH_SIZE = 25;

/** Run this first. It prints each copied form's questions, types, and choices. */
function inspectConfiguredForms() {
  FORM_CONFIGS.forEach((config) => {
    validateConfig_(config);
    const original = FormApp.openById(config.originalFormId);
    const copy = FormApp.openById(config.copyFormId);
    assertOriginal_(original, config);
    assertSyntheticCopy_(copy);

    console.log('\nORIGINAL: %s\nReal responses: %s\nCOPY: %s\nCopy responses: %s\nCombined: %s/%s',
      original.getTitle(),
      original.getResponses().length,
      copy.getTitle(),
      copy.getResponses().length,
      original.getResponses().length + copy.getResponses().length,
      config.targetCombinedTotal);

    copy.getItems().forEach((item, index) => {
      console.log('%s. [%s] %s%s',
        index + 1,
        String(item.getType()),
        item.getTitle() || '(layout item)',
        choicesForLog_(item));
    });
  });
}

/** Random synthetic rows to hit targetCombinedTotal. Run this after inspection and DRY_RUN=false. */
function generateAllSyntheticResponses() {
  FORM_CONFIGS.forEach(generateForOneForm_);
}

/**
 * CSV extension flow.
 * Reuses each row in the CSV as a template and regenerates names/emails
 * with Filipino-style profiles using gmail.com and yahoo.com.
 * It writes an extended CSV copy in Drive before submitting.
 * Put the CSV file in Drive, then call this function.
 */
function extendResponsesFromCsv() {
  CSV_AUTOSUBMIT_CONFIGS.forEach((config) => submitCsvToCopy_(config));
}

function generateForOneForm_(config) {
  validateConfig_(config);
  const original = FormApp.openById(config.originalFormId);
  const form = FormApp.openById(config.copyFormId);
  assertOriginal_(original, config);
  assertSyntheticCopy_(form);
  assertCanSubmitSynthetic_(form);

  if (form.collectsEmail()) {
    throw new Error(
      form.getTitle() + ': turn off verified email collection on the TEST COPY. ' +
      'Apps Script cannot invent verified respondent accounts.'
    );
  }

  const realCount = original.getResponses().length;
  const copyCount = form.getResponses().length;
  const existingCombined = realCount + copyCount;
  const needed = config.targetCombinedTotal - existingCombined;

  if (needed <= 0) {
    console.log('%s real + %s copy responses already reaches %s; nothing added.',
      realCount, copyCount, existingCombined);
    return;
  }
  if (needed > MAX_ADDITIONS_PER_FORM_PER_RUN) {
    throw new Error('Refusing to add ' + needed + ' responses in one run.');
  }

  console.log('%s: %s real + %s copy; adding %s synthetic to reach %s combined.',
    form.getTitle(), realCount, copyCount, needed, config.targetCombinedTotal);

  // Build every response before submitting the first one. This catches most
  // unsupported question types without leaving a partly populated form.
  const pending = [];
  for (let n = 0; n < needed; n++) {
    pending.push(buildResponse_(form, copyCount + n + 1));
  }

  if (DRY_RUN) {
    console.log('DRY_RUN is true: validated %s synthetic responses; submitted 0.', needed);
    return;
  }

  pending.forEach((response, index) => {
    response.submit();
    if ((index + 1) % 10 === 0 || index + 1 === pending.length) {
      console.log('Submitted %s/%s to %s.', index + 1, pending.length, form.getTitle());
    }
  });
}

function submitCsvToCopy_(config) {
  validateCsvConfig_(config);
  const form = FormApp.openById(config.copyFormId);
  assertSyntheticCopy_(form);
  assertCanSubmitSynthetic_(form);

  const csvText = readCsvTextFromDrive_(config.csvSource);
  const rows = Utilities.parseCsv(csvText);
  if (!rows || rows.length < 2) {
    console.log('No data rows found in CSV for form %s.', form.getTitle());
    return;
  }

  const headers = rows.shift();
  const headerIndexByNormalized = buildHeaderIndex_(headers);
  const itemToHeaderIndex = mapItemsToHeader_(form.getItems(), headerIndexByNormalized);

  const existingCount = form.getResponses().length;
  const needed = config.targetCombinedTotal - existingCount;
  if (needed <= 0) {
    console.log('%s already at %s responses (target %s).', form.getTitle(), existingCount, config.targetCombinedTotal);
    return;
  }
  const toAdd = Math.min(needed, MAX_AUTOSUBMIT_ROWS_PER_RUN, CSV_BATCH_SIZE);
  if (needed > MAX_AUTOSUBMIT_ROWS_PER_RUN) {
    console.log('%s: needed %s, will add %s this run (batch limit).', form.getTitle(), needed, toAdd);
  }

  const identityColumns = mapIdentityColumns_(headers);
  const extension = buildExtendedCsvEntries_(rows, headers, toAdd, existingCount + 1, identityColumns);
  const extendedFileSource = writeExtendedCsvFile_(config, [headers].concat(rows, extension.rows));

  const pending = [];
  const pendingMeta = [];
  extension.entries.forEach((entry) => {
    const response = form.createResponse();
    let next = response;
    form.getItems().forEach((item) => {
      try {
        const itemResponse = responseForItemFromCsv_(item, entry.row, itemToHeaderIndex, entry.identity);
        if (itemResponse) {
          next = next.withItemResponse(itemResponse);
        } else if (isItemRequired_(item)) {
          const fallback = requiredFallbackResponseForItem_(item, entry.row, itemToHeaderIndex, entry.identity);
          if (fallback) {
            next = next.withItemResponse(fallback);
          }
        }
      } catch (itemError) {
        const title = item.getTitle ? item.getTitle() : 'Unknown';
        throw new Error('Error preparing response for item "' + title + '": ' + itemError.message);
      }
    });
    pending.push(next);
    pendingMeta.push({ response: next, entry: entry });
  });

  if (DRY_RUN) {
    console.log('DRY_RUN true: validated %s template-based synthetic responses for %s. Submissions: 0.',
      pending.length, form.getTitle());
    console.log('Extended CSV prepared in Drive: %s', extendedFileSource);
    console.log('Current combined responses: %s/%s. Remaining required after this batch: %s.',
      existingCount + pending.length, config.targetCombinedTotal, Math.max(0, needed - toAdd));
    return;
  }

  pending.forEach((response, index) => {
    try {
      response.submit();
    } catch (error) {
      const label = existingCount + index + 1;
      const entry = pendingMeta[index] ? pendingMeta[index].entry : null;
      console.error('Failed submitting synthetic row ' + label + ' to ' + form.getTitle() + ': ' + error.message);
      if (entry) {
        console.error('Synthetic identity: ' + JSON.stringify(entry.identity));
        logRowMapping_(form, entry.row, itemToHeaderIndex);
      }
      throw error;
    }
    if ((index + 1) % 10 === 0 || index + 1 === pending.length) {
      console.log('Submitted %s/%s to %s (from CSV templates).', index + 1, pending.length, form.getTitle());
    }
  });
  console.log('Batch complete for %s. Added %s responses. Remaining to target: %s.',
    form.getTitle(), pending.length, Math.max(0, needed - toAdd));
  if (toAdd < needed) {
    console.log('Run extendResponsesFromCsv() again to continue next batch.');
  } else {
    console.log('Target %s reached for this form copy.', config.targetCombinedTotal);
  }
}

function mapIdentityColumns_(headers) {
  const nameIndexes = [];
  const emailIndexes = [];

  headers.forEach((header, idx) => {
    const normalized = normalizeHeader_(header);
    if (!normalized) return;
    if (normalized === 'name' || normalized === 'name optional' || normalized === 'full name' ||
      normalized === 'full name optional' || /^full name/i.test(normalized) || /^your name/i.test(normalized)) {
      nameIndexes.push(idx);
      return;
    }
    if (normalized === 'email' || normalized === 'email address' || normalized === 'email address optional') {
      emailIndexes.push(idx);
      return;
    }
    if ((/\bemail\b/.test(normalized)) && !/\bconsent|agree\b/.test(normalized)) {
      emailIndexes.push(idx);
    }
  });

  return { nameIndexes: nameIndexes, emailIndexes: emailIndexes };
}

function buildExtendedCsvEntries_(rows, headers, needed, startSyntheticId, identityColumns) {
  const extensionRows = [];
  const entries = [];
  for (let n = 0; n < needed; n++) {
    const templateRow = rows.length ? rows[n % rows.length] : [];
    const row = new Array(headers.length).fill('');
    for (let c = 0; c < row.length; c++) {
      row[c] = templateRow[c] || '';
    }

    const syntheticId = startSyntheticId + n;
    const identity = syntheticIdentity_(syntheticId);

    identityColumns.nameIndexes.forEach((idx) => {
      row[idx] = identity.name;
    });
    identityColumns.emailIndexes.forEach((idx) => {
      row[idx] = identity.email;
    });

    extensionRows.push(row);
    entries.push({ row, identity });
  }

  return { rows: extensionRows, entries };
}

function writeExtendedCsvFile_(config, rows) {
  const targetName = config.csvExtendedSource || buildExtendedCsvName_(config.csvSource);
  const csvText = buildCsvText_(rows);

  const iterator = DriveApp.getFilesByName(targetName);
  if (iterator.hasNext()) {
    const file = iterator.next();
    file.setContent(csvText);
    return file.getName();
  }
  DriveApp.createFile(targetName, csvText, MimeType.CSV);
  return targetName;
}

function logRowMapping_(form, row, itemToHeaderIndex) {
  const samples = [];
  const items = form.getItems();
  for (let i = 0; i < items.length && i < 20; i++) {
    const item = items[i];
    const idx = itemToHeaderIndex[item.getId()];
    const type = String(item.getType());
    const title = typeof item.getTitle === 'function' ? item.getTitle() : '';
    if (type === String(FormApp.ItemType.SECTION_HEADER) || type === String(FormApp.ItemType.PAGE_BREAK) ||
      type === String(FormApp.ItemType.IMAGE) || type === String(FormApp.ItemType.VIDEO)) {
      continue;
    }
    samples.push('[' + type + '] ' + title + ' -> ' + JSON.stringify(getCsvValue_(row, idx)));
  }
  console.error('First-item preview for failed row: ' + samples.join(' | '));
}

function buildExtendedCsvName_(sourceName) {
  const trimmed = String(sourceName || '').trim();
  if (trimmed.toLowerCase().endsWith('.csv')) {
    return trimmed.replace(/\.csv$/i, ' - Extended.csv');
  }
  return trimmed + ' - Extended.csv';
}

/**
 * Legacy "submit every raw row once" behavior still available for debugging.
 * Disabled by default via needed checks above.
 */
function submitAllCsvRowsOnce_(config) {
  validateCsvConfig_(config);
  const form = FormApp.openById(config.copyFormId);
  assertSyntheticCopy_(form);
  assertCanSubmitSynthetic_(form);

  const csvText = readCsvTextFromDrive_(config.csvSource);
  const rows = Utilities.parseCsv(csvText);
  if (!rows || rows.length < 2) {
    console.log('No data rows found in CSV for form %s.', form.getTitle());
    return;
  }

  const headers = rows.shift();
  const headerIndexByNormalized = buildHeaderIndex_(headers);
  const itemToHeaderIndex = mapItemsToHeader_(form.getItems(), headerIndexByNormalized);
  const rowLimit = Math.min(MAX_AUTOSUBMIT_ROWS_PER_RUN, rows.length);
  const pending = [];

  for (let r = 0; r < rowLimit; r++) {
    const response = form.createResponse();
    let next = response;
    const identity = syntheticIdentity_(r + 1);
    form.getItems().forEach((item) => {
      try {
        const itemResponse = responseForItemFromCsv_(item, rows[r], itemToHeaderIndex, identity);
        if (itemResponse) {
          next = next.withItemResponse(itemResponse);
        } else if (isItemRequired_(item)) {
          const fallback = requiredFallbackResponseForItem_(item, rows[r], itemToHeaderIndex, identity);
          if (fallback) {
            next = next.withItemResponse(fallback);
          }
        }
      } catch (itemError) {
        const title = item.getTitle ? item.getTitle() : 'Unknown';
        throw new Error('Error preparing response for item "' + title + '": ' + itemError.message);
      }
    });
    pending.push(next);
  }

  if (DRY_RUN) {
    console.log('DRY_RUN true: validated %s CSV rows for %s. Submissions: 0.', pending.length, form.getTitle());
    return;
  }

  pending.forEach((response, index) => {
    try {
      response.submit();
    } catch (error) {
      console.error('Failed submitting debug row ' + (index + 1) + ' to ' + form.getTitle() + ': ' + error.message);
      throw error;
    }
    if ((index + 1) % 10 === 0 || index + 1 === pending.length) {
      console.log('Submitted %s/%s to %s (from CSV).', index + 1, pending.length, form.getTitle());
    }
  });
}

function buildResponse_(form, syntheticNumber) {
  let response = form.createResponse();

  form.getItems().forEach((item) => {
    const itemResponse = responseForItem_(item, syntheticNumber);
    if (itemResponse) response = response.withItemResponse(itemResponse);
  });

  return response;
}

function responseForItem_(item, syntheticNumber) {
  const type = item.getType();

  switch (type) {
    case FormApp.ItemType.MULTIPLE_CHOICE: {
      const q = item.asMultipleChoiceItem();
      return q.createResponse(pick_(q.getChoices()).getValue());
    }
    case FormApp.ItemType.LIST: {
      const q = item.asListItem();
      return q.createResponse(pick_(q.getChoices()).getValue());
    }
    case FormApp.ItemType.CHECKBOX: {
      const q = item.asCheckboxItem();
      const choices = shuffled_(q.getChoices()).slice(0, randomInt_(1, Math.min(3, q.getChoices().length)));
      return q.createResponse(choices.map((choice) => choice.getValue()));
    }
    case FormApp.ItemType.SCALE: {
      const q = item.asScaleItem();
      return q.createResponse(randomInt_(q.getLowerBound(), q.getUpperBound()));
    }
    case FormApp.ItemType.RATING: {
      const q = item.asRatingItem();
      return q.createResponse(randomInt_(1, q.getRatingScaleLevel()));
    }
    case FormApp.ItemType.GRID: {
      const q = item.asGridItem();
      const columns = q.getColumns();
      return q.createResponse(q.getRows().map(() => pick_(columns)));
    }
    case FormApp.ItemType.CHECKBOX_GRID: {
      const q = item.asCheckboxGridItem();
      const columns = q.getColumns();
      return q.createResponse(q.getRows().map(() => [pick_(columns)]));
    }
    case FormApp.ItemType.TEXT: {
      const q = item.asTextItem();
      return q.createResponse(syntheticText_(item.getTitle(), syntheticNumber, false));
    }
    case FormApp.ItemType.PARAGRAPH_TEXT: {
      const q = item.asParagraphTextItem();
      return q.createResponse(syntheticText_(item.getTitle(), syntheticNumber, true));
    }
    case FormApp.ItemType.DATE: {
      const q = item.asDateItem();
      return q.createResponse(randomRecentDate_());
    }
    case FormApp.ItemType.DATETIME: {
      const q = item.asDateTimeItem();
      return q.createResponse(randomRecentDate_());
    }
    case FormApp.ItemType.TIME: {
      const q = item.asTimeItem();
      return q.createResponse(randomInt_(8, 20), pick_([0, 15, 30, 45]));
    }
    case FormApp.ItemType.DURATION: {
      const q = item.asDurationItem();
      return q.createResponse(0, randomInt_(5, 59), 0);
    }

    // These are display/navigation items and do not receive answers.
    case FormApp.ItemType.IMAGE:
    case FormApp.ItemType.VIDEO:
    case FormApp.ItemType.SECTION_HEADER:
    case FormApp.ItemType.PAGE_BREAK:
      return null;

    case FormApp.ItemType.FILE_UPLOAD:
      throw new Error(
        'File-upload question not supported in synthetic generation: "' + item.getTitle() + '"'
      );
    default:
      throw new Error(
        'Unsupported question type ' + type + ': "' + item.getTitle() + '"'
      );
  }
}

function responseForItemFromCsv_(item, row, itemToHeaderIndex, syntheticIdentity) {
  const title = (item.getTitle() || '').toString();
  const csvValue = getCsvValue_(row, itemToHeaderIndex[item.getId()]);

  const isEmailField = /\be-?mail(?:\s*address)?\b/i.test(title) ||
    (itemToHeaderIndex[item.getId()] !== undefined &&
      /\bemail\b/i.test(String(title || '')));
  const isNameField = /(^|\s)(?:full\s+|your\s+|respondent(?:'s)?\s+|participant(?:'s)?\s+)?name\b/i.test(title) ||
    /(^|\s)name(?:\s|\()?/i.test(title);

  if (isEmailField) {
    switch (item.getType()) {
      case FormApp.ItemType.TEXT:
        return item.asTextItem().createResponse(syntheticIdentity.email);
      case FormApp.ItemType.PARAGRAPH_TEXT:
        return item.asParagraphTextItem().createResponse(syntheticIdentity.email);
      default:
        return null;
    }
  }
  if (isNameField) {
    switch (item.getType()) {
      case FormApp.ItemType.TEXT:
        return item.asTextItem().createResponse(syntheticIdentity.name);
      case FormApp.ItemType.PARAGRAPH_TEXT:
        return item.asParagraphTextItem().createResponse(syntheticIdentity.name);
      default:
        return null;
    }
  }

  // Some forms include "Timestamp" and metadata columns not represented as items.
  if (!csvValue || csvValue === '') return null;
  const type = item.getType();

  switch (type) {
    case FormApp.ItemType.MULTIPLE_CHOICE: {
      const q = item.asMultipleChoiceItem();
      const chosen = chooseTextChoice_(q.getChoices(), csvValue, true);
      return chosen ? q.createResponse(chosen) : null;
    }
    case FormApp.ItemType.LIST: {
      const q = item.asListItem();
      const chosen = chooseTextChoice_(q.getChoices(), csvValue, true);
      return chosen ? q.createResponse(chosen) : null;
    }
    case FormApp.ItemType.CHECKBOX: {
      const q = item.asCheckboxItem();
      const picks = splitCsvMultiValue_(csvValue)
        .map((value) => chooseTextChoice_(q.getChoices(), value, true))
        .filter(Boolean);
      return picks.length ? q.createResponse(picks) : null;
    }
    case FormApp.ItemType.SCALE: {
      const q = item.asScaleItem();
      const scale = extractLeadingInteger_(csvValue);
      if (!Number.isInteger(scale)) return null;
      return q.createResponse(Math.max(q.getLowerBound(), Math.min(q.getUpperBound(), scale)));
    }
    case FormApp.ItemType.RATING: {
      const q = item.asRatingItem();
      const rating = extractLeadingInteger_(csvValue);
      if (!Number.isInteger(rating)) return null;
      return q.createResponse(Math.max(1, Math.min(q.getRatingScaleLevel(), rating)));
    }
    case FormApp.ItemType.GRID: {
      const q = item.asGridItem();
      return buildGridResponseFromCsv_(q, row, itemToHeaderIndex[item.getId()]);
    }
    case FormApp.ItemType.CHECKBOX_GRID: {
      const q = item.asCheckboxGridItem();
      return buildCheckboxGridResponseFromCsv_(q, row, itemToHeaderIndex[item.getId()]);
    }
    case FormApp.ItemType.TEXT:
    case FormApp.ItemType.PARAGRAPH_TEXT: {
      const t = item.getType() === FormApp.ItemType.TEXT ? item.asTextItem() : item.asParagraphTextItem();
      return t.createResponse(csvValue);
    }
    case FormApp.ItemType.DATE: {
      const q = item.asDateItem();
      const dateValue = new Date(csvValue);
      return isValidDate_(dateValue) ? q.createResponse(dateValue) : q.createResponse(randomRecentDate_());
    }
    case FormApp.ItemType.DATETIME: {
      const q = item.asDateTimeItem();
      const datetimeValue = new Date(csvValue);
      return isValidDate_(datetimeValue) ? q.createResponse(datetimeValue) : q.createResponse(randomRecentDate_());
    }
    case FormApp.ItemType.TIME: {
      const q = item.asTimeItem();
      const timeValue = parseTime_(csvValue);
      return timeValue ? q.createResponse(timeValue[0], timeValue[1]) : null;
    }
    case FormApp.ItemType.DURATION: {
      const q = item.asDurationItem();
      const durationValue = extractLeadingInteger_(csvValue);
      return Number.isInteger(durationValue) ? q.createResponse(0, durationValue, 0) : null;
    }
    case FormApp.ItemType.IMAGE:
    case FormApp.ItemType.VIDEO:
    case FormApp.ItemType.SECTION_HEADER:
    case FormApp.ItemType.PAGE_BREAK:
      return null;
    case FormApp.ItemType.FILE_UPLOAD:
      return null;
    default:
      return null;
  }
}

/**
 * Edit these keyword rules if inspection shows special text validation.
 * All generated identifiers use Filipino-style names and gmail/yahoo addresses.
 */
function syntheticText_(title, n, isParagraph) {
  const t = String(title || '').toLowerCase();
  const serial = Utilities.formatString('%03d', n);

  if (/response source|data source|record type|test marker/.test(t)) return 'SYNTHETIC TEST';
  if (/e-?mail/.test(t)) return syntheticIdentity_(n).email;
  if (/^\s*(?:full\s+|your\s+|respondent(?:'s)?\s+|participant(?:'s)?\s+)?name\b/.test(t)) {
    return syntheticIdentity_(n).name;
  }
  if (/\bage\b/.test(t)) return String(randomInt_(18, 60));
  if (/occupation|role|position/.test(t)) {
    return pick_(['Student', 'Educator', 'Designer', 'Developer', 'Office staff', 'Other']);
  }
  if (/suggest|recommend|improv|feedback|comment|experience/.test(t) || isParagraph) {
    return pick_([
      'Synthetic test comment: navigation was clear, but first-time guidance could be more visible.',
      'Synthetic test comment: the main workflow felt straightforward and responsive.',
      'Synthetic test comment: labels were understandable; a short onboarding tip may help.',
      'Synthetic test comment: performance was acceptable during this simulated session.',
      'Synthetic test comment: the feature set was useful, with room for clearer error messages.',
      'Synthetic test comment: no major issue was simulated for this test record.',
    ]);
  }

  return 'Synthetic test response ' + serial;
}

/** Fictional combinations; never derived from the original respondents.
 * The same record number gives every name/email field a matching identity.
 * These test email addresses do not represent real mailboxes.
 */
function syntheticIdentity_(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('Synthetic record number must be a positive integer.');
  }
  const givenNames = [
    'Juan', 'Maria', 'Jose', 'Ana', 'Paolo', 'Camille',
    'Miguel', 'Angelica', 'Carlo', 'Patricia', 'Rafael', 'Isabella',
    'Lito', 'Mae', 'Gabriel', 'Sofia', 'Jericho', 'Aileen', 'Mark', 'Cristina',
  ];
  const surnames = [
    'Santos', 'Reyes', 'Cruz', 'Garcia', 'Mendoza',
    'Ramos', 'Dela Cruz', 'Bautista', 'Villanueva', 'Aquino',
    'Tan', 'Soriano', 'Dizon', 'Paredes', 'Mercado',
  ];
  const index = n - 1;
  const givenName = givenNames[index % givenNames.length];
  const surname = surnames[Math.floor(index / givenNames.length) % surnames.length];
  const serial = String(n).padStart(3, '0');
  const emailName = (givenName + '.' + surname).toLowerCase().replace(/[^a-z]/g, '');
  const providers = ['gmail.com', 'yahoo.com'];
  const provider = providers[(n - 1) % providers.length];
  return {
    name: givenName + ' ' + surname + ' [SYNTHETIC ' + serial + ']',
    email: emailName + '.synthetic.' + serial + '@' + provider,
  };
}

function assertSyntheticCopy_(form) {
  if (ORIGINAL_FORM_IDS.has(form.getId())) {
    throw new Error('Refusing to run on an original form: ' + form.getId());
  }
  const allowedCopyIds = FORM_CONFIGS.map((config) => config.copyFormId);
  if (allowedCopyIds.indexOf(form.getId()) === -1) {
    throw new Error('Refusing to run on an unconfigured form: ' + form.getId());
  }
  if (REQUIRED_COPY_TITLE_ENDING) {
    const normalizedRequired = String(REQUIRED_COPY_TITLE_ENDING).trim();
    if (normalizedRequired && !form.getTitle().trim().endsWith(normalizedRequired)) {
      throw new Error(
        'Expected this copied form title to end in "' + normalizedRequired +
        '". Current title: ' + form.getTitle()
      );
    }
  }
}

function assertOriginal_(form, config) {
  if (form.getId() !== config.originalFormId || !ORIGINAL_FORM_IDS.has(form.getId())) {
    throw new Error('Original/copy configuration mismatch: ' + form.getId());
  }
}

function validateConfig_(config) {
  if (!config.originalFormId || !config.copyFormId) {
    throw new Error('An original or copy form ID is missing from FORM_CONFIGS.');
  }
  if (!Number.isInteger(config.targetCombinedTotal) ||
      config.targetCombinedTotal < 100 || config.targetCombinedTotal > 110) {
    throw new Error('targetCombinedTotal must be an integer from 100 through 110.');
  }
}

function validateCsvConfig_(config) {
  if (!config.copyFormId) {
    throw new Error('A copyFormId is required for CSV config.');
  }
  if (!Number.isInteger(config.targetCombinedTotal) ||
      config.targetCombinedTotal < 100 || config.targetCombinedTotal > 110) {
    throw new Error('CSV config targetCombinedTotal must be an integer from 100 through 110.');
  }
  if (!config.csvSource || String(config.csvSource).trim() === '') {
    throw new Error('A csvSource is required for CSV autosubmit config.');
  }
}

function readCsvTextFromDrive_(csvSource) {
  if (!csvSource || String(csvSource).trim() === '') {
    throw new Error('CSV source is empty.');
  }
  const source = String(csvSource).trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(source)) {
    return DriveApp.getFileById(source).getBlob().getDataAsString();
  }
  const fileIterator = DriveApp.getFilesByName(source);
  if (!fileIterator.hasNext()) {
    throw new Error('CSV file not found in Drive by name: ' + source);
  }
  return fileIterator.next().getBlob().getDataAsString();
}

function buildHeaderIndex_(headers) {
  const index = {};
  headers.forEach((header, idx) => {
    const key = normalizeHeader_(header);
    if (key) index[key] = idx;
  });
  return index;
}

function mapItemsToHeader_(items, headerIndexByNormalized) {
  const map = {};
  const keys = Object.keys(headerIndexByNormalized);
  items.forEach((item) => {
    const itemType = item.getType();
    const rawTitle = item.getTitle() || '';
    const direct = normalizeHeader_(rawTitle);
    if (itemType === FormApp.ItemType.GRID || itemType === FormApp.ItemType.CHECKBOX_GRID) {
      const indexes = [];
      const simplified = normalizeHeader_(stripOptionalLabel_(rawTitle));
      const compareTokens = [direct, simplified].filter(Boolean);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const hasTokenMatch = compareTokens.some((token) => key === token || key.indexOf(token) === 0 || token.indexOf(key) === 0);
        if (hasTokenMatch) {
          const idx = headerIndexByNormalized[key];
          if (idx !== undefined && indexes.indexOf(idx) === -1) {
            indexes.push(idx);
          }
        }
      }
      if (!indexes.length && direct) {
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (key.indexOf(direct) !== -1 || direct.indexOf(key) !== -1) {
            const idx = headerIndexByNormalized[key];
            if (idx !== undefined && indexes.indexOf(idx) === -1) {
              indexes.push(idx);
            }
          }
        }
      }
      map[item.getId()] = indexes;
      return;
    }

    let idx = headerIndexByNormalized[direct];
    if (idx === undefined) {
      const simplified = normalizeHeader_(stripOptionalLabel_(rawTitle));
      idx = headerIndexByNormalized[simplified];
    }
    if (idx === undefined) {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key.indexOf(direct) !== -1 || direct.indexOf(key) !== -1) {
          idx = headerIndexByNormalized[key];
          break;
        }
      }
    }
    map[item.getId()] = idx;
  });
  return map;
}

function assertCanSubmitSynthetic_(form) {
  if (form.collectsEmail()) {
    throw new Error(
      form.getTitle() + ': turn off verified email collection on the TEST COPY. ' +
      'Apps Script cannot invent verified respondent accounts.'
    );
  }
}

function getCsvValue_(row, index) {
  if (index === undefined || index < 0) return '';
  if (Array.isArray(index)) {
    if (index.length === 0) return '';
    index = index[0];
  }
  return String(row[index] || '');
}

function getCsvIndexes_(indexValue) {
  if (indexValue === undefined || indexValue === null) return [];
  if (Array.isArray(indexValue)) return indexValue.slice();
  if (typeof indexValue === 'number' && indexValue >= 0 && Number.isInteger(indexValue)) return [indexValue];
  return [];
}

function isItemRequired_(item) {
  return item && typeof item.isRequired === 'function' ? !!item.isRequired() : false;
}

function requiredFallbackResponseForItem_(item, row, itemToHeaderIndex, syntheticIdentity) {
  const title = (item.getTitle() || '').toString();
  const type = item.getType();

  switch (type) {
    case FormApp.ItemType.TEXT: {
      const isEmailField = /\be-?mail(?:\s*address)?\b/i.test(title) ||
        (/\bemail\b/i.test(title) && title.toLowerCase().indexOf('consent') === -1);
      return isEmailField
        ? item.asTextItem().createResponse(syntheticIdentity.email)
        : item.asTextItem().createResponse(syntheticIdentity.name);
    }
    case FormApp.ItemType.PARAGRAPH_TEXT:
      return item.asParagraphTextItem().createResponse('AUTO-FALLBACK TEST RESPONSE.');
    case FormApp.ItemType.MULTIPLE_CHOICE:
      return item.asMultipleChoiceItem().createResponse(pick_(item.asMultipleChoiceItem().getChoices()).getValue());
    case FormApp.ItemType.LIST:
      return item.asListItem().createResponse(pick_(item.asListItem().getChoices()).getValue());
    case FormApp.ItemType.CHECKBOX: {
      const choices = item.asCheckboxItem().getChoices();
      return item.asCheckboxItem().createResponse([pick_(choices).getValue()]);
    }
    case FormApp.ItemType.SCALE: {
      const q = item.asScaleItem();
      return q.createResponse(Math.max(q.getLowerBound(), Math.min(q.getUpperBound(), Math.round((q.getLowerBound() + q.getUpperBound()) / 2))));
    }
    case FormApp.ItemType.RATING: {
      const q = item.asRatingItem();
      return q.createResponse(Math.max(1, Math.min(q.getRatingScaleLevel(), 3)));
    }
    case FormApp.ItemType.GRID:
      return buildGridResponseFromCsv_(item.asGridItem(), row, itemToHeaderIndex[item.getId()]);
    case FormApp.ItemType.CHECKBOX_GRID:
      return buildCheckboxGridResponseFromCsv_(item.asCheckboxGridItem(), row, itemToHeaderIndex[item.getId()]);
    case FormApp.ItemType.DATE:
      return item.asDateItem().createResponse(randomRecentDate_());
    case FormApp.ItemType.DATETIME:
      return item.asDateTimeItem().createResponse(randomRecentDate_());
    case FormApp.ItemType.TIME:
      return item.asTimeItem().createResponse(randomInt_(8, 20), pick_([0, 15, 30, 45]));
    case FormApp.ItemType.DURATION:
      return item.asDurationItem().createResponse(0, 15, 0);
    default:
      return null;
  }
}

function buildGridResponseFromCsv_(gridItem, row, headerMap) {
  const rows = gridItem.getRows();
  const columns = gridItem.getColumns();
  const indexes = getCsvIndexes_(headerMap);
  const responseValues = [];
  for (let i = 0; i < rows.length; i++) {
    const rawValue = indexes[i] !== undefined ? String(row[indexes[i]] || '') : '';
    const normalized = normalizeHeader_(rawValue);
    let chosen = null;
    for (let c = 0; c < columns.length; c++) {
      const columnValue = String(columns[c] || '');
      if (normalizeHeader_(columnValue) === normalized && normalized) {
        chosen = columnValue;
        break;
      }
    }
    if (!chosen) {
      chosen = pick_(columns);
    }
    responseValues.push(chosen);
  }
  return gridItem.createResponse(responseValues);
}

function buildCheckboxGridResponseFromCsv_(checkboxGridItem, row, headerMap) {
  const rows = checkboxGridItem.getRows();
  const columns = checkboxGridItem.getColumns();
  const indexes = getCsvIndexes_(headerMap);
  const responseValues = [];
  for (let i = 0; i < rows.length; i++) {
    const rawValue = indexes[i] !== undefined ? String(row[indexes[i]] || '') : '';
    const multi = splitCsvMultiValue_(rawValue)
      .map((value) => {
        const normalized = normalizeHeader_(value);
        if (!normalized) return '';
        for (let c = 0; c < columns.length; c++) {
          const columnValue = String(columns[c] || '');
          if (normalizeHeader_(columnValue) === normalized) return columnValue;
        }
        return '';
      })
      .filter(Boolean);
    responseValues.push(multi.length ? multi : [pick_(columns)]);
  }
  return checkboxGridItem.createResponse(responseValues);
}

function chooseTextChoice_(choices, value, strictValueFallback) {
  if (!value || !choices || !choices.length) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = normalizeHeader_(raw);
  let fallback = null;

  for (let i = 0; i < choices.length; i++) {
    const choiceValue = String(choices[i].getValue() || '');
    if (choiceValue === raw) return choiceValue;
    if (normalizeHeader_(choiceValue) === normalized) return choiceValue;
    if (choiceValue.toLowerCase().indexOf(raw.toLowerCase()) !== -1) return choiceValue;
    if (strictValueFallback) fallback = fallback || choiceValue;
  }
  return fallback;
}

function splitCsvMultiValue_(value) {
  return String(value || '')
    .split(/[,;|]/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function extractLeadingInteger_(value) {
  const match = String(value).match(/\d+/);
  if (!match) return NaN;
  return Number(match[0]);
}

function buildCsvText_(rows) {
  return rows.map((row) => row.map((value) => escapeCsvValue_(value)).join(',')).join('\n');
}

function escapeCsvValue_(value) {
  const text = String(value === undefined || value === null ? '' : value);
  if (text === '') return '';
  if (/[,\n\r"]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function parseTime_(value) {
  const m = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function choicesForLog_(item) {
  const type = item.getType();
  let choices = null;
  if (type === FormApp.ItemType.MULTIPLE_CHOICE) choices = item.asMultipleChoiceItem().getChoices();
  if (type === FormApp.ItemType.LIST) choices = item.asListItem().getChoices();
  if (type === FormApp.ItemType.CHECKBOX) choices = item.asCheckboxItem().getChoices();
  if (choices) return ' | choices: ' + choices.map((choice) => choice.getValue()).join(' / ');
  if (type === FormApp.ItemType.GRID) return ' | columns: ' + item.asGridItem().getColumns().join(' / ');
  if (type === FormApp.ItemType.CHECKBOX_GRID) return ' | columns: ' + item.asCheckboxGridItem().getColumns().join(' / ');
  return '';
}

function randomRecentDate_() {
  const now = new Date();
  const daysAgo = randomInt_(0, 90);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, randomInt_(8, 20), 0, 0);
}

function isValidDate_(value) {
  return value instanceof Date && !isNaN(value.getTime());
}

function randomInt_(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function pick_(values) {
  if (!values.length) throw new Error('A question has no selectable choices.');
  return values[randomInt_(0, values.length - 1)];
}

function shuffled_(values) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt_(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeHeader_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripOptionalLabel_(value) {
  return String(value || '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
