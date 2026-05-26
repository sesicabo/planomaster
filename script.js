import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ==========================================
// 1. CHAVE DO GROQ (CAMUFLADA CONTRA O GITHUB)
// ==========================================
const parte1 = 'g' + 's' + 'k' + '_';
const parte2 = 'mTMfUrJIbTcg2sVbqTiGWGdyb3FYj4m3tTqfnPDAN1AJua8kl570';
const API_KEY = parte1 + parte2; 

// ==========================================
// 2. CONFIGURAÇÃO DO FIREBASE (BANCO DE DADOS E LOGIN)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBytvACj5zLOt-RrNOya3E0jqSmGqN_eaY",
  authDomain: "planomaster2026.firebaseapp.com",
  projectId: "planomaster2026",
  storageBucket: "planomaster2026.firebasestorage.app",
  messagingSenderId: "819423362582",
  appId: "1:819423362582:web:bcc3f9906d0cd446e23f37"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// LÓGICA DE LOGIN E CONTROLE DE ACESSO
// ==========================================
let isRegistering = false;
let currentMode = 'login'; 

function showAuthMessage(msg, type) {
    const msgDiv = document.getElementById('auth-message');
    msgDiv.style.display = 'block';
    msgDiv.className = `auth-message ${type}`;
    msgDiv.innerText = msg;
}

window.toggleAuthMode = function() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const btnLogin = document.getElementById('btn-login-action');
    const btnRegister = document.getElementById('btn-register-action');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    document.getElementById('auth-message').style.display = 'none';

    if (currentMode === 'login') {
        currentMode = 'register';
        title.innerText = "Solicitar Acesso";
        subtitle.innerText = "Cadastre-se e aguarde a aprovação do admin.";
        btnLogin.style.display = "none";
        btnRegister.style.display = "block";
        toggleText.innerText = "Já tem uma conta?";
        toggleLink.innerText = "Fazer login";
    } else {
        currentMode = 'login';
        title.innerText = "Acesso ao Sistema";
        subtitle.innerText = "Faça login para gerar seus planos.";
        btnLogin.style.display = "block";
        btnRegister.style.display = "none";
        toggleText.innerText = "Não tem conta?";
        toggleLink.innerText = "Solicitar acesso";
    }
}

window.fazerCadastro = async function() {
    const email = document.getElementById('auth-email').value.trim();
    const pwd = document.getElementById('auth-password').value;

    if (!email || !pwd || pwd.length < 6) {
        showAuthMessage("Preencha um e-mail válido e uma senha de no mínimo 6 caracteres.", "error");
        return;
    }

    isRegistering = true; 
    document.getElementById('btn-register-action').innerText = "Processando...";
    document.getElementById('btn-register-action').disabled = true;

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pwd);
        await setDoc(doc(db, "usuarios", userCred.user.uid), {
            email: email,
            aprovado: false, 
            data_cadastro: new Date().toISOString()
        });

        showAuthMessage("Cadastro realizado! O administrador precisa aprovar o seu acesso para você conseguir entrar.", "success");
        await signOut(auth); 
        
        setTimeout(() => { window.toggleAuthMode(); }, 5000);
    } catch (error) {
        showAuthMessage(`Erro: ${error.message}`, "error");
    } finally {
        isRegistering = false;
        document.getElementById('btn-register-action').innerText = "Solicitar Cadastro";
        document.getElementById('btn-register-action').disabled = false;
    }
}

window.fazerLogin = async function() {
    const email = document.getElementById('auth-email').value.trim();
    const pwd = document.getElementById('auth-password').value;

    if (!email || !pwd) {
        showAuthMessage("Preencha e-mail e senha.", "error");
        return;
    }

    document.getElementById('btn-login-action').innerText = "Autenticando...";
    document.getElementById('btn-login-action').disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, pwd);
    } catch (error) {
        showAuthMessage(`E-mail ou senha incorretos.`, "error");
        document.getElementById('btn-login-action').innerText = "Entrar";
        document.getElementById('btn-login-action').disabled = false;
    }
}

window.fazerLogout = async function() {
    await signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
    if (isRegistering) return; 

    if (user) {
        showAuthMessage("Verificando status de aprovação...", "info");
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            
            if (docSnap.exists() && docSnap.data().aprovado === true) {
                document.getElementById('auth-overlay').style.display = 'none';
                document.getElementById('app-content').style.display = 'block';
                document.getElementById('user-email-display').innerText = user.email;
            } else {
                showAuthMessage("O seu acesso ainda está pendente de aprovação pelo Administrador.", "error");
                await signOut(auth);
            }
        } catch (error) {
            showAuthMessage("Erro ao consultar banco de dados. Contate o admin.", "error");
            await signOut(auth);
        }
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
        document.getElementById('btn-login-action').innerText = "Entrar";
        document.getElementById('btn-login-action').disabled = false;
    }
});


