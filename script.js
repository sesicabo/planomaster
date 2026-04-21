// ATENÇÃO: Cole sua CHAVE DO GROQ (começa com gsk_) aqui:
const API_KEY = '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'; 

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let temasSugeridosPDF = [];

function formatarDataBR(dataString) {
    const partes = dataString.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function toggleDuracao(checkbox, diaId) {
    const selectDuracao = document.getElementById(`duracao-${diaId}`);
    selectDuracao.disabled = !checkbox.checked;
}

function toggleOutraAbordagem(selectElement) {
    const inputOutra = selectElement.parentElement.nextElementSibling;
    if (selectElement.value === "Outra") {
        inputOutra.style.display = "block";
    } else {
        inputOutra.style.display = "none";
    }
}

async function chamarInteligenciaArtificial(prompt, statusDivElement) {
    const cleanApiKey = API_KEY.trim();
    // Utilizando o modelo econômico e ultra-rápido do Groq
    const modelosDisponiveis = ['llama-3.1-8b-instant', 'gemma2-9b-it'];
    let erroFinal = "";

    for (const modelo of modelosDisponiveis) {
        try {
            if(statusDivElement) statusDivElement.innerText = `Conectando ao motor (${modelo})...`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanApiKey}`
                },
                body: JSON.stringify({
                    model: modelo, 
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5 // Equilíbrio perfeito entre objetividade e criatividade
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

async function extrairTemasPDF() {
    const fileInput = document.getElementById('pdf-upload');
    const statusDiv = document.getElementById('status-extracao');
    const btnExtrair = document.getElementById('btn-extrair');

    if (fileInput.files.length === 0) {
        return alert("Por favor, selecione um arquivo PDF primeiro.");
    }

    const file = fileInput.files[0];
    btnExtrair.disabled = true;
    btnExtrair.innerText = "Lendo texto do material... (Aguarde)";
    statusDiv.style.color = "#0284c7";
    statusDiv.innerText = "Processando o arquivo internamente...";

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let textoExtraido = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                textoExtraido += pageText + "\n";
            }

            const textoFinal = textoExtraido.substring(0, 15000);
            const prompt = `Analise o texto deste material didático abaixo. Extraia uma lista com os principais assuntos e tópicos presentes nele para servirem de tema de aula de Ciências Humanas. Retorne APENAS os nomes dos tópicos separados por uma quebra de linha (Enter). Não escreva textos adicionais.\n\nTEXTO:\n${textoFinal}`;

            const textoGerado = await chamarInteligenciaArtificial(prompt, statusDiv);
            temasSugeridosPDF = textoGerado.split('\n').filter(tema => tema.trim() !== "");
            
            const datalist = document.getElementById('lista-temas-sugeridos');
            datalist.innerHTML = '';
            temasSugeridosPDF.forEach(tema => {
                const option = document.createElement('option');
                option.value = tema.replace(/^[-*]\s*/, '').trim();
                datalist.appendChild(option);
            });

            statusDiv.style.color = "green";
            statusDiv.innerText = `✅ Sucesso! Foram encontrados ${temasSugeridosPDF.length} tópicos no material. Vá para o próximo passo.`;

        } catch (error) {
            statusDiv.style.color = "red";
            statusDiv.innerText = `❌ Erro: ${error.message}`;
        } finally {
            btnExtrair.innerText = "📄 Extrair Assuntos do PDF";
            btnExtrair.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}

function gerarCamposDeAula() {
    const dataInicioInput = document.getElementById('data-inicio').value;
    const dataFimInput = document.getElementById('data-fim').value;
    
    if (!dataInicioInput || !dataFimInput) return alert("Preencha o Início e o Fim da Quinzena.");

    const diasPermitidos = {};
    const checkboxes = document.querySelectorAll('.dia-chk:checked');
    if (checkboxes.length === 0) return alert("Selecione pelo menos um dia da semana.");

    checkboxes.forEach(chk => {
        const dia = parseInt(chk.value);
        diasPermitidos[dia] = document.getElementById(`duracao-${dia}`).value; 
    });

    const container = document.getElementById('aulas-container');
    container.innerHTML = ''; 

    let dataAtual = new Date(dataInicioInput + "T12:00:00");
    const dataLimite = new Date(dataFimInput + "T12:00:00");
    let contadorAulas = 1;

    const opcoesAbordagem = `
        <option value="Expositiva Dialogada">Expositiva Dialogada</option>
        <option value="Construtivista (Piaget/Vygotsky)">Construtivista (Piaget/Vygotsky)</option>
        <option value="Montessoriana">Montessoriana</option>
        <option value="Freiriana (Paulo Freire - Problematização)">Freiriana (Paulo Freire)</option>
        <option value="Histórico-Crítica">Histórico-Crítica</option>
        <option value="Sala de Aula Invertida (Flipped Classroom)">Sala de Aula Invertida</option>
        <option value="Rotação por Estações">Rotação por Estações</option>
        <option value="Júri Simulado / Debate Clássico">Júri Simulado / Debate Clássico</option>
        <option value="Gamificação / Análise de Cultura Pop">Gamificação / Análise de Cultura Pop</option>
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
                <div class="aula-header">
                    <span>Aula ${contadorAulas} (${dataFormatada})</span>
                    <span class="tag-duracao">${tempoAula} minutos</span>
                </div>
                <input type="hidden" class="data-aula" value="${dataFormatada}">
                <input type="hidden" class="tempo-aula" value="${tempoAula}">
                <input type="hidden" class="numero-aula" value="${contadorAulas}">
                
                <div class="aula-controls">
                    <input type="text" class="tema-aula" list="lista-temas-sugeridos" placeholder="Clique para ver sugestões do PDF ou digite">
                    <select class="abordagem-aula" onchange="toggleOutraAbordagem(this)">
                        ${opcoesAbordagem}
                    </select>
                </div>
                <input type="text" class="abordagem-outra-aula" placeholder="Digite qual será a abordagem..." style="display: none; margin-top: 10px; width: 100%;">
            `;
            container.appendChild(div);
            contadorAulas++;
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
    }

    if (contadorAulas === 1) alert("Nenhuma aula encontrada para esses dias.");
    else document.getElementById('sessao-temas').style.display = 'block';
}

async function gerarPlano() {
    const unidade = document.getElementById('unidade').value;
    const professor = document.getElementById('professor').value;
    const area = document.getElementById('area').value;
    const turma = document.getElementById('turma').value;
    const bimestre = document.getElementById('bimestre').value;
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const capitulo = document.getElementById('capitulo').value;
    const habilidades = document.getElementById('habilidades').value;
    
    let periodoTexto = (dataInicio && dataFim) ? `${formatarDataBR(dataInicio)} à ${formatarDataBR(dataFim)}` : "";

    const aulasInputs = document.querySelectorAll('.aula-item');
    let cronogramaDetalhado = "";
    let temasPreenchidos = false;

    aulasInputs.forEach((el) => {
        const id = el.querySelector('.numero-aula').value;
        const data = el.querySelector('.data-aula').value;
        const tempo = el.querySelector('.tempo-aula').value;
        const tema = el.querySelector('.tema-aula').value;
        let abordagem = el.querySelector('.abordagem-aula').value;
        if (abordagem === "Outra") abordagem = el.querySelector('.abordagem-outra-aula').value;

        if(tema) {
            cronogramaDetalhado += `
            [INÍCIO DA AULA ID: ${id}]
            Data: ${data} | Tema: ${tema} | Duração: ${tempo} min | Abordagem: ${abordagem}
            [FIM DA AULA ID: ${id}]\n`;
            temasPreenchidos = true;
        }
    });

    if(!temasPreenchidos) return alert("Preencha o tema de pelo menos uma aula gerada.");

    const btn = document.getElementById('btn-gerar');
    document.getElementById('sessao-resultado').style.display = 'block';
    const resultadoDiv = document.getElementById('resultado-plano');

    btn.innerText = "Escrevendo e Diagramando o Plano... (Aguarde)";
    btn.disabled = true;

    const cabecalhoHTML = `
        <div class="cabecalho-institucional">
            <p><strong>Unidade Escolar:</strong> ${unidade}</p>
            <p><strong>Professor:</strong> ${professor}</p>
            <p><strong>Área de conhecimento:</strong> ${area}</p>
            <p><strong>Série e Turma:</strong> ${turma}</p>
            <p><strong>Bimestre:</strong> ${bimestre} | <strong>Período:</strong> ${periodoTexto}</p>
            <p><strong>Capítulo:</strong> ${capitulo}</p>
            <p><strong>Habilidades:</strong> ${habilidades}</p>
        </div>
    `;
    
    resultadoDiv.innerHTML = cabecalhoHTML + `<p style="text-align:center; color:#0056b3;">⏳ A Inteligência Artificial está escrevendo as aulas detalhadas...</p>`;

    const prompt = `Aja como um renomado Professor do SESI especialista em metodologias ativas. Baseado no cronograma abaixo, escreva o planejamento de CADA AULA.
    
    MUITO IMPORTANTE SOBRE A REDAÇÃO: 
    Para CADA MOMENTO da aula (Momento 1, 2 e 3), escreva textos sofisticados, didáticos e pedagógicos. Não seja preguiçoso na descrição, mas seja objetivo: use pequenos parágrafos ou um conjunto de frases curtas e diretas. Descreva claramente a ação do professor e do aluno, evidenciando como a "Abordagem Pedagógica" escolhida está sendo aplicada na prática em cada etapa da aula.
    
    CRONOGRAMA DE AULAS:
    ${cronogramaDetalhado}

    INSTRUÇÃO DE FORMATAÇÃO ESTRITA:
    Você DEVE retornar a resposta EXATAMENTE no formato de código HTML abaixo para CADA aula do cronograma. NÃO use blocos de markdown (como \`\`\`html). Retorne apenas as tags HTML puras:
    
    <div class="aula-gerada-card" id="resultado-aula-[ID DA AULA]">
        <div class="aula-gerada-esquerda">
            <h3>[DATA] - Aula [ID DA AULA]:<br>[TEMA]</h3>
            <p><strong>Objetivos:</strong> [Escreva os objetivos de forma direta e pedagógica...]</p>
            <button class="btn-refazer" onclick="refazerAula('[ID DA AULA]')">🔄 Refazer apenas esta aula</button>
        </div>
        <div class="aula-gerada-direita">
            <p><strong>Momento 1 - Acolhida/Provocação ([Tempo proporcional] min):</strong> [Descrição didática e objetiva...]</p>
            <p><strong>Momento 2 - Desenvolvimento/Prática ([Tempo proporcional] min):</strong> [Descrição didática e objetiva...]</p>
            <p><strong>Momento 3 - Evidência/Avaliação ([Tempo proporcional] min):</strong> [Descrição didática e objetiva...]</p>
        </div>
    </div>`;

    try {
        const textoGerado = await chamarInteligenciaArtificial(prompt, null);
        const htmlLimpo = textoGerado.replace(/```html/gi, '').replace(/```/gi, '').trim();
        resultadoDiv.innerHTML = cabecalhoHTML + htmlLimpo;
    } catch (error) {
        resultadoDiv.innerHTML = cabecalhoHTML + `<p style="color:red;">Erro ao gerar: ${error.message}</p>`;
    } finally {
        btn.innerText = "🤖 Gerar Plano de Aula Completo com IA";
        btn.disabled = false;
    }
}

// ==========================================
// FUNÇÃO MÁGICA: REFAZER UMA ÚNICA AULA
// ==========================================
window.refazerAula = async function(idAula) {
    const inputBox = document.getElementById(`aula-input-box-${idAula}`);
    if(!inputBox) return alert("Erro: Dados originais da aula não encontrados na tela.");
    
    const data = inputBox.querySelector('.data-aula').value;
    const tempo = inputBox.querySelector('.tempo-aula').value;
    const tema = inputBox.querySelector('.tema-aula').value;
    let abordagem = inputBox.querySelector('.abordagem-aula').value;
    if (abordagem === "Outra") abordagem = inputBox.querySelector('.abordagem-outra-aula').value;

    const cardElement = document.getElementById(`resultado-aula-${idAula}`);
    if(!cardElement) return;

    const btn = cardElement.querySelector('.btn-refazer');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Refazendo texto... Aguarde";
    btn.disabled = true;

    const prompt = `Aja como um renomado Professor do SESI. Reescreva o planejamento APENAS desta aula específica para melhorar a qualidade didática do texto.
    
    DADOS DA AULA:
    ID: ${idAula} | Data: ${data} | Tema: ${tema} | Duração: ${tempo} min | Abordagem Exigida: ${abordagem}
    
    INSTRUÇÃO DE REDAÇÃO: 
    Para CADA MOMENTO da aula (Momento 1, 2 e 3), escreva textos sofisticados, didáticos e pedagógicos. Não seja preguiçoso na descrição, mas seja objetivo: use pequenos parágrafos ou um conjunto de frases curtas e diretas. Descreva claramente a ação do professor e do aluno, evidenciando como a "Abordagem Pedagógica" exigida está sendo aplicada na prática.
    
    Retorne EXATAMENTE neste código HTML (sem usar \`\`\`html):
    <div class="aula-gerada-card" id="resultado-aula-${idAula}">
        <div class="aula-gerada-esquerda">
            <h3>${data} - Aula ${idAula}:<br>${tema}</h3>
            <p><strong>Objetivos:</strong> [Escreva os objetivos de forma direta e pedagógica...]</p>
            <button class="btn-refazer" onclick="refazerAula('${idAula}')">🔄 Refazer apenas esta aula</button>
        </div>
        <div class="aula-gerada-direita">
            <p><strong>Momento 1 - Acolhida/Provocação ([Tempo proporcional] min):</strong> [Descrição didática e objetiva...]</p>
            <p><strong>Momento 2 - Desenvolvimento/Prática ([Tempo proporcional] min):</strong> [Descrição didática e objetiva...]</p>
            <p><strong>Momento 3 - Evidência/Avaliação ([Tempo proporcional] min):</strong> [Descrição didática e objetiva...]</p>
        </div>
    </div>`;

    try {
        const textoGerado = await chamarInteligenciaArtificial(prompt, null);
        const htmlLimpo = textoGerado.replace(/```html/gi, '').replace(/```/gi, '').trim();
        cardElement.outerHTML = htmlLimpo; 
    } catch(e) {
        alert("Erro ao refazer a aula: " + e.message);
        btn.innerText = oldText;
        btn.disabled = false;
    }
}
