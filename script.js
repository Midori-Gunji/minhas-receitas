// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDDs6DLjiliZZWXNIfE559DCk43BxDIybA",
  authDomain: "minhas-receitas-4e570.firebaseapp.com",
  projectId: "minhas-receitas-4e570",
  storageBucket: "minhas-receitas-4e570.firebasestorage.app",
  messagingSenderId: "1012306362675",
  appId: "1:1012306362675:web:53a5c4b02f465ab3d97e46"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const receitasRef = db.collection('receitas');

const form = document.getElementById('recipe-form');
const list = document.getElementById('recipe-list');
const emptyMessage = document.getElementById('empty-message');
const filterBar = document.getElementById('filter-bar');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');

const nomeInput = document.getElementById('nome');
const categoriaInput = document.getElementById('categoria');
const ingredientesInput = document.getElementById('ingredientes');
const modoInput = document.getElementById('modo');

let todasReceitas = [];
let filtroAtual = 'Todas';
let editandoId = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderRecipes() {
  const docsFiltrados = filtroAtual === 'Todas'
    ? todasReceitas
    : todasReceitas.filter(doc => doc.data().categoria === filtroAtual);

  list.innerHTML = '';
  emptyMessage.style.display = docsFiltrados.length === 0 ? 'block' : 'none';

  docsFiltrados.forEach((doc) => {
    const recipe = doc.data();
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const ingredientesHtml = recipe.ingredientes
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `<li>${escapeHtml(line)}</li>`)
      .join('');

    card.innerHTML = `
      <div class="card-actions">
        <button class="edit-btn" data-id="${doc.id}">Editar</button>
        <button class="delete-btn" data-id="${doc.id}">Remover</button>
      </div>
      <span class="category-tag">${escapeHtml(recipe.categoria || 'Sem categoria')}</span>
      <h3>${escapeHtml(recipe.nome)}</h3>
      <p class="field-label">Ingredientes</p>
      <ul>${ingredientesHtml}</ul>
      <p class="field-label">Modo de preparo</p>
      <p>${escapeHtml(recipe.modo)}</p>
    `;

    list.appendChild(card);
  });
}

// Escuta o banco de dados em tempo real: qualquer mudança atualiza a tela sozinha
receitasRef.orderBy('criadoEm', 'desc').onSnapshot((snapshot) => {
  todasReceitas = snapshot.docs;
  renderRecipes();
});

function entrarModoEdicao(id, recipe) {
  editandoId = id;
  nomeInput.value = recipe.nome;
  categoriaInput.value = recipe.categoria || '';
  ingredientesInput.value = recipe.ingredientes;
  modoInput.value = recipe.modo;

  submitBtn.textContent = 'Salvar alterações';
  cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sairModoEdicao() {
  editandoId = null;
  form.reset();
  submitBtn.textContent = 'Salvar receita';
  cancelBtn.style.display = 'none';
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const nome = nomeInput.value.trim();
  const categoria = categoriaInput.value;
  const ingredientes = ingredientesInput.value.trim();
  const modo = modoInput.value.trim();

  if (!nome || !categoria || !ingredientes || !modo) return;

  if (editandoId) {
    receitasRef.doc(editandoId).update({ nome, categoria, ingredientes, modo });
  } else {
    receitasRef.add({
      nome,
      categoria,
      ingredientes,
      modo,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  sairModoEdicao();
});

cancelBtn.addEventListener('click', sairModoEdicao);

list.addEventListener('click', function (event) {
  const id = event.target.dataset.id;
  if (!id) return;

  if (event.target.classList.contains('delete-btn')) {
    receitasRef.doc(id).delete();
  }

  if (event.target.classList.contains('edit-btn')) {
    const doc = todasReceitas.find(d => d.id === id);
    if (doc) entrarModoEdicao(id, doc.data());
  }
});

filterBar.addEventListener('click', function (event) {
  if (!event.target.classList.contains('filter-btn')) return;

  filtroAtual = event.target.dataset.filter;

  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  renderRecipes();
});
