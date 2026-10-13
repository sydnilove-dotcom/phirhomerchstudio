const SPREADSHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const IDEAS_SHEET_NAME = "Ideas";
const HEADERS = ["id", "text", "image", "link", "archived", "createdAt", "updatedAt"];

function doGet() {
  return jsonResponse(listIdeas());
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

  return jsonResponse({ error: "Unknown action" }, 400);
}

function getIdeasSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(IDEAS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(IDEAS_SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
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
    .getRange(2, 1, lastRow - 1, HEADERS.length)
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

  getIdeasSheet().appendRow(HEADERS.map((header) => idea[header]));
  return idea;
}

function updateIdea(id, updates) {
  const rowIndex = findIdeaRow(id);
  const sheet = getIdeasSheet();
  const current = rowToIdea(sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0]);
  const next = {
    ...current,
    ...updates,
    archived: updates.archived === undefined ? current.archived : Boolean(updates.archived),
    updatedAt: new Date().toISOString()
  };

  sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([HEADERS.map((header) => next[header])]);
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

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
