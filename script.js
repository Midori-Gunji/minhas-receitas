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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderRecipes(docs) {
  list.innerHTML = '';
  emptyMessage.style.display = docs.length === 0 ? 'block' : 'none';

  docs.forEach((doc) => {
    const recipe = doc.data();
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const ingredientesHtml = recipe.ingredientes
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `<li>${escapeHtml(line)}</li>`)
      .join('');

    card.innerHTML = `
      <button class="delete-btn" data-id="${doc.id}">Remover</button>
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
  renderRecipes(snapshot.docs);
});

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const ingredientes = document.getElementById('ingredientes').value.trim();
  const modo = document.getElementById('modo').value.trim();

  if (!nome || !ingredientes || !modo) return;

  receitasRef.add({
    nome,
    ingredientes,
    modo,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  form.reset();
});

list.addEventListener('click', function (event) {
  if (!event.target.classList.contains('delete-btn')) return;
  const id = event.target.dataset.id;
  receitasRef.doc(id).delete();
});
