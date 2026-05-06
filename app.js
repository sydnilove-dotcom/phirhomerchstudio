const storageKeys = {
  ideas: "psr_merch_ideas",
  merch: "psr_merch_items",
  responses: "psr_merch_responses"
};
const maxUploadBytes = 2.5 * 1024 * 1024;

const seedIdeas = [
  {
    text: "Pearl-toned tote bag with a wine red ΦΣΡ monogram and tiny orchid charm.",
    image: "",
    link: "https://www.phisigmarho.org/"
  },
  {
    text: "Silver star pajama shorts for chapter retreats.",
    image: "",
    link: ""
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

const ideaList = document.querySelector("#ideaList");
const merchGrid = document.querySelector("#merchGrid");
const ledgerBody = document.querySelector("#ledgerBody");
const totalInterest = document.querySelector("#totalInterest");

function money(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
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
    linkElement.textContent = `View ${asset.name}`;
    linkElement.classList.remove("hidden");
    return;
  }

  if (asset?.type === "application/pdf") {
    imageElement.style.backgroundImage = "";
    imageElement.classList.add("pdf-preview");
    linkElement.href = asset.dataUrl;
    linkElement.textContent = `View ${asset.name}`;
    linkElement.classList.remove("hidden");
    return;
  }

  imageElement.style.backgroundImage = `url("${legacyImage || fallbackImage(item.name)}")`;
  linkElement.classList.add("hidden");
}

function renderIdeas() {
  const template = document.querySelector("#ideaTemplate");
  ideaList.replaceChildren();

  ideas.forEach((idea) => {
    const node = template.content.cloneNode(true);
    const media = node.querySelector(".idea-media");
    const paragraph = node.querySelector("p");
    const link = node.querySelector("a");

    media.style.backgroundImage = `url("${idea.image || fallbackImage(idea.text)}")`;
    paragraph.textContent = idea.text;

    if (idea.link) {
      link.href = idea.link;
    } else {
      link.remove();
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

    card.dataset.id = item.id;
    renderMerchAsset(image, assetLink, item);
    title.textContent = item.name;
    price.textContent = money(item.price);
    description.textContent = item.description;
    count.textContent = `${yesCount} sister${yesCount === 1 ? "" : "s"} marked yes`;

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
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        want: formData.get("want"),
        name: formData.get("name").trim(),
        size: formData.get("size"),
        greekbill: formData.get("greekbill").trim(),
        createdAt: new Date().toISOString()
      };

      responses = responses.filter((saved) => !(saved.itemId === item.id && saved.name.toLowerCase() === response.name.toLowerCase()));
      responses.unshift(response);
      write(storageKeys.responses, responses);
      renderMerch();
      renderLedger();
    });

    merchGrid.append(node);
  });

  totalInterest.textContent = responses.filter((response) => response.want === "yes").length;
}

function renderLedger() {
  const billable = responses.filter((response) => response.want === "yes");
  ledgerBody.replaceChildren();

  if (!billable.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">No yes responses yet.</td>`;
    ledgerBody.append(row);
    return;
  }

  billable.forEach((response) => {
    const row = document.createElement("tr");
    [response.name, response.itemName, response.size, response.greekbill || "Needs account", money(response.price)].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    ledgerBody.append(row);
  });
}

function downloadCsv() {
  const rows = [
    ["Name", "Item", "Size", "GreekBill", "Amount"],
    ...responses
      .filter((response) => response.want === "yes")
      .map((response) => [response.name, response.itemName, response.size, response.greekbill, response.price])
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

document.querySelector("#ideaForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const idea = {
    text: document.querySelector("#ideaText").value.trim(),
    image: document.querySelector("#ideaImage").value.trim(),
    link: document.querySelector("#ideaLink").value.trim()
  };
  ideas.unshift(idea);
  write(storageKeys.ideas, ideas);
  event.target.reset();
  renderIdeas();
});

document.querySelector("#unlockAdmin").addEventListener("click", () => {
  const code = document.querySelector("#adminCode").value.trim().toLowerCase();
  if (code !== "phirho") {
    alert("That passcode is not correct for this demo.");
    return;
  }

  document.querySelector("#adminLogin").classList.add("hidden");
  document.querySelector("#adminDashboard").classList.remove("hidden");
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
  merch.unshift(item);
  write(storageKeys.merch, merch);
  event.target.reset();
  document.querySelector("#merchSizes").value = "XS, S, M, L, XL, XXL";
  renderMerch();
});

document.querySelector("#downloadCsv").addEventListener("click", downloadCsv);

renderIdeas();
renderMerch();
renderLedger();
