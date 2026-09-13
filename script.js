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
const comentariosRef = db.collection('comentarios');

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
const forgotPasswordLink = document.getElementById('forgot-password-link');
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
  if (code === 'auth/user-not-found') return 'Não existe conta com esse e-mail.';
  return 'E-mail ou senha incorretos.';
}

forgotPasswordLink.addEventListener('click', function (e) {
  e.preventDefault();
  authErro.textContent = '';
  const email = authEmail.value.trim();

  if (!email) {
    authErro.textContent = 'Digite seu e-mail no campo acima primeiro, depois clique em "Esqueci minha senha".';
    return;
  }

  auth.sendPasswordResetEmail(email)
    .then(() => {
      authErro.style.color = '#3a6b3a';
      authErro.textContent = 'Te mandamos um e-mail com um link pra criar uma senha nova. Confere sua caixa de entrada (e o spam)!';
    })
    .catch((err) => {
      authErro.style.color = '';
      authErro.textContent = traduzErro(err.code);
    });
});

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
const searchInput = document.getElementById('search-input');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const starPicker = document.getElementById('star-picker');

const nomeInput = document.getElementById('nome');
const categoriaInput = document.getElementById('categoria');
const tempoInput = document.getElementById('tempo');
const ingredientesInput = document.getElementById('ingredientes');
const modoInput = document.getElementById('modo');
const ordenarSelect = document.getElementById('ordenar-select');
const loadingMsg = document.getElementById('loading-msg');

let todasReceitas = [];
let minhasReceitasDocs = [];
let publicasDocs = [];
let filtroAtual = 'Todas';
let termoBusca = '';
let ordenacaoAtual = 'recente';
let editandoId = null;
let dificuldadeSelecionada = 0;
const comentariosAbertos = new Set();
let meusFavoritos = new Set();

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

  db.collection('favoritos').where('autorId', '==', usuarioAtual.uid).onSnapshot((snapshot) => {
    meusFavoritos = new Set(snapshot.docs.map(d => d.data().receitaId));
    renderRecipes();
  });
}

function mesclarEExibir() {
  const mapa = new Map();
  minhasReceitasDocs.forEach((doc) => mapa.set(doc.id, doc));
  publicasDocs.forEach((doc) => mapa.set(doc.id, doc));
  todasReceitas = Array.from(mapa.values());
  loadingMsg.style.display = 'none';
  renderRecipes();
}

function renderRecipes() {
  let docsFiltrados = todasReceitas;

  if (filtroAtual === 'Favoritas') {
    docsFiltrados = docsFiltrados.filter(doc => meusFavoritos.has(doc.id));
  } else if (filtroAtual !== 'Todas') {
    docsFiltrados = docsFiltrados.filter(doc => doc.data().categoria === filtroAtual);
  }

  if (termoBusca) {
    docsFiltrados = docsFiltrados.filter((doc) => {
      const recipe = doc.data();
      const texto = (recipe.nome + ' ' + recipe.ingredientes).toLowerCase();
      return texto.includes(termoBusca);
    });
  }

  docsFiltrados = [...docsFiltrados].sort((a, b) => {
    const ra = a.data();
    const rb = b.data();
    if (ordenacaoAtual === 'alfabetica') return ra.nome.localeCompare(rb.nome);
    if (ordenacaoAtual === 'dificuldade') return (rb.dificuldade || 0) - (ra.dificuldade || 0);
    const ta = ra.criadoEm ? ra.criadoEm.toMillis() : 0;
    const tb = rb.criadoEm ? rb.criadoEm.toMillis() : 0;
    return tb - ta;
  });

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

    const ehFavorita = meusFavoritos.has(doc.id);
    const botaoFavoritar = !souAutor
      ? `<button class="favorite-btn ${ehFavorita ? 'favorited' : ''}" data-id="${doc.id}">${ehFavorita ? '⭐ Favoritada' : '☆ Favoritar'}</button>`
      : '';

    const qtdComentarios = comentariosCache.has(doc.id) ? comentariosCache.get(doc.id).length : null;
    const textoComentarios = qtdComentarios !== null ? `💬 Comentários (${qtdComentarios})` : '💬 Comentários';

    const tempoHtml = recipe.tempo
      ? `<p class="tempo-tag">⏱ ${escapeHtml(recipe.tempo)}</p>`
      : '';

    card.innerHTML = `
      <div class="card-actions">${botoesEdicao}${botaoFavoritar}</div>
      <span class="category-tag">${escapeHtml(recipe.categoria || 'Sem categoria')}</span>
      <span class="visibility-tag ${recipe.visibilidade}">${recipe.visibilidade === 'publica' ? 'Pública' : 'Privada'}</span>
      <h3>${escapeHtml(recipe.nome)}</h3>
      <p class="author-tag">Por ${escapeHtml(recipe.autorNome || 'Anônimo')}</p>
      ${tempoHtml}
      <p class="stars-display">Dificuldade: <span class="stars-only">${estrelasParaTexto(recipe.dificuldade || 0)}</span></p>
      <p class="field-label">Ingredientes</p>
      <ul>${ingredientesHtml}</ul>
      <p class="field-label">Modo de preparo</p>
      <p>${escapeHtml(recipe.modo)}</p>
      <div class="comments-section">
        <button class="toggle-comments-btn" data-id="${doc.id}">${textoComentarios}</button>
        <button class="share-btn" data-id="${doc.id}">🔗 Compartilhar</button>

        <div class="comments-box" data-comments-for="${doc.id}" style="display:${comentariosAbertos.has(doc.id) ? 'block' : 'none'};">
          <div class="comments-list" data-list-for="${doc.id}"></div>
          <div class="comment-input-row">
            <input type="text" class="comment-input" data-comment-input-for="${doc.id}" placeholder="Deixe um comentário...">
            <button type="button" class="comment-send-btn" data-comment-send-for="${doc.id}">Enviar</button>
          </div>
        </div>
      </div>
    `;

    list.appendChild(card);
  });

  comentariosAbertos.forEach((id) => {
    if (typeof renderComentariosNaTela === 'function') renderComentariosNaTela(id);
  });
}

