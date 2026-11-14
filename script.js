/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const clearSelectionsButton = document.getElementById("clearSelections");

// The frontend calls the class Cloudflare Worker, which keeps the OpenAI key private.
const WORKER_URL = "https://solitary-firefly-f54b.aranza-solis-almanza.workers.dev/";
const SELECTED_PRODUCTS_KEY = "lorealSelectedProducts";
let allProducts = [];
let selectedProducts = [];
let conversationMessages = [];

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

// Show the products in the selected category as selectable cards.
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <button class="product-card ${
      selectedProducts.some((selectedProduct) => selectedProduct.id === product.id)
        ? "selected"
        : ""
    }" data-product-id="${product.id}" type="button">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </button>
  `
    )
    .join("");

  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const product = allProducts.find(
        (item) => item.id === Number(card.dataset.productId)
      );
      const alreadySelected = selectedProducts.some(
        (selectedProduct) => selectedProduct.id === product.id
      );

      selectedProducts = alreadySelected
        ? selectedProducts.filter(
            (selectedProduct) => selectedProduct.id !== product.id
          )
        : [...selectedProducts, product];

      saveSelectedProducts();
      displaySelectedProducts();
      displayProducts(products);
    });
  });
}

/* Create HTML for displaying product cards */
function displaySelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts.length
    ? selectedProducts
        .map(
          (product) => `
      <div class="selected-product">
        <span>${product.brand} ${product.name}</span>
        <button type="button" data-remove-product-id="${product.id}" aria-label="Remove ${product.name}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `
        )
        .join("")
    : "<p>No products selected yet.</p>";

  selectedProductsList
    .querySelectorAll("[data-remove-product-id]")
    .forEach((removeButton) => {
      removeButton.addEventListener("click", () => {
        const productId = Number(removeButton.dataset.removeProductId);
        selectedProducts = selectedProducts.filter(
          (product) => product.id !== productId
        );
        saveSelectedProducts();
        displaySelectedProducts();

        const categoryProducts = allProducts.filter(
          (product) => product.category === categoryFilter.value
        );
        displayProducts(categoryProducts);
      });
    });
}

// Save product IDs so the selection can be restored after a page reload.
function saveSelectedProducts() {
    localStorage.setItem(
      SELECTED_PRODUCTS_KEY,
      JSON.stringify(selectedProducts.map((product) => product.id))
    );
}

// Restore saved products after products.json has loaded.
function restoreSelectedProducts() {
    const savedProductIds = JSON.parse(
      localStorage.getItem(SELECTED_PRODUCTS_KEY) || "[]"
    );

    selectedProducts = allProducts.filter((product) =>
      savedProductIds.includes(product.id)
    );
    displaySelectedProducts();
}

// Render the conversation without showing the system instructions.
function displayChatHistory() {
    chatWindow.innerHTML = "";

    conversationMessages
      .filter((message, index) => message.role !== "system" && index !== 1)
      .forEach((message) => {
        const messageElement = document.createElement("div");
        messageElement.className =
          message.role === "user"
            ? "chat-message user-message"
            : "chat-message advisor-message";
        const label = document.createElement("strong");
        const content = document.createElement("span");

        label.className = "message-label";
        content.className = "message-content";
        label.textContent = message.role === "user" ? "You: " : "Beauty Advisor: ";
        content.textContent = message.content;
        messageElement.append(label, content);
        chatWindow.appendChild(messageElement);
      });

    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Load products once so selection works across category changes. */
loadProducts().then((products) => {
  allProducts = products;
  restoreSelectedProducts();
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (!allProducts.length) {
    allProducts = await loadProducts();
  }

  const selectedCategory = e.target.value;
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Remove all selected products from the page and localStorage. */
clearSelectionsButton.addEventListener("click", () => {
  selectedProducts = [];
  localStorage.removeItem(SELECTED_PRODUCTS_KEY);
  displaySelectedProducts();
  displayProducts(
    allProducts.filter((product) => product.category === categoryFilter.value)
  );
});

/* Send the conversation to the AI worker and return its reply. */
async function getAIReply() {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: conversationMessages,
      // Give the AI enough room to finish, while the prompt asks it to stay concise.
      max_completion_tokens: 1000,
      // A little randomness makes responses sound more natural and conversational.
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`The AI request failed (${response.status}).`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error("The AI returned an empty response.");
  }

  return reply;
}

/* Send only the selected product details to the AI worker. */
generateRoutineButton.addEventListener("click", async () => {
  if (!selectedProducts.length) {
    chatWindow.innerHTML = "<p>Please select at least one product first.</p>";
    return;
  }

  const productsForRoutine = selectedProducts.map(
    ({ name, brand, category, description }) => ({
      name,
      brand,
      category,
      description,
    })
  );

  conversationMessages = [
    {
      role: "system",
      content:
        "You are a friendly L'Oréal skincare and beauty advisor. When creating or discussing this routine, you must use only the products in the selected product list provided by the user. Never invent, add, substitute, or recommend another product, even as an alternative. Do not mention any unselected product by name. If the selected products are not enough for a step, explain that the step is not covered instead of suggesting another product. Answer follow-up questions about skincare, haircare, makeup, fragrance, and related beauty topics. Keep responses concise, usually under 400 words, but always finish the explanation and do not cut off mid-sentence. If a question is unrelated to L'Oréal products, routines, recommendations, beauty-related topics, etc, politely say that you can only help with beauty topics. Never recommend anything else out of these topics. Also make sure to sound energetic in the responses and friendly",
    },
    {
      role: "user",
      content: `Build a personalized routine using these selected products:\n${JSON.stringify(
        productsForRoutine
      )}`,
    },
  ];

  generateRoutineButton.disabled = true;
  chatWindow.innerHTML = "<p>Building your personalized routine...</p>";

  try {
    const routine = await getAIReply();
    conversationMessages.push({ role: "assistant", content: routine });
    displayChatHistory();
  } catch (error) {
    conversationMessages = [];
    chatWindow.innerHTML = `<p>Sorry, we couldn't generate your routine. ${error.message}</p>`;
  } finally {
    generateRoutineButton.disabled = false;
  }
});

/* Send follow-up questions with the complete conversation history. */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const question = userInput.value.trim();

  if (!conversationMessages.length) {
    chatWindow.innerHTML = "<p>Generate a routine first to start chatting.</p>";
    return;
  }

  if (!question) {
    return;
  }

  conversationMessages.push({ role: "user", content: question });
  userInput.value = "";
  displayChatHistory();
  chatWindow.insertAdjacentHTML(
    "beforeend",
    '<div class="chat-message advisor-message"><strong class="message-label">Beauty Advisor: </strong><span class="message-content">Thinking...</span></div>'
  );

  try {
    const reply = await getAIReply();
    conversationMessages.push({ role: "assistant", content: reply });
    displayChatHistory();
  } catch (error) {
    conversationMessages.pop();
    displayChatHistory();
    chatWindow.insertAdjacentHTML(
      "beforeend",
      `<div class="chat-message advisor-message"><strong class="message-label">Beauty Advisor: </strong><span class="message-content">Sorry, we couldn't answer your question. ${error.message}</span></div>`
    );
  }
});
