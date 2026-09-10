// Todas as receitas ficam guardadas no navegador, na chave "minhas-receitas"
const STORAGE_KEY = 'minhas-receitas';

const form = document.getElementById('recipe-form');
const list = document.getElementById('recipe-list');
const emptyMessage = document.getElementById('empty-message');

function getRecipes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveRecipes(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function renderRecipes() {
  const recipes = getRecipes();
  list.innerHTML = '';

  emptyMessage.style.display = recipes.length === 0 ? 'block' : 'none';

  recipes.forEach((recipe, index) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const ingredientesHtml = recipe.ingredientes
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `<li>${escapeHtml(line)}</li>`)
      .join('');

    card.innerHTML = `
      <button class="delete-btn" data-index="${index}">Remover</button>
      <h3>${escapeHtml(recipe.nome)}</h3>
      <p class="field-label">Ingredientes</p>
      <ul>${ingredientesHtml}</ul>
      <p class="field-label">Modo de preparo</p>
      <p>${escapeHtml(recipe.modo)}</p>
    `;

    list.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const ingredientes = document.getElementById('ingredientes').value.trim();
  const modo = document.getElementById('modo').value.trim();

  if (!nome || !ingredientes || !modo) return;

  const recipes = getRecipes();
  recipes.unshift({ nome, ingredientes, modo });
  saveRecipes(recipes);

  form.reset();
  renderRecipes();
});

list.addEventListener('click', function (event) {
  if (!event.target.classList.contains('delete-btn')) return;

  const index = Number(event.target.dataset.index);
  const recipes = getRecipes();
  recipes.splice(index, 1);
  saveRecipes(recipes);
  renderRecipes();
});

renderRecipes();