function entrarModoEdicao(id, recipe) {
  editandoId = id;
  nomeInput.value = recipe.nome;
  categoriaInput.value = recipe.categoria || '';
  tempoInput.value = recipe.tempo || '';
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
  const tempo = tempoInput.value.trim();
  const ingredientes = ingredientesInput.value.trim();
  const modo = modoInput.value.trim();
  const visibilidade = document.querySelector('input[name="visibilidade"]:checked').value;

  if (!nome || !categoria || !ingredientes || !modo) return;

  const dados = {
    nome,
    categoria,
    tempo,
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
    if (confirm('Tem certeza que quer apagar essa receita? Essa ação não pode ser desfeita.')) {
      receitasRef.doc(id).delete();
    }
  }

  if (event.target.classList.contains('edit-btn')) {
    const doc = todasReceitas.find(d => d.id === id);
    if (doc) entrarModoEdicao(id, doc.data());
  }
});

searchInput.addEventListener('input', function () {
  termoBusca = searchInput.value.trim().toLowerCase();
  renderRecipes();
});

ordenarSelect.addEventListener('change', function () {
  ordenacaoAtual = ordenarSelect.value;
  renderRecipes();
});

filterBar.addEventListener('click', function (event) {
  if (!event.target.classList.contains('filter-btn')) return;

  filtroAtual = event.target.dataset.filter;

  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  renderRecipes();
});

// ---------- Comentários ----------
const comentariosOuvindo = new Set();
const comentariosCache = new Map();

function renderComentariosNaTela(id) {
  const listaEl = document.querySelector(`.comments-list[data-list-for="${id}"]`);
  if (!listaEl) return;
  const comentarios = comentariosCache.get(id) || [];
  listaEl.innerHTML = comentarios.map((c) => {
    const souAutorComentario = usuarioAtual && c.autorId === usuarioAtual.uid;
    const botaoApagar = souAutorComentario
      ? `<button class="delete-comment-btn" data-comment-id="${c.id}">Apagar</button>`
      : '';
    return `<p class="comment-item"><strong>${escapeHtml(c.autorNome)}:</strong> ${escapeHtml(c.texto)} ${botaoApagar}</p>`;
  }).join('') || '<p class="comment-empty">Nenhum comentário ainda.</p>';
}

