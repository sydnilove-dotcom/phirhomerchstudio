const SPREADSHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const IDEAS_SHEET_NAME = "Ideas";
const MERCH_SHEET_NAME = "Merch";
const IDEA_HEADERS = ["id", "text", "image", "link", "archived", "createdAt", "updatedAt"];
const MERCH_HEADERS = ["id", "name", "price", "description", "image", "sizes", "createdAt", "updatedAt"];

function doGet() {
  return jsonResponse({
    ideas: listIdeas(),
    merch: listMerch()
  });
}

function doPost(event) {
  const body = JSON.parse(event.postData?.contents || "{}");

  if (body.action === "list") {
    return jsonResponse(listIdeas());
  }

  if (body.action === "create") {
    return jsonResponse(createIdea(body.idea || {}));
  }

  if (body.action === "update") {
    updateIdea(body.id, body.updates || {});
    return jsonResponse({ ok: true });
  }

  if (body.action === "delete") {
    deleteIdea(body.id);
    return jsonResponse({ ok: true });
  }

  if (body.action === "merch:list") {
    return jsonResponse(listMerch());
  }

  if (body.action === "merch:create") {
    return jsonResponse(createMerch(body.item || {}));
  }

  if (body.action === "merch:delete") {
    deleteMerch(body.id);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
}

function getIdeasSheet() {
  return getSheet(IDEAS_SHEET_NAME, IDEA_HEADERS);
}

function getMerchSheet() {
  return getSheet(MERCH_SHEET_NAME, MERCH_HEADERS);
}

function getSheet(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = headers.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function listIdeas() {
  const sheet = getIdeasSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, IDEA_HEADERS.length)
    .getValues()
    .map(rowToIdea)
    .filter((idea) => idea.text)
    .reverse();
}

function createIdea(rawIdea) {
  const now = new Date().toISOString();
  const idea = {
    id: String(rawIdea.id || Utilities.getUuid()),
    text: String(rawIdea.text || "").trim(),
    image: String(rawIdea.image || "").trim(),
    link: String(rawIdea.link || "").trim(),
    archived: false,
    createdAt: now,
    updatedAt: now
  };

  if (!idea.text) {
    throw new Error("Suggestion text is required.");
  }

  getIdeasSheet().appendRow(IDEA_HEADERS.map((header) => idea[header]));
  return idea;
}

function updateIdea(id, updates) {
  const rowIndex = findIdeaRow(id);
  const sheet = getIdeasSheet();
  const current = rowToIdea(sheet.getRange(rowIndex, 1, 1, IDEA_HEADERS.length).getValues()[0]);
  const next = {
    ...current,
    ...updates,
    archived: updates.archived === undefined ? current.archived : Boolean(updates.archived),
    updatedAt: new Date().toISOString()
  };

  sheet.getRange(rowIndex, 1, 1, IDEA_HEADERS.length).setValues([IDEA_HEADERS.map((header) => next[header])]);
}

function deleteIdea(id) {
  getIdeasSheet().deleteRow(findIdeaRow(id));
}

function findIdeaRow(id) {
  const sheet = getIdeasSheet();
  const lastRow = sheet.getLastRow();

  if (!id || lastRow < 2) {
    throw new Error("Suggestion was not found.");
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const offset = ids.findIndex((row) => row[0] === id);

  if (offset === -1) {
    throw new Error("Suggestion was not found.");
  }

  return offset + 2;
}

function rowToIdea(row) {
  return {
    id: String(row[0] || ""),
    text: String(row[1] || ""),
    image: String(row[2] || ""),
    link: String(row[3] || ""),
    archived: row[4] === true || row[4] === "TRUE" || row[4] === "true",
    createdAt: String(row[5] || ""),
    updatedAt: String(row[6] || "")
  };
}

function listMerch() {
  const sheet = getMerchSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, MERCH_HEADERS.length)
    .getValues()
    .map(rowToMerch)
    .filter((item) => item.name)
    .reverse();
}

function createMerch(rawItem) {
  const now = new Date().toISOString();
  const item = {
    id: String(rawItem.id || Utilities.getUuid()),
    name: String(rawItem.name || "").trim(),
    price: Number(rawItem.price) || 0,
    description: String(rawItem.description || "").trim(),
    image: String(rawItem.image || "").trim(),
    sizes: Array.isArray(rawItem.sizes) ? rawItem.sizes.join(", ") : String(rawItem.sizes || ""),
    createdAt: now,
    updatedAt: now
  };

  if (!item.name) {
    throw new Error("Merch name is required.");
  }

  getMerchSheet().appendRow(MERCH_HEADERS.map((header) => item[header]));
  return rowToMerch(MERCH_HEADERS.map((header) => item[header]));
}

function deleteMerch(id) {
  getMerchSheet().deleteRow(findMerchRow(id));
}

function findMerchRow(id) {
  const sheet = getMerchSheet();
  const lastRow = sheet.getLastRow();

  if (!id || lastRow < 2) {
    throw new Error("Merch item was not found.");
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const offset = ids.findIndex((row) => row[0] === id);

  if (offset === -1) {
    throw new Error("Merch item was not found.");
  }

  return offset + 2;
}

function rowToMerch(row) {
  return {
    id: String(row[0] || ""),
    name: String(row[1] || ""),
    price: Number(row[2]) || 0,
    description: String(row[3] || ""),
    image: String(row[4] || ""),
    sizes: String(row[5] || "").split(",").map((size) => size.trim()).filter(Boolean),
    createdAt: String(row[6] || ""),
    updatedAt: String(row[7] || "")
  };
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
