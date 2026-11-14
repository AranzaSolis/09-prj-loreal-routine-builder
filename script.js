/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProducts = [];
const descriptionModal = document.createElement("div");
descriptionModal.className = "description-modal";
descriptionModal.hidden = true;
descriptionModal.innerHTML = `
  <div class="description-modal-content" role="dialog" aria-modal="true" aria-labelledby="descriptionModalTitle">
    <button type="button" class="description-modal-close" aria-label="Close description">&times;</button>
    <h2 id="descriptionModalTitle"></h2>
    <p class="description-modal-text"></p>
  </div>
`;
document.body.appendChild(descriptionModal);
const descriptionModalTitle = descriptionModal.querySelector(
  "#descriptionModalTitle"
);
const descriptionModalText = descriptionModal.querySelector(
  ".description-modal-text"
);
const descriptionModalClose = descriptionModal.querySelector(
  ".description-modal-close"
);
let descriptionModalTrigger;

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${
      selectedProducts.some((selectedProduct) => selectedProduct.id === product.id)
        ? "selected"
        : ""
    }" data-product-id="${product.id}" tabindex="0" role="button" aria-pressed="${
        selectedProducts.some((selectedProduct) => selectedProduct.id === product.id)
      }">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button type="button" class="description-button">
          View description
        </button>
      </div>
    </div>
  `
    )
    .join("");

  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    const product = products.find(
      (item) => item.id === Number(card.dataset.productId)
    );

    card.addEventListener("click", () => {
      toggleProduct(product);
    });

    const descriptionButton = card.querySelector(".description-button");
    descriptionButton.addEventListener("click", (event) => {
      event.stopPropagation();
      descriptionModalTrigger = event.currentTarget;
      descriptionModalTitle.textContent = product.name;
      descriptionModalText.textContent = product.description;
      descriptionModal.hidden = false;
      descriptionModalClose.focus();
    });
    descriptionButton.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
  });
}

function closeDescriptionModal() {
  descriptionModal.hidden = true;
  if (descriptionModalTrigger) {
    descriptionModalTrigger.focus();
  }
}

descriptionModalClose.addEventListener("click", closeDescriptionModal);
descriptionModal.addEventListener("click", (event) => {
  if (event.target === descriptionModal) {
    closeDescriptionModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !descriptionModal.hidden) {
    closeDescriptionModal();
  }
});

/* Add a product to the selection, or remove it if it is already selected */
function toggleProduct(product) {
  const selectedProductIndex = selectedProducts.findIndex(
    (selectedProduct) => selectedProduct.id === product.id
  );

  if (selectedProductIndex === -1) {
    selectedProducts.push(product);
  } else {
    selectedProducts.splice(selectedProductIndex, 1);
  }

  updateSelectedProducts();
}

/* Show the products the user has selected */
function updateSelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts.length
    ? selectedProducts
        .map(
          (product) => `
            <div class="selected-product">
              <span>${product.brand} ${product.name}</span>
              <button type="button" class="selected-product-remove" data-product-id="${product.id}" aria-label="Remove ${product.name}">&times;</button>
            </div>
          `
        )
        .join("")
    : "<p>No products selected yet.</p>";

  selectedProductsList
    .querySelectorAll(".selected-product-remove")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const product = selectedProducts.find(
          (item) => item.id === Number(button.dataset.productId)
        );
        toggleProduct(product);
      });
    });

  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    const isSelected = selectedProducts.some(
      (product) => product.id === Number(card.dataset.productId)
    );
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", isSelected);
  });
}

updateSelectedProducts();

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