list.addEventListener('click', function (event) {
  if (event.target.classList.contains('toggle-comments-btn')) {
    const id = event.target.dataset.id;
    const box = document.querySelector(`.comments-box[data-comments-for="${id}"]`);
    const abrindo = box.style.display === 'none';
    box.style.display = abrindo ? 'block' : 'none';

    if (abrindo) {
      comentariosAbertos.add(id);
      renderComentariosNaTela(id);
    } else {
      comentariosAbertos.delete(id);
    }

    if (!comentariosOuvindo.has(id)) {
      comentariosOuvindo.add(id);
      comentariosRef.where('receitaId', '==', id).orderBy('criadoEm', 'asc').onSnapshot((snapshot) => {
        comentariosCache.set(id, snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        renderComentariosNaTela(id);
        const btn = document.querySelector(`.toggle-comments-btn[data-id="${id}"]`);
        if (btn) btn.textContent = `💬 Comentários (${snapshot.docs.length})`;
      });
    }
  }

  if (event.target.classList.contains('comment-send-btn')) {
    const id = event.target.dataset.commentSendFor;
    const input = document.querySelector(`.comment-input[data-comment-input-for="${id}"]`);
    const texto = input.value.trim();
    if (!texto) return;

    comentariosRef.add({
      receitaId: id,
      texto,
      autorId: usuarioAtual.uid,
      autorNome: usuarioAtual.displayName || usuarioAtual.email,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = '';
  }

  if (event.target.classList.contains('delete-comment-btn')) {
    const commentId = event.target.dataset.commentId;
    if (confirm('Apagar esse comentário?')) {
      comentariosRef.doc(commentId).delete();
    }
  }
});

// ---------- Favoritar e compartilhar ----------
list.addEventListener('click', function (event) {
  if (event.target.classList.contains('favorite-btn')) {
    const id = event.target.dataset.id;
    const favId = usuarioAtual.uid + '_' + id;
    const favRef = db.collection('favoritos').doc(favId);

    if (meusFavoritos.has(id)) {
      favRef.delete();
    } else {
      favRef.set({ autorId: usuarioAtual.uid, receitaId: id });
    }
  }

  if (event.target.classList.contains('share-btn')) {
    const id = event.target.dataset.id;
    const url = window.location.origin + window.location.pathname + '#receita-' + id;
    navigator.clipboard.writeText(url).then(() => {
      event.target.textContent = '✅ Link copiado!';
      setTimeout(() => { event.target.textContent = '🔗 Compartilhar'; }, 2000);
    });
  }
});

// ---------- Chat de sugestão por ingredientes ----------
const chatMensagens = document.getElementById('chat-mensagens');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

const STOPWORDS = ['tenho','tenho','e','com','um','uma','uns','umas','de','em','casa','so','somente',
  'para','pra','quero','algo','que','leve','rapido','ai','ia','por','favor','pode','poderia','ser',
  'fazer','uso','usar','tem','o','a','os','as','no','na','nos','nas','do','da','dos','das','me',
  'ajuda','uma','receita','preciso'];

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extrairPalavrasChave(texto) {
  return normalizar(texto)
    .split(/[^a-zà-ú]+/)
    .filter(p => p.length > 2 && !STOPWORDS.includes(p));
}

function adicionarMensagemChat(texto, autor) {
  const div = document.createElement('div');
  div.className = autor === 'user' ? 'chat-msg chat-user' : 'chat-msg chat-bot';
  div.innerHTML = texto;
  chatMensagens.appendChild(div);
  chatMensagens.scrollTop = chatMensagens.scrollHeight;
}

let ultimasCandidatas = [];
let ultimoIndiceCandidata = 0;

function formatarReceitaChat(recipe) {
  const ingredientesHtml = recipe.ingredientes
    .split('\n')
    .filter(l => l.trim() !== '')
    .map(l => `<li>${escapeHtml(l)}</li>`)
    .join('');

  return `<strong>${escapeHtml(recipe.nome)}</strong> 🎉<br>
    <p class="field-label" style="margin-top:8px;">Ingredientes</p>
    <ul>${ingredientesHtml}</ul>
    <p class="field-label">Modo de preparo</p>
    <p>${escapeHtml(recipe.modo)}</p>`;
}

function buscarReceitaPorIngredientes(mensagem) {
  const normalizada = normalizar(mensagem).trim();

  if (['outra', 'outra opcao', 'outra receita', 'proxima', 'mais uma'].includes(normalizada)) {
    if (ultimasCandidatas.length === 0) {
      return 'Ainda não fizemos nenhuma busca. Me conta o que você tem em casa primeiro! 😊';
    }
    ultimoIndiceCandidata++;
    if (ultimoIndiceCandidata >= ultimasCandidatas.length) {
      return 'Essas eram todas as receitas que encontrei com esses ingredientes! Quer buscar com outros ingredientes?';
    }
    return 'Encontrei essa também: ' + formatarReceitaChat(ultimasCandidatas[ultimoIndiceCandidata].recipe);
  }

  const palavras = extrairPalavrasChave(mensagem);

  if (palavras.length === 0) {
    return 'Me conta pelo menos um ingrediente que você tem, tipo "tenho ovos e leite" 😊';
  }

  const candidatas = todasReceitas.map((doc) => {
    const recipe = doc.data();
    const textoReceita = normalizar(recipe.nome + ' ' + recipe.ingredientes);
    const acertos = palavras.filter(p => textoReceita.includes(p));
    return { doc, recipe, acertos: acertos.length };
  }).filter(c => c.acertos > 0);

  candidatas.sort((a, b) => b.acertos - a.acertos);
  ultimasCandidatas = candidatas;
  ultimoIndiceCandidata = 0;

  if (candidatas.length === 0) {
    return 'Não encontrei nenhuma receita salva com esses ingredientes. Que tal cadastrar uma nova? 🍳';
  }

  let resposta = 'Encontrei essa pra você: ' + formatarReceitaChat(candidatas[0].recipe);
  if (candidatas.length > 1) {
    resposta += '<br><br><em>Digite "outra" se quiser ver mais uma opção.</em>';
  }
  return resposta;
}

function enviarMensagemChat() {
  const texto = chatInput.value.trim();
  if (!texto) return;

  adicionarMensagemChat(escapeHtml(texto), 'user');
  chatInput.value = '';

  setTimeout(() => {
    const resposta = buscarReceitaPorIngredientes(texto);
    adicionarMensagemChat(resposta, 'bot');
  }, 300);
}

chatSendBtn.addEventListener('click', enviarMensagemChat);
chatInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') enviarMensagemChat();
});
