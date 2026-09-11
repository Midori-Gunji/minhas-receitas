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
const auth = firebase.auth();
const receitasRef = db.collection('receitas');

// ---------- Elementos da tela de login/cadastro ----------
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const authTitulo = document.getElementById('auth-titulo');
const signupNome = document.getElementById('signup-nome');
const authEmail = document.getElementById('auth-email');
const authSenha = document.getElementById('auth-senha');
const authBtn = document.getElementById('auth-btn');
const authErro = document.getElementById('auth-erro');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleTexto = document.getElementById('auth-toggle-texto');
const logoutBtn = document.getElementById('logout-btn');
const saudacao = document.getElementById('saudacao');

let modoCadastro = false;

authToggleLink.addEventListener('click', function (e) {
  e.preventDefault();
  modoCadastro = !modoCadastro;
  authErro.textContent = '';

  if (modoCadastro) {
    authTitulo.textContent = 'Criar conta';
    signupNome.style.display = 'block';
    authBtn.textContent = 'Criar conta';
    authToggleTexto.textContent = 'Já tem conta?';
    authToggleLink.textContent = 'Entrar';
  } else {
    authTitulo.textContent = 'Entrar';
    signupNome.style.display = 'none';
    authBtn.textContent = 'Entrar';
    authToggleTexto.textContent = 'Ainda não tem conta?';
    authToggleLink.textContent = 'Criar conta';
  }
});

authBtn.addEventListener('click', function () {
  authErro.textContent = '';
  const email = authEmail.value.trim();
  const senha = authSenha.value;

  if (modoCadastro) {
    const nome = signupNome.value.trim();
    if (!nome) {
      authErro.textContent = 'Digite seu nome.';
      return;
    }
    auth.createUserWithEmailAndPassword(email, senha)
      .then((cred) => cred.user.updateProfile({ displayName: nome }))
      .catch((err) => { authErro.textContent = traduzErro(err.code); });
  } else {
    auth.signInWithEmailAndPassword(email, senha)
      .catch((err) => { authErro.textContent = traduzErro(err.code); });
  }
});

function traduzErro(code) {
  if (code === 'auth/email-already-in-use') return 'Esse e-mail já tem conta.';
  if (code === 'auth/weak-password') return 'A senha precisa ter pelo menos 6 caracteres.';
  if (code === 'auth/invalid-email') return 'E-mail inválido.';
  return 'E-mail ou senha incorretos.';
}

logoutBtn.addEventListener('click', function () {
  auth.signOut();
});

let usuarioAtual = null;

auth.onAuthStateChanged(function (user) {
  usuarioAtual = user;
  if (user) {
    loginScreen.style.display = 'none';
    appContent.style.display = 'block';
    saudacao.textContent = 'Bem-vinda(o), ' + (user.displayName || user.email) + '!';
    carregarReceitas();
  } else {
    loginScreen.style.display = 'flex';
    appContent.style.display = 'none';
  }
});

// ---------- Elementos do app de receitas ----------
const form = document.getElementById('recipe-form');
const list = document.getElementById('recipe-list');
const emptyMessage = document.getElementById('empty-message');
const filterBar = document.getElementById('filter-bar');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const starPicker = document.getElementById('star-picker');

const nomeInput = document.getElementById('nome');
const categoriaInput = document.getElementById('categoria');
const ingredientesInput = document.getElementById('ingredientes');
const modoInput = document.getElementById('modo');

let todasReceitas = [];
let minhasReceitasDocs = [];
let publicasDocs = [];
let filtroAtual = 'Todas';
let editandoId = null;
let dificuldadeSelecionada = 0;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Seletor de estrelas ----------
starPicker.addEventListener('click', function (event) {
  if (!event.target.classList.contains('star')) return;
  dificuldadeSelecionada = Number(event.target.dataset.valor);
  atualizarEstrelasForm();
});

function atualizarEstrelasForm() {
  document.querySelectorAll('#star-picker .star').forEach((star) => {
    star.classList.toggle('selected', Number(star.dataset.valor) <= dificuldadeSelecionada);
  });
}

function estrelasParaTexto(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// ---------- Carregar e mesclar receitas (minhas + públicas) ----------
function carregarReceitas() {
  receitasRef.where('autorId', '==', usuarioAtual.uid).onSnapshot((snapshot) => {
    minhasReceitasDocs = snapshot.docs;
    mesclarEExibir();
  });

  receitasRef.where('visibilidade', '==', 'publica').onSnapshot((snapshot) => {
    publicasDocs = snapshot.docs;
    mesclarEExibir();
  });
}

function mesclarEExibir() {
  const mapa = new Map();
  minhasReceitasDocs.forEach((doc) => mapa.set(doc.id, doc));
  publicasDocs.forEach((doc) => mapa.set(doc.id, doc));
  todasReceitas = Array.from(mapa.values());
  renderRecipes();
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

    const souAutor = usuarioAtual && recipe.autorId === usuarioAtual.uid;
    const botoesEdicao = souAutor
      ? `<button class="edit-btn" data-id="${doc.id}">Editar</button>
         <button class="delete-btn" data-id="${doc.id}">Remover</button>`
      : '';

    card.innerHTML = `
      <div class="card-actions">${botoesEdicao}</div>
      <span class="category-tag">${escapeHtml(recipe.categoria || 'Sem categoria')}</span>
      <span class="visibility-tag ${recipe.visibilidade}">${recipe.visibilidade === 'publica' ? 'Pública' : 'Privada'}</span>
      <h3>${escapeHtml(recipe.nome)}</h3>
      <p class="author-tag">Por ${escapeHtml(recipe.autorNome || 'Anônimo')}</p>
      <p class="stars-display">${estrelasParaTexto(recipe.dificuldade || 0)}</p>
      <p class="field-label">Ingredientes</p>
      <ul>${ingredientesHtml}</ul>
      <p class="field-label">Modo de preparo</p>
      <p>${escapeHtml(recipe.modo)}</p>
    `;

    list.appendChild(card);
  });
}

function entrarModoEdicao(id, recipe) {
  editandoId = id;
  nomeInput.value = recipe.nome;
  categoriaInput.value = recipe.categoria || '';
  ingredientesInput.value = recipe.ingredientes;
  modoInput.value = recipe.modo;
  dificuldadeSelecionada = recipe.dificuldade || 0;
  atualizarEstrelasForm();

  document.querySelector(`input[name="visibilidade"][value="${recipe.visibilidade}"]`).checked = true;

  submitBtn.textContent = 'Salvar alterações';
  cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sairModoEdicao() {
  editandoId = null;
  form.reset();
  dificuldadeSelecionada = 0;
  atualizarEstrelasForm();
  submitBtn.textContent = 'Salvar receita';
  cancelBtn.style.display = 'none';
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const nome = nomeInput.value.trim();
  const categoria = categoriaInput.value;
  const ingredientes = ingredientesInput.value.trim();
  const modo = modoInput.value.trim();
  const visibilidade = document.querySelector('input[name="visibilidade"]:checked').value;

  if (!nome || !categoria || !ingredientes || !modo) return;

  const dados = {
    nome,
    categoria,
    ingredientes,
    modo,
    visibilidade,
    dificuldade: dificuldadeSelecionada,
    autorId: usuarioAtual.uid,
    autorNome: usuarioAtual.displayName || usuarioAtual.email
  };

  if (editandoId) {
    receitasRef.doc(editandoId).update(dados);
  } else {
    dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
    receitasRef.add(dados);
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