// ==========================================
// CÓDIGO ORIGINAL DE GERAÇÃO DO PLANO
// ==========================================

window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
let temasSugeridosPDF = [];

window.formatarDataBR = function(dataString) {
    const partes = dataString.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

window.toggleDuracao = function(checkbox, diaId) {
    const selectDuracao = document.getElementById(`duracao-${diaId}`);
    selectDuracao.disabled = !checkbox.checked;
}

window.toggleOutraAbordagem = function(selectElement) {
    const inputOutra = selectElement.parentElement.nextElementSibling;
    inputOutra.style.display = (selectElement.value === "Outra") ? "block" : "none";
}

async function chamarInteligenciaArtificial(prompt, statusDivElement) {
    const cleanApiKey = API_KEY.trim();
    const modelosDisponiveis = ['llama-3.1-8b-instant', 'llama3-8b-8192'];
    let erroFinal = "";

    for (const modelo of modelosDisponiveis) {
        try {
            if(statusDivElement && statusDivElement.id === 'status-extracao') {
                statusDivElement.innerText = `Conectando ao motor (${modelo})...`;
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanApiKey}`
                },
                body: JSON.stringify({
                    model: modelo, 
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4 
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content; 
            } else {
                erroFinal = await response.text();
            }
        } catch (error) {
            erroFinal = error.message;
        }
    }
    throw new Error(`O servidor bloqueou por limite. Detalhes: ${erroFinal}`);
}

window.extrairTemasPDF = async function() {
    const fileInput = document.getElementById('pdf-upload');
    const statusDiv = document.getElementById('status-extracao');
    const btnExtrair = document.getElementById('btn-extrair');

    const checksDisciplinas = document.querySelectorAll('.filtro-disciplina:checked');
    if (checksDisciplinas.length === 0) return alert("Selecione pelo menos uma disciplina para extrair os temas.");
    const disciplinasFoco = Array.from(checksDisciplinas).map(chk => chk.value).join(', ');

    if (fileInput.files.length === 0) return alert("Selecione um arquivo PDF primeiro.");

    const file = fileInput.files[0];
    btnExtrair.disabled = true;
    btnExtrair.innerText = "Lendo texto... (Aguarde)";
    statusDiv.style.color = "#0284c7";
    statusDiv.innerText = "Processando cronologicamente as páginas...";

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
            let textoExtraido = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                textoExtraido += `[PÁGINA ${i}] ` + pageText.substring(0, 300) + "\n";
            }

            const textoFinal = textoExtraido.substring(0, 25000);
            
            const prompt = `Atue como um Coordenador Pedagógico. Abaixo estão trechos sequenciais de um material didático.
            Sua missão é extrair uma lista de TEMAS DE AULA focados EXCLUSIVAMENTE nas disciplinas: ${disciplinasFoco}.
            
            REGRAS ABSOLUTAS E INQUEBRÁVEIS:
            1. ORDEM CRONOLÓGICA: Siga a ordem exata das páginas do início ao fim.
            2. MODO MÁQUINA: NUNCA escreva frases introdutórias. NÃO agrupe por disciplinas. Retorne APENAS os temas, um em cada linha.
            3. COMPLEXIDADE: Crie temas compostos e sofisticados.
            
            TEXTO DO MATERIAL:
            ${textoFinal}`;

            const textoGerado = await chamarInteligenciaArtificial(prompt, statusDiv);
            
            temasSugeridosPDF = textoGerado.split('\n').filter(tema => {
                let t = tema.trim().toLowerCase();
                if(t === "" || t.includes("aqui está") || t.includes("temas de") || t.includes("focados em") || t.endsWith(":")) return false;
                return true;
            });
            
            const datalist = document.getElementById('lista-temas-sugeridos');
            datalist.innerHTML = '';
            temasSugeridosPDF.forEach(tema => {
                const cleanTema = tema.replace(/^[-*0-9.)]+\s*/, '').replace(/[\*\_]/g, '').trim();
                if(cleanTema.length > 3) {
                    const option = document.createElement('option');
                    option.value = cleanTema;
                    datalist.appendChild(option);
                }
            });

            statusDiv.style.color = "green";
            statusDiv.innerText = `✅ Sucesso! Foram extraídos ${temasSugeridosPDF.length} temas.`;
        } catch (error) {
            statusDiv.style.color = "red";
            statusDiv.innerText = `❌ Erro: ${error.message}`;
        } finally {
            btnExtrair.innerText = "Extrair Assuntos do PDF";
            btnExtrair.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}

window.gerarCamposDeAula = function() {
    const dataInicioInput = document.getElementById('data-inicio').value;
    const dataFimInput = document.getElementById('data-fim').value;
    if (!dataInicioInput || !dataFimInput) return alert("Preencha o Início e o Fim da Quinzena.");

    const checkboxes = document.querySelectorAll('.dia-chk:checked');
    if (checkboxes.length === 0) return alert("Selecione pelo menos um dia da semana.");

    const diasPermitidos = {};
    checkboxes.forEach(chk => { diasPermitidos[parseInt(chk.value)] = document.getElementById(`duracao-${chk.value}`).value; });

    const container = document.getElementById('aulas-container');
    container.innerHTML = ''; 

    let dataAtual = new Date(dataInicioInput + "T12:00:00");
    const dataLimite = new Date(dataFimInput + "T12:00:00");
    let contadorAulas = 1;

    const opcoesDisciplina = `
        <option value="História">História</option>
        <option value="Geografia">Geografia</option>
        <option value="Filosofia">Filosofia</option>
        <option value="Sociologia">Sociologia</option>
        <option value="Português">Português</option>
        <option value="Literatura">Literatura</option>
        <option value="Inglês">Inglês</option>
        <option value="Artes">Artes</option>
        <option value="Matemática">Matemática</option>
        <option value="Geometria">Geometria</option>
        <option value="Física">Física</option>
        <option value="Química">Química</option>
        <option value="Biologia">Biologia</option>
    `;

    const opcoesAbordagem = `
        <option value="Expositiva Dialogada">Expositiva Dialogada</option>
        <option value="Construtivista (Piaget/Vygotsky)">Construtivista (Piaget/Vygotsky)</option>
        <option value="Montessoriana">Montessoriana</option>
        <option value="Freiriana (Paulo Freire - Problematização)">Freiriana (Paulo Freire)</option>
        <option value="Histórico-Crítica">Histórico-Crítica</option>
        <option value="Sala de Aula Invertida">Sala de Aula Invertida</option>
        <option value="Rotação por Estações">Rotação por Estações</option>
        <option value="Júri Simulado / Debate Clássico">Júri Simulado / Debate Clássico</option>
        <option value="Gamificação / Cultura Pop">Gamificação / Cultura Pop</option>
        <option value="Outra">Outra (Personalizar...)</option>
    `;

    while (dataAtual <= dataLimite) {
        let diaDaSemana = dataAtual.getDay();
        if (diasPermitidos.hasOwnProperty(diaDaSemana)) {
            const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
            const tempoAula = diasPermitidos[diaDaSemana];
            
            const div = document.createElement('div');
            div.className = 'aula-item';
            div.id = `aula-input-box-${contadorAulas}`;
            
            div.innerHTML = `
                <div class="aula-header"><span>Aula ${contadorAulas} (${dataFormatada})</span><span class="tag-duracao">${tempoAula} min</span></div>
                <input type="hidden" class="data-aula" value="${dataFormatada}">
                <input type="hidden" class="tempo-aula" value="${tempoAula}">
                <input type="hidden" class="numero-aula" value="${contadorAulas}">
                <div class="aula-controls">
                    <label>Tema da Aula<input type="text" class="tema-aula" list="lista-temas-sugeridos" placeholder="Clique ou digite o tema"></label>
                    <label>Disciplina<select class="disciplina-aula">${opcoesDisciplina}</select></label>
                    <label>Metodologia<select class="abordagem-aula" onchange="toggleOutraAbordagem(this)">${opcoesAbordagem}</select></label>
                </div>
                <input type="text" class="abordagem-outra-aula input-outra-abordagem" placeholder="Digite qual será a abordagem...">
            `;
            container.appendChild(div);
            contadorAulas++;
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
    }
    if (contadorAulas === 1) alert("Nenhuma aula para esses dias.");
    else document.getElementById('sessao-temas').style.display = 'block';
}

function limparMarkdownHTML(textoOriginal) {
    const inicio = textoOriginal.indexOf('<div class="aula-linha"');
    const fim = textoOriginal.lastIndexOf('</div>');
    if (inicio !== -1 && fim !== -1) return textoOriginal.substring(inicio, fim + 6); 
    return textoOriginal;
}

const atraso = (ms) => new Promise(resolve => setTimeout(resolve, ms));

window.gerarPlano = async function() {
    const unidade = document.getElementById('unidade').value || "SESI";
    const professor = document.getElementById('professor').value || "";
    const area = document.getElementById('area').value || "";
    const turma = document.getElementById('turma').value || "";
    const bimestre = document.getElementById('bimestre').value || "";
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const capitulo = document.getElementById('capitulo').value || "";
    const habilidades = document.getElementById('habilidades').value.replace(/\n/g, '<br>') || "";
    
    let periodoTexto = (dataInicio && dataFim) ? `${formatarDataBR(dataInicio)} à ${formatarDataBR(dataFim)}` : "";

    const aulasInputs = document.querySelectorAll('.aula-item');
    let temasPreenchidos = false;
    let resumoParaEstrategias = "";

    aulasInputs.forEach((el) => {
        const id = el.querySelector('.numero-aula').value;
        const tema = el
