// ATENÇÃO: Cole sua CHAVE DO GROQ aqui:
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
                    temperature: 0.5 
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

    if (fileInput.files.length === 0) return alert("Selecione um arquivo PDF primeiro.");

    const file = fileInput.files[0];
    btnExtrair.disabled = true;
    btnExtrair.innerText = "Lendo texto do material... (Aguarde)";
    statusDiv.style.color = "#0284c7";
    statusDiv.innerText = "Processando as páginas do arquivo...";

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let textoExtraido = "";

            // LEITURA DINÂMICA: Pega o resumo (topo) de TODAS as páginas para não perder nenhum assunto
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                // Extrai apenas os primeiros 1000 caracteres de cada página (onde ficam os títulos)
                textoExtraido += `[PÁGINA ${i}] ` + pageText.substring(0, 1000) + "\n";
            }

            // Limite de segurança que passa tranquilo na API do Groq
            const textoFinal = textoExtraido.substring(0, 40000);
            
            // PROMPT COORDENADOR: Exige temas sofisticados
            const prompt = `Atue como um Coordenador Pedagógico de Ciências Humanas (História, Filosofia, Sociologia).
            Abaixo estão os trechos principais de cada página de um capítulo de material didático.
            Sua missão é mapear os assuntos do capítulo inteiro e criar uma lista de TEMAS DE AULA.
            
            REGRAS OBRIGATÓRIAS:
            1. NÃO crie temas rasos, curtos ou genéricos (Exemplo ruim: "Idade Média" ou "Roma").
            2. CRIE temas compostos, abrangentes e sofisticados, que evidenciem a complexidade da aula (Exemplo bom: "Idade Média: Sociedade, Cultura e Religiosidade" ou "Império Romano: Da Monarquia à República e as Lutas Sociais").
            3. Cubra todo o conteúdo do texto (da página 1 até a última).
            4. Retorne APENAS a lista com os nomes dos temas, um por linha. Não use asteriscos, números ou traços no início. Não escreva textos adicionais.
            
            TEXTO DO MATERIAL:
            ${textoFinal}`;

            const textoGerado = await chamarInteligenciaArtificial(prompt, statusDiv);
            temasSugeridosPDF = textoGerado.split('\n').filter(tema => tema.trim() !== "");
            
            const datalist = document.getElementById('lista-temas-sugeridos');
            datalist.innerHTML = '';
            temasSugeridosPDF.forEach(tema => {
                // Limpa marcações que a IA possa tentar colocar
                const option = document.createElement('option');
                option.value = tema.replace(/^[-*0-9.)]+\s*/, '').replace(/[\*\_]/g, '').trim();
                datalist.appendChild(option);
            });

            statusDiv.style.color = "green";
            statusDiv.innerText = `✅ Sucesso! Foram encontrados ${temasSugeridosPDF.length} temas abrangentes e complexos em todo o capítulo.`;
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

    const checkboxes = document.querySelectorAll('.dia-chk:checked');
    if (checkboxes.length === 0) return alert("Selecione pelo menos um dia da semana.");

    const diasPermitidos = {};
    checkboxes.forEach(chk => { diasPermitidos[parseInt(chk.value)] = document.getElementById(`duracao-${chk.value}`).value; });

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
                    <input type="text" class="tema-aula" list="lista-temas-sugeridos" placeholder="Clique ou digite o tema">
                    <select class="abordagem-aula" onchange="toggleOutraAbordagem(this)">${opcoesAbordagem}</select>
                </div>
                <input type="text" class="abordagem-outra-aula" placeholder="Digite qual será a abordagem..." style="display: none; margin-top: 10px; width: 100%;">
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
    if (inicio !== -1 && fim !== -1) {
        return textoOriginal.substring(inicio, fim + 6); 
    }
    return textoOriginal;
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
    const habilidades = document.getElementById('habilidades').value.replace(/\n/g, '<br>');
    
    let periodoTexto = (dataInicio && dataFim) ? `${formatarDataBR(dataInicio)} à ${formatarDataBR(dataFim)}` : "";

    const aulasInputs = document.querySelectorAll('.aula-item');
    let temasPreenchidos = false;

    aulasInputs.forEach((el) => {
        if(el.querySelector('.tema-aula').value) temasPreenchidos = true;
    });

    if(!temasPreenchidos) return alert("Preencha o tema de pelo menos uma aula gerada.");

    const btn = document.getElementById('btn-gerar');
    document.getElementById('sessao-resultado').style.display = 'block';
    const resultadoDiv = document.getElementById('resultado-plano');

    btn.disabled = true;

    const cabecalhoHTML = `
        <div class="cabecalho-institucional">
            <div style="display: flex; justify-content: space-between;">
                <p><strong>Unidade Escolar:</strong> ${unidade}</p>
                <p><strong>Professor:</strong> ${professor}</p>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <p><strong>Área de conhecimento:</strong> ${area}</p>
                <p><strong>Série e Turma:</strong> ${turma}</p>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <p><strong>Bimestre:</strong> ${bimestre}</p>
                <p><strong>Período:</strong> ${periodoTexto}</p>
            </div>
            <p><strong>Capítulo:</strong> ${capitulo}</p>
        </div>
        <div class="titulo-sessao">Habilidades:</div>
        <div class="habilidades-caixa">${habilidades}</div>
        <div class="titulo-sessao">Desenvolvimento da aula e recursos que serão utilizados:</div>
        <div id="container-aulas-geradas"></div>
    `;
    
    resultadoDiv.innerHTML = cabecalhoHTML;
    const containerAulas = document.getElementById('container-aulas-geradas');

    for (const el of aulasInputs) {
        const id = el.querySelector('.numero-aula').value;
        const data = el.querySelector('.data-aula').value;
        const tempo = el.querySelector('.tempo-aula').value;
        const tema = el.querySelector('.tema-aula').value;
        let abordagem = el.querySelector('.abordagem-aula').value;
        if (abordagem === "Outra") abordagem = el.querySelector('.abordagem-outra-aula').value;

        if (tema) {
            btn.innerText = `⏳ Gerando Aula ${id}... (Aguarde)`;
            
            const prompt = `Aja como um Professor de Ciências Humanas. Escreva o plano APENAS para a aula solicitada abaixo.
            
            DIRETRIZ DE REDAÇÃO PEDAGÓGICA: 
            Seja didático e objetivo. Escreva pequenos parágrafos, contendo frases diretas para os Momentos 1, 2 e 3. Descreva a ação do professor e do aluno. Mostre como a abordagem exigida será aplicada.
            
            AULA A SER GERADA:
            Data: ${data} - Aula ${id}
            Tema: ${tema}
            Duração: ${tempo} min
            Abordagem Pedagógica: ${abordagem}

            REGRAS DE FORMATAÇÃO ESTRITA:
            Retorne EXATAMENTE no formato HTML abaixo. NÃO ESCREVA MENSAGENS ANTES OU DEPOIS. APENAS AS TAGS HTML PURAS.
            
            <div class="aula-linha" id="resultado-aula-${id}">
                <div class="aula-coluna-esq">
                    <strong>${data} - Aula ${id}:</strong><br>
                    ${tema}<br><br>
                    <strong>Objetivos:</strong><br>
                    <p>[Objetivos diretos...]</p>
                    <button class="btn-refazer" onclick="refazerAula('${id}')">🔄 Refazer apenas esta aula</button>
                </div>
                <div class="aula-coluna-dir">
                    <p><strong>Momento 1 - Acolhida/Provocação ([Tempo proporcional] min):</strong> [Sua descrição didática...]</p>
                    <p><strong>Momento 2 - Desenvolvimento/Prática ([Tempo proporcional] min):</strong> [Sua descrição didática...]</p>
                    <p><strong>Momento 3 - Evidência/Avaliação ([Tempo proporcional] min):</strong> [Sua descrição didática...]</p>
                </div>
            </div>`;

            try {
                const textoGerado = await chamarInteligenciaArtificial(prompt, null);
                const htmlFiltrado = limparMarkdownHTML(textoGerado); 
                containerAulas.innerHTML += htmlFiltrado; 
            } catch (error) {
                containerAulas.innerHTML += `<div class="aula-linha"><div class="aula-coluna-esq" style="color:red; width:100%;">Erro ao gerar a Aula ${id}: ${error.message}</div></div>`;
            }
        }
    }

    btn.innerText = "🤖 Gerar Plano de Aula Completo com IA";
    btn.disabled = false;
}

