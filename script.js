// ATENÇÃO: Substitua pela sua chave do Google AI Studio (Cole exatamente entre as aspas)
const API_KEY = 'AIzaSyDFwczNq_VH5nn3EJ7423Qdy-J51WkB-Dk'; 

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

// NOVO CÉREBRO: Método Oficial Base64 (Suporta PDFs até 50MB) com formatação rigorosa
async function extrairTemasPDF() {
    const fileInput = document.getElementById('pdf-upload');
    const statusDiv = document.getElementById('status-extracao');
    const btnExtrair = document.getElementById('btn-extrair');

    if (fileInput.files.length === 0) {
        alert("Por favor, selecione um arquivo PDF primeiro.");
        return;
    }

    const file = fileInput.files[0];
    
    btnExtrair.disabled = true;
    btnExtrair.innerText = "Lendo PDF... (Isso pode levar alguns segundos)";
    statusDiv.style.color = "#0284c7";
    statusDiv.innerText = "Empacotando arquivo e enviando para a IA...";

    const reader = new FileReader();
    
    reader.onload = async function(event) {
        try {
            // Pega apenas o código do arquivo
            const base64Data = event.target.result.split(',')[1];
            
            const prompt = "Analise este material didático. Extraia uma lista com os principais assuntos e tópicos de História, Filosofia ou Sociologia presentes nele para servirem de tema de aula. Retorne APENAS os nomes dos tópicos separados por uma quebra de linha (Enter). Não escreva textos adicionais.";

            // Limpa espaços em branco invisíveis que causam o Erro 404
            const cleanApiKey = API_KEY.trim();

            // Formatação estritamente exigida pelo Google (camelCase)
            const requestBody = {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: file.type || "application/pdf",
                                data: base64Data
                            }
                        }
                    ]
                }]
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            // Se o Google não aprovar (Erros 400, 403, 404), ele cai aqui e nos diz o porquê
            if (!response.ok) {
                const erroServidor = await response.text();
                throw new Error(`Google recusou o arquivo (Status ${response.status}). Detalhe: ${erroServidor}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates.length > 0) {
                const textoGerado = data.candidates[0].content.parts[0].text;
                
                // Limpa e salva os temas gerados
                temasSugeridosPDF = textoGerado.split('\n').filter(tema => tema.trim() !== "");
                
                // Popula o datalist (Autocomplete)
                const datalist = document.getElementById('lista-temas-sugeridos');
                datalist.innerHTML = '';
                temasSugeridosPDF.forEach(tema => {
                    const option = document.createElement('option');
                    // Remove hífens ou asteriscos indesejados da lista da IA
                    option.value = tema.replace(/^[-*]\s*/, '').trim();
                    datalist.appendChild(option);
                });

                statusDiv.style.color = "green";
                statusDiv.innerText = `✅ Sucesso! Foram encontrados ${temasSugeridosPDF.length} tópicos no material. Vá para o próximo passo.`;
            } else {
                throw new Error("A IA leu o arquivo, mas não conseguiu extrair os textos.");
            }

        } catch (error) {
            console.error("Erro completo:", error);
            statusDiv.style.color = "red";
            statusDiv.innerText = `❌ ${error.message}`;
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
    
    if (!dataInicioInput || !dataFimInput) {
        alert("Por favor, preencha o Início e o Fim da Quinzena.");
        return;
    }

    const diasPermitidos = {};
    const checkboxes = document.querySelectorAll('.dia-chk:checked');
    
    if (checkboxes.length === 0) {
        alert("Selecione pelo menos um dia da semana do seu horário para esta turma.");
        return;
    }

    checkboxes.forEach(chk => {
        const dia = parseInt(chk.value);
        const duracao = document.getElementById(`duracao-${dia}`).value;
        diasPermitidos[dia] = duracao; 
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
            div.innerHTML = `
                <div class="aula-header">
                    <span>Aula ${contadorAulas} (${dataFormatada})</span>
                    <span class="tag-duracao">${tempoAula} minutos</span>
                </div>
                <input type="hidden" class="data-aula" value="${dataFormatada}">
                <input type="hidden" class="tempo-aula" value="${tempoAula}">
                
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

    if (contadorAulas === 1) {
        alert("Nenhuma aula encontrada para esses dias no período selecionado.");
    } else {
        document.getElementById('sessao-temas').style.display = 'block';
    }
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
    
    let periodoTexto = "";
    if(dataInicio && dataFim) {
        periodoTexto = `${formatarDataBR(dataInicio)} à ${formatarDataBR(dataFim)}`;
    }

    const aulasInputs = document.querySelectorAll('.aula-item');
    let cronograma = "";
    let temasPreenchidos = false;

    aulasInputs.forEach((el, index) => {
        const data = el.querySelector('.data-aula').value;
        const tempo = el.querySelector('.tempo-aula').value;
        const tema = el.querySelector('.tema-aula').value;
        
        let abordagem = el.querySelector('.abordagem-aula').value;
        if (abordagem === "Outra") {
            abordagem = el.querySelector('.abordagem-outra-aula').value;
        }

        if(tema) {
            cronograma += `Aula ${index + 1} (${data}): Tema - "${tema}" | Duração: ${tempo} minutos | Abordagem Metodológica a ser usada: ${abordagem}\n`;
            temasPreenchidos = true;
        }
    });

    if(!temasPreenchidos) {
        alert("Preencha o tema de pelo menos uma aula gerada.");
        return;
    }

    const btn = document.getElementById('btn-gerar');
    document.getElementById('sessao-resultado').style.display = 'block';
    const resultadoDiv = document.getElementById('resultado-plano');

    btn.innerText = "Gerando Plano... Aguarde";
    btn.disabled = true;
    resultadoDiv.innerText = "A Inteligência Artificial está escrevendo seu plano...";

    const prompt = `
    Aja como um Professor de Ciências Humanas do SESI. Escreva um Plano de Aula rigorosamente neste formato:

    Unidade Escolar: ${unidade}
    Professor: ${professor}
    Área de conhecimento: ${area}
    Série e Turma: ${turma}
    Bimestre: ${bimestre}
    Período: ${periodoTexto}
    Capítulo: ${capitulo}

    Habilidades:
    ${habilidades}

    Desenvolvimento da aula e recursos:
    Para o cronograma abaixo, crie os objetivos e divida estritamente em 3 Momentos cronometrados.
    MUITO IMPORTANTE: Adapte as dinâmicas, recursos e linguagem do texto de CADA AULA para refletir fielmente a Abordagem Metodológica indicada nela.
    
    ATENÇÃO AO TEMPO:
    - Se a aula for de 50 minutos: Momento 1 (10 min), Momento 2 (25 min), Momento 3 (15 min).
    - Se a aula for de 100 minutos: Momento 1 (20 min), Momento 2 (60 min), Momento 3 (20 min).
    
    Aulas solicitadas:
    ${cronograma}

    Estratégias e evidências de aprendizagem:
    Escreva um parágrafo que justifique a diversidade de abordagens metodológicas utilizadas e como elas engajam os alunos. Adicione como observação que o uso de fichas para resolução de questões modelo SSA/ENEM será uma constante.

    Formate a saída em Markdown claro, utilizando tabelas ou marcações em negrito que imitem um documento institucional padronizado.
    `;

    try {
        const cleanApiKey = API_KEY.trim();
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const erroServidor = await response.text();
            throw new Error(`Erro na API (${response.status}): ${erroServidor}`);
        }

        const data = await response.json();
        
        if(data.candidates && data.candidates.length > 0) {
            const textoGerado = data.candidates[0].content.parts[0].text;
            resultadoDiv.innerHTML = textoGerado.replace(/\n/g, '<br>');
        } else {
            resultadoDiv.innerText = "Erro ao gerar o plano. Verifique a chave da API.";
        }
    } catch (error) {
        console.error(error);
        resultadoDiv.innerText = `Erro de conexão com a IA: ${error.message}`;
    } finally {
        btn.innerText = "🤖 Gerar Plano de Aula Completo com IA";
        btn.disabled = false;
    }
}