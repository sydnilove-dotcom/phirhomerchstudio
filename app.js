const storageKeys = {
  ideas: "psr_merch_ideas",
  merch: "psr_merch_items",
  responses: "psr_merch_responses"
};
const maxUploadBytes = 2.5 * 1024 * 1024;
const sharedIdeasEndpoint = (window.PSR_SHARED_IDEAS_ENDPOINT || "").replace(/\/$/, "");

const seedIdeas = [
  {
    id: "pearl-tote-bag",
    text: "Pearl-toned tote bag with a wine red ΦΣΡ monogram and tiny orchid charm.",
    image: "",
    link: "https://www.phisigmarho.org/",
    archived: false
  },
  {
    id: "silver-star-pajama-shorts",
    text: "Silver star pajama shorts for chapter retreats.",
    image: "",
    link: "",
    archived: false
  }
];

const seedMerch = [
  {
    id: "orchid-pearl-crewneck",
    name: "Orchid Pearl Crewneck",
    price: 38,
    description: "Wine red crewneck with silver stitched letters, orchid sleeve detail, and a soft fleece inside.",
    image: "",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: "build-the-future-tee",
    name: "Build the Future Tee",
    price: 24,
    description: "Blush comfort tee with a clean ΦΣΡ front mark and chapter motto back print.",
    image: "",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"]
  },
  {
    id: "silver-star-sticker-pack",
    name: "Silver Star Sticker Pack",
    price: 8,
    description: "Laptop-ready sticker set with stars, pyramids, orchids, and Phi Rho lettering.",
    image: "",
    sizes: ["One size"]
  }
];

function createId() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const fallbackImage = (label) => {
  const initials = label.split(" ").map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#ffdce8"/>
          <stop offset="0.55" stop-color="#d7b8ff"/>
          <stop offset="1" stop-color="#fffaf0"/>
        </linearGradient>
      </defs>
      <rect width="800" height="520" fill="url(#bg)"/>
      <circle cx="168" cy="120" r="88" fill="#ffffff" opacity="0.58"/>
      <circle cx="650" cy="420" r="130" fill="#d8dce2" opacity="0.5"/>
      <path d="M400 92 626 430H174Z" fill="#fffaf0" opacity="0.72"/>
      <text x="400" y="282" fill="#541127" font-family="Georgia, serif" font-size="86" font-weight="700" text-anchor="middle">${initials || "ΦΣΡ"}</text>
      <text x="400" y="348" fill="#7b1f3a" font-family="Arial, sans-serif" font-size="30" font-weight="700" text-anchor="middle">Phi Sigma Rho</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const read = (key, fallback) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
};

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

let ideas = read(storageKeys.ideas, seedIdeas);
let merch = read(storageKeys.merch, seedMerch);
let responses = read(storageKeys.responses, []);
let adminUnlocked = false;

const ideaList = document.querySelector("#ideaList");
const merchGrid = document.querySelector("#merchGrid");
const ledgerBody = document.querySelector("#ledgerBody");
const totalInterest = document.querySelector("#totalInterest");

function money(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function normalizeIdea(idea) {
  return {
    id: idea.id || createId(),
    text: String(idea.text || "").trim(),
    image: String(idea.image || "").trim(),
    link: String(idea.link || "").trim(),
    archived: Boolean(idea.archived)
  };
}

function normalizeMerchItem(item) {
  const sizes = Array.isArray(item.sizes)
    ? item.sizes
    : String(item.sizes || "").split(",");

  return {
    id: item.id || createId(),
    name: String(item.name || "").trim(),
    price: Number(item.price) || 0,
    description: String(item.description || "").trim(),
    image: String(item.image || "").trim(),
    asset: item.asset || null,
    sizes: sizes.map((size) => String(size).trim()).filter(Boolean)
  };
}

function prepareSharedMerchItem(item) {
  const sharedItem = normalizeMerchItem(item);

  if (sharedItem.asset?.type?.startsWith("image/") && sharedItem.asset.dataUrl.length < 45000) {
    sharedItem.image = sharedItem.asset.dataUrl;
  }

  return {
    ...sharedItem,
    asset: null
  };
}

async function requestSharedIdeas(action, payload = {}) {
  if (!sharedIdeasEndpoint) {
    throw new Error("Shared storage is not configured yet.");
  }

  const response = await fetch(sharedIdeasEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ action, ...payload })
  });

  if (!response.ok) {
    throw new Error("The shared storage could not be reached.");
  }

  return response.status === 204 ? null : response.json();
}

async function loadSharedIdeas() {
  if (!sharedIdeasEndpoint) {
    renderIdeas();
    return;
  }

  try {
    const sharedIdeas = await requestSharedIdeas("list");
    ideas = Array.isArray(sharedIdeas) ? sharedIdeas.map(normalizeIdea).filter((idea) => idea.text) : [];
    write(storageKeys.ideas, ideas);
  } catch (error) {
    console.warn(error.message);
  }

  renderIdeas();
}

async function loadSharedMerch() {
  if (!sharedIdeasEndpoint) {
    renderMerch();
    return;
  }

  try {
    const sharedMerch = await requestSharedIdeas("merch:list");
    merch = Array.isArray(sharedMerch)
      ? sharedMerch.map(normalizeMerchItem).filter((item) => item.name)
      : [];
    write(storageKeys.merch, merch);
  } catch (error) {
    console.warn(error.message);
  }

  renderMerch();
}

async function saveSharedIdea(idea) {
  const savedIdea = await requestSharedIdeas("create", { idea });
  return normalizeIdea(savedIdea || idea);
}

async function saveSharedMerch(item) {
  const savedItem = await requestSharedIdeas("merch:create", { item: prepareSharedMerchItem(item) });
  return normalizeMerchItem(savedItem || item);
}

async function updateSharedIdea(ideaId, updates) {
  await requestSharedIdeas("update", { id: ideaId, updates });
}

async function deleteSharedIdea(ideaId) {
  await requestSharedIdeas("delete", { id: ideaId });
}

async function deleteSharedMerch(merchId) {
  await requestSharedIdeas("merch:delete", { id: merchId });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (file.size > maxUploadBytes) {
      reject(new Error("Please choose a file smaller than 2.5 MB for this prototype."));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        name: file.name,
        type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
        dataUrl: reader.result
      });
    });
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function renderMerchAsset(imageElement, linkElement, item) {
  const asset = item.asset;
  const legacyImage = item.image;
  imageElement.classList.remove("pdf-preview");

  if (asset?.type?.startsWith("image/")) {
    imageElement.style.backgroundImage = `url("${asset.dataUrl}")`;
    linkElement.href = asset.dataUrl;
    linkElement.textContent = "Click here to expand image";
    linkElement.classList.remove("hidden");
    return;
  }

  if (asset?.type === "application/pdf") {
    imageElement.style.backgroundImage = "";
    imageElement.classList.add("pdf-preview");
    linkElement.href = asset.dataUrl;
    linkElement.textContent = "Click here to expand image";
    linkElement.classList.remove("hidden");
    return;
  }

  imageElement.style.backgroundImage = `url("${legacyImage || fallbackImage(item.name)}")`;
  linkElement.classList.add("hidden");
}

function renderIdeas() {
  const template = document.querySelector("#ideaTemplate");
  ideaList.replaceChildren();

  ideas
    .filter((idea) => adminUnlocked || !idea.archived)
    .forEach((idea) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".idea-card");
    const media = node.querySelector(".idea-media");
    const status = node.querySelector(".status-pill");
    const paragraph = node.querySelector("p");
    const link = node.querySelector("a");
    const adminActions = node.querySelector(".idea-admin-actions");
    const ideaId = idea.id || createId();

    if (!idea.id) {
      idea.id = ideaId;
      write(storageKeys.ideas, ideas);
    }

    media.style.backgroundImage = `url("${idea.image || fallbackImage(idea.text)}")`;
    paragraph.textContent = idea.text;
    card.classList.toggle("archived", Boolean(idea.archived));
    status.classList.toggle("hidden", !idea.archived);

    if (idea.link) {
      link.href = idea.link;
    } else {
      link.remove();
    }

    if (adminUnlocked) {
      const archiveButton = document.createElement("button");
      archiveButton.className = "button secondary tiny";
      archiveButton.type = "button";
      archiveButton.textContent = idea.archived ? "Unarchive" : "Archive";
      archiveButton.addEventListener("click", async () => {
        const archived = !idea.archived;
        ideas = ideas.map((saved) => saved.id === ideaId ? { ...saved, archived } : saved);
        write(storageKeys.ideas, ideas);
        renderIdeas();

        try {
          await updateSharedIdea(ideaId, { archived });
        } catch (error) {
          if (sharedIdeasEndpoint) {
            alert(error.message);
          }
        }
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "button danger tiny";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        const shouldDelete = confirm("Delete this suggestion permanently?");
        if (!shouldDelete) {
          return;
        }

        ideas = ideas.filter((saved) => saved.id !== ideaId);
        write(storageKeys.ideas, ideas);
        renderIdeas();

        try {
          await deleteSharedIdea(ideaId);
        } catch (error) {
          if (sharedIdeasEndpoint) {
            alert(error.message);
          }
        }
      });

      adminActions.classList.remove("hidden");
      adminActions.append(archiveButton, deleteButton);
    }

    ideaList.append(node);
    });
}

function renderMerch() {
  const template = document.querySelector("#merchTemplate");
  merchGrid.replaceChildren();

  merch.forEach((item) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".merch-card");
    const image = node.querySelector(".merch-image");
    const assetLink = node.querySelector(".asset-link");
    const title = node.querySelector("h3");
    const price = node.querySelector(".price");
    const description = node.querySelector(".description");
    const select = node.querySelector("select");
    const form = node.querySelector(".interest-form");
    const count = node.querySelector(".interest-count");
    const yesCount = responses.filter((response) => response.itemId === item.id && response.want === "yes").length;
    const itemId = item.id || createId();

    if (!item.id) {
      item.id = itemId;
      write(storageKeys.merch, merch);
    }

    card.dataset.id = itemId;
    renderMerchAsset(image, assetLink, item);
    title.textContent = item.name;
    price.textContent = money(item.price);
    description.textContent = item.description;
    count.textContent = `${yesCount} sister${yesCount === 1 ? "" : "s"} marked yes`;

    if (adminUnlocked) {
      const adminActions = document.createElement("div");
      adminActions.className = "merch-admin-actions";

      const deleteButton = document.createElement("button");
      deleteButton.className = "button danger tiny";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete merch";
      deleteButton.addEventListener("click", async () => {
        const shouldDelete = confirm(`Delete "${item.name}" and its saved billing responses?`);
        if (!shouldDelete) {
          return;
        }

        merch = merch.filter((saved) => saved.id !== itemId);
        responses = responses.filter((response) => response.itemId !== itemId);
        write(storageKeys.merch, merch);
        write(storageKeys.responses, responses);
        renderMerch();
        renderLedger();

        try {
          await deleteSharedMerch(itemId);
        } catch (error) {
          if (sharedIdeasEndpoint) {
            alert(error.message);
          }
        }
      });

      adminActions.append(deleteButton);
      node.querySelector(".merch-body").append(adminActions);
    }

    item.sizes.forEach((size) => {
      const option = document.createElement("option");
      option.value = size.trim();
      option.textContent = size.trim();
      select.append(option);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const response = {
        id: createId(),
        itemId,
        itemName: item.name,
        price: item.price,
        want: formData.get("want"),
        name: formData.get("name").trim(),
        size: formData.get("size"),
        quantity: Number(formData.get("quantity")),
        greekbill: formData.get("greekbill").trim(),
        createdAt: new Date().toISOString()
      };

      responses = responses.filter((saved) => !(saved.itemId === itemId && saved.name.toLowerCase() === response.name.toLowerCase()));
      responses.unshift(response);
      write(storageKeys.responses, responses);
      renderMerch();
      renderLedger();
    });

    merchGrid.append(node);
  });

  totalInterest.textContent = responses.filter((response) => response.want === "yes").length;
}

function updateResponse(responseId, updates) {
  responses = responses.map((response) => response.id === responseId ? { ...response, ...updates } : response);
  write(storageKeys.responses, responses);
}

function createLedgerInput({ type = "text", value, label, onChange, min, step, placeholder }) {
  const input = document.createElement("input");
  input.className = "ledger-input";
  input.type = type;
  input.value = value;
  input.setAttribute("aria-label", label);

  if (min !== undefined) {
    input.min = min;
  }

  if (step !== undefined) {
    input.step = step;
  }

  if (placeholder) {
    input.placeholder = placeholder;
  }

  input.addEventListener("input", () => onChange(input));
  input.addEventListener("change", () => onChange(input));
  return input;
}

function renderLedger() {
  const billable = responses.filter((response) => response.want === "yes");
  ledgerBody.replaceChildren();

  if (!billable.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8">No yes responses yet.</td>`;
    ledgerBody.append(row);
    return;
  }

  billable.forEach((response) => {
    const row = document.createElement("tr");
    const responseId = response.id || createId();

    if (!response.id) {
      response.id = responseId;
      write(storageKeys.responses, responses);
    }

    const quantity = response.quantity || 1;
    const price = Number(response.price) || 0;
    const amountCell = document.createElement("td");
    const updateAmount = () => {
      const saved = responses.find((item) => item.id === responseId) || response;
      amountCell.textContent = money((Number(saved.price) || 0) * (Number(saved.quantity) || 1));
    };

    const cells = [
      createLedgerInput({
        value: response.name || "",
        label: "Billing name",
        onChange: (input) => updateResponse(responseId, { name: input.value.trim() })
      }),
      createLedgerInput({
        value: response.itemName || "",
        label: "Billing item name",
        onChange: (input) => updateResponse(responseId, { itemName: input.value.trim() })
      }),
      createLedgerInput({
        value: response.size || "",
        label: "Billing size",
        onChange: (input) => updateResponse(responseId, { size: input.value.trim() })
      }),
      createLedgerInput({
        type: "number",
        value: quantity,
        label: "Billing quantity",
        min: "1",
        step: "1",
        onChange: (input) => {
          const nextQuantity = Math.max(1, Number(input.value) || 1);
          input.value = nextQuantity;
          updateResponse(responseId, { quantity: nextQuantity });
          updateAmount();
        }
      }),
      createLedgerInput({
        value: response.greekbill || "",
        label: "Billing GreekBill account",
        placeholder: "Needs account",
        onChange: (input) => updateResponse(responseId, { greekbill: input.value.trim() })
      }),
      createLedgerInput({
        type: "number",
        value: price.toFixed(2),
        label: "Billing item price",
        min: "0",
        step: "0.01",
        onChange: (input) => {
          const nextPrice = Math.max(0, Number(input.value) || 0);
          input.value = nextPrice.toFixed(2);
          updateResponse(responseId, { price: nextPrice });
          updateAmount();
        }
      })
    ];

    cells.forEach((input) => {
      const cell = document.createElement("td");
      cell.append(input);
      row.append(cell);
    });

    const actionsCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "button danger tiny";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete billing row for ${response.name || response.itemName || "this response"}`);
    deleteButton.addEventListener("click", () => {
      const shouldDelete = confirm("Delete this response from the billing list?");
      if (!shouldDelete) {
        return;
      }

      responses = responses.filter((saved) => saved.id !== responseId);
      write(storageKeys.responses, responses);
      renderMerch();
      renderLedger();
    });
    actionsCell.append(deleteButton);

    row.append(amountCell, actionsCell);
    updateAmount();
    ledgerBody.append(row);
  });
}

function downloadCsv() {
  const rows = [
    ["Name", "Item", "Size", "Quantity", "GreekBill", "Price", "Amount"],
    ...responses
      .filter((response) => response.want === "yes")
      .map((response) => {
        const quantity = response.quantity || 1;
        const price = Number(response.price) || 0;
        return [response.name, response.itemName, response.size, quantity, response.greekbill, price, price * quantity];
      })
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "phi-sigma-rho-merch-ledger.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelector("#ideaForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const idea = {
    id: createId(),
    text: document.querySelector("#ideaText").value.trim(),
    image: document.querySelector("#ideaImage").value.trim(),
    link: document.querySelector("#ideaLink").value.trim(),
    archived: false
  };

  try {
    const savedIdea = sharedIdeasEndpoint ? await saveSharedIdea(idea) : idea;
    ideas.unshift(savedIdea);
    write(storageKeys.ideas, ideas);
    event.target.reset();
    renderIdeas();

    if (!sharedIdeasEndpoint) {
      alert("This suggestion was saved on this device. Add the Google Apps Script URL in config.js to make new suggestions visible to everyone.");
    }
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#unlockAdmin").addEventListener("click", () => {
  const code = document.querySelector("#adminCode").value.trim().toLowerCase();
  if (code !== "phirho") {
    alert("That passcode is not correct for this demo.");
    return;
  }

  document.querySelector("#adminLogin").classList.add("hidden");
  document.querySelector("#adminDashboard").classList.remove("hidden");
  adminUnlocked = true;
  renderIdeas();
  renderMerch();
});

document.querySelector("#merchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fileInput = document.querySelector("#merchFile");
  let asset = null;

  try {
    asset = await readFileAsDataUrl(fileInput.files[0]);
  } catch (error) {
    alert(error.message);
    return;
  }

  const item = {
    id: createId(),
    name: document.querySelector("#merchName").value.trim(),
    price: Number(document.querySelector("#merchPrice").value),
    description: document.querySelector("#merchDescription").value.trim(),
    image: "",
    asset,
    sizes: document.querySelector("#merchSizes").value.split(",").map((size) => size.trim()).filter(Boolean)
  };

  try {
    const savedItem = sharedIdeasEndpoint ? await saveSharedMerch(item) : item;
    merch.unshift(savedItem);
    write(storageKeys.merch, merch);
    event.target.reset();
    document.querySelector("#merchSizes").value = "XS, S, M, L, XL, XXL";
    renderMerch();

    if (!sharedIdeasEndpoint) {
      alert("This merch item was saved on this device. Add the Google Apps Script URL in config.js to make new merch visible to everyone.");
    }
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#downloadCsv").addEventListener("click", downloadCsv);

loadSharedIdeas();
loadSharedMerch();
renderLedger();