window.refazerAula = async function(idAula) {
    const inputBox = document.getElementById(`aula-input-box-${idAula}`);
    if(!inputBox) return alert("Dados originais não encontrados.");
    
    const data = inputBox.querySelector('.data-aula').value;
    const tempo = inputBox.querySelector('.tempo-aula').value;
    const tema = inputBox.querySelector('.tema-aula').value;
    let abordagem = inputBox.querySelector('.abordagem-aula').value;
    if (abordagem === "Outra") abordagem = inputBox.querySelector('.abordagem-outra-aula').value;

    const cardElement = document.getElementById(`resultado-aula-${idAula}`);
    if(!cardElement) return;

    const btn = cardElement.querySelector('.btn-refazer');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Refazendo... Aguarde";
    btn.disabled = true;

    const prompt = `Reescreva o planejamento APENAS desta aula para melhorar a qualidade pedagógica.
    AULA: ID ${idAula} | Data: ${data} | Tema: ${tema} | Duração: ${tempo} min | Abordagem Exigida: ${abordagem}
    
    DIRETRIZ DE REDAÇÃO: Escreva um pequeno parágrafo didático e objetivo para cada momento, descrevendo as ações em sala de aula de acordo com a abordagem.
    
    FORMATO OBRIGATÓRIO (RETORNE APENAS ISSO):
    <div class="aula-linha" id="resultado-aula-${idAula}">
        <div class="aula-coluna-esq">
            <strong>${data} - Aula ${idAula}:</strong><br>
            ${tema}<br><br>
            <strong>Objetivos:</strong><br>
            <p>[Objetivos...]</p>
            <button class="btn-refazer" onclick="refazerAula('${idAula}')">🔄 Refazer apenas esta aula</button>
        </div>
        <div class="aula-coluna-dir">
            <p><strong>Momento 1 - Acolhida/Provocação ([Tempo proporcional] min):</strong> [Descrição didática...]</p>
            <p><strong>Momento 2 - Desenvolvimento/Prática ([Tempo proporcional] min):</strong> [Descrição didática...]</p>
            <p><strong>Momento 3 - Evidência/Avaliação ([Tempo proporcional] min):</strong> [Descrição didática...]</p>
        </div>
    </div>`;

    try {
        const textoGerado = await chamarInteligenciaArtificial(prompt, null);
        const htmlFiltrado = limparMarkdownHTML(textoGerado);
        cardElement.outerHTML = htmlFiltrado; 
    } catch(e) {
        alert("Erro ao refazer a aula: " + e.message);
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

function exportarParaPDF() {
    const btnExportar = document.getElementById('btn-exportar');
    btnExportar.innerText = "⏳ Preparando PDF...";
    
    const elementoParaImprimir = document.getElementById('container-impressao');
    
    const botoes = elementoParaImprimir.querySelectorAll('.btn-refazer');
    botoes.forEach(btn => btn.style.display = 'none');

    const configuracao = {
        margin:       10, 
        filename:     'Plano_de_Aula_SESI.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(configuracao).from(elementoParaImprimir).save().then(() => {
        botoes.forEach(btn => btn.style.display = 'block');
        btnExportar.innerText = "📥 Exportar Plano para PDF";
    });
}
