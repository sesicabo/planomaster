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

async function extrairTemasPDF() {
    const fileInput = document.getElementById('pdf-upload');
    const statusDiv = document.getElementById('status-extracao');
    const btnExtrair = document.getElementById('btn-extrair');

    const checksDisciplinas = document.querySelectorAll('.filtro-disciplina:checked');
    if (checksDisciplinas.length === 0) return alert("Selecione pelo menos uma disciplina para extrair os temas.");
    const disciplinasFoco = Array.from(checksDisciplinas).map(chk => chk.value).join(', ');

    if (fileInput.files.length === 0) return alert("Selecione um arquivo PDF primeiro.");

    const file = fileInput.files[0];
    btnExtrair.disabled = true;
    btnExtrair.innerText = "Lendo texto do material... (Aguarde)";
    statusDiv.style.color = "#0284c7";
    statusDiv.innerText = "Processando cronologicamente as páginas do arquivo...";

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
                textoExtraido += `[PÁGINA ${i}] ` + pageText.substring(0, 300) + "\n";
            }

            const textoFinal = textoExtraido.substring(0, 25000);
            
            const prompt = `Atue como um Coordenador Pedagógico. Abaixo estão trechos sequenciais de um material didático.
            Sua missão é extrair uma lista de TEMAS DE AULA focados EXCLUSIVAMENTE nas disciplinas: ${disciplinasFoco}.
            
            REGRAS ABSOLUTAS E INQUEBRÁVEIS:
            1. ORDEM CRONOLÓGICA: Você DEVE seguir a ordem exata das páginas. O primeiro tema listado deve ser o do início do texto, e assim sucessivamente até o final.
            2. MODO MÁQUINA (ZERO CONVERSA): NUNCA escreva frases como "Aqui está a lista" ou "Temas de História:". NÃO agrupe por disciplinas. Retorne APENAS os temas diretos, um em cada linha.
            3. COMPLEXIDADE: Crie temas compostos e sofisticados (Ex: "Idade Média: Sociedade, Cultura e Religiosidade").
            
            TEXTO DO MATERIAL:
            ${textoFinal}`;

            const textoGerado = await chamarInteligenciaArtificial(prompt, statusDiv);
            
            temasSugeridosPDF = textoGerado.split('\n').filter(tema => {
                let t = tema.trim().toLowerCase();
                if(t === "" || t.includes("aqui está") || t.includes("temas de") || t.includes("focados em") || t.endsWith(":")) {
                    return false;
                }
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
            statusDiv.innerText = `✅ Sucesso! Foram extraídos ${temasSugeridosPDF.length} temas na ordem cronológica do documento.`;
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
                    <input type="text" class="tema-aula" list="lista-temas-sugeridos" placeholder="Clique ou digite o tema">
                    <select class="disciplina-aula">${opcoesDisciplina}</select>
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

const atraso = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function gerarPlano() {
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
        const tema = el.querySelector('.tema-aula').value;
        let abordagem = el.querySelector('.abordagem-aula').value;
        if (abordagem === "Outra") abordagem = el.querySelector('.abordagem-outra-aula').value;

        if(tema) {
            temasPreenchidos = true;
            resumoParaEstrategias += `Aula ${id}: Tema "${tema}" - Metodologia: ${abordagem}\n`;
        }
    });

    if(!temasPreenchidos) return alert("Preencha o tema de pelo menos uma aula gerada.");

    const btn = document.getElementById('btn-gerar');
    document.getElementById('sessao-resultado').style.display = 'block';
    const resultadoDiv = document.getElementById('resultado-plano');

    btn.disabled = true;

    // CABEÇALHO OFICIAL DO SESI APLICADO (FO-SES-EDU-038-00)
    const cabecalhoOficialHTML = `
        <div class="cabecalho-institucional">
            <div class="sesi-top-bar">
                <div class="sesi-top-blue"></div>
                <div class="sesi-top-green"></div>
            </div>
            <table class="tabela-cabecalho-oficial">
                <tr>
                    <td class="logo-sesi-box">
                        <span class="sesi-logo-text">SES<span class="sesi-logo-i">I</span></span>
                    </td>
                    <td class="titulo-centro-box">
                        <strong>FORMULÁRIO</strong><br>
                        Planejamento pedagógico
                    </td>
                    <td class="codigo-documento-box">
                        <strong>FO-SES-EDU-038-00</strong><br>
                    </td>
                </tr>
            </table>

            <table class="tabela-dados-aula">
                <tr>
                    <td colspan="2"><strong>Unidade Escolar:</strong> ${unidade}</td>
                    <td><strong>Professor:</strong> ${professor}</td>
                </tr>
                <tr>
                    <td colspan="2"><strong>Área de conhecimento:</strong> ${area}</td>
                    <td><strong>Série e Turma:</strong> ${turma}</td>
                </tr>
                <tr>
                    <td><strong>Bimestre:</strong> ${bimestre}</td>
                    <td><strong>Período:</strong> ${periodoTexto}</td>
                    <td><strong>Capítulo:</strong> ${capitulo}</td>
                </tr>
            </table>
        </div>

        <div class="titulo-sessao">Habilidades:</div>
        <div class="habilidades-caixa">${habilidades}</div>
        
        <div class="titulo-sessao">Desenvolvimento da aula e recursos que serão utilizados:</div>
        <div id="container-aulas-geradas"></div>
        <div id="container-estrategias-geradas"></div>

        <div class="sesi-footer-container" id="rodape-pdf" style="display:none;">
            <div class="sesi-seal">
                <div class="sesi-seal-inner">✓</div>
            </div>
            <div class="sesi-footer-text">
                <strong>CONTROLE NORMATIVO</strong><br>
                Planejamento pedagógico | FO-SES-EDU-038-00 | ${new Date().toLocaleDateString('pt-BR')}<br>
                Diretoria de Educação e Cultura
            </div>
            <div class="sesi-bottom-bar"></div>
        </div>
    `;
    
    resultadoDiv.innerHTML = cabecalhoOficialHTML;
    const containerAulas = document.getElementById('container-aulas-geradas');
    const containerEstrategias = document.getElementById('container-estrategias-geradas');

    for (const el of aulasInputs) {
        const id = el.querySelector('.numero-aula').value;
        const data = el.querySelector('.data-aula').value;
        const tempo = el.querySelector('.tempo-aula').value;
        const tema = el.querySelector('.tema-aula').value;
        const disciplina = el.querySelector('.disciplina-aula').value; 
        let abordagem = el.querySelector('.abordagem-aula').value;
        if (abordagem === "Outra") abordagem = el.querySelector('.abordagem-outra-aula').value;

        if (tema) {
            btn.innerText = `⏳ Gerando Aula ${id}... (Aguarde)`;
            const prompt = `Aja como um Professor Especialista de ${disciplina}. Escreva o plano APENAS para a aula abaixo.
            DIRETRIZ DE REDAÇÃO PEDAGÓGICA: Seja didático e objetivo. Escreva pequenos parágrafos descrevendo a ação do professor e aluno usando conceitos de ${disciplina}.
            
            AULA: Data: ${data} - Aula ${id} | Disciplina: ${disciplina} | Tema: ${tema} | Duração: ${tempo} min | Abordagem: ${abordagem}

            RETORNE APENAS O HTML ABAIXO PREENCHIDO:
            <div class="aula-linha" id="resultado-aula-${id}">
                <div class="aula-coluna-esq">
                    <strong>${data} - Aula ${id}:</strong><br>${tema} <br><em>(${disciplina})</em><br><br>
                    <strong>Objetivos:</strong><br><p>[Objetivos diretos...]</p>
                    <button class="btn-refazer" onclick="refazerAula('${id}')">🔄 Refazer apenas esta aula</button>
                </div>
                <div class="aula-coluna-dir">
                    <p><strong>Momento 1 - Acolhida/Provocação ([Tempo] min):</strong> [Descrição...]</p>
                    <p><strong>Momento 2 - Desenvolvimento/Prática ([Tempo] min):</strong> [Descrição...]</p>
                    <p><strong>Momento 3 - Evidência/Avaliação ([Tempo] min):</strong> [Descrição...]</p>
                </div>
            </div>`;

            try {
                const textoGerado = await chamarInteligenciaArtificial(prompt, null);
                const htmlFiltrado = limparMarkdownHTML(textoGerado); 
                containerAulas.innerHTML += htmlFiltrado; 
                await atraso(3000); 
            } catch (error) {
                containerAulas.innerHTML += `<div class="aula-linha"><div class="aula-coluna-esq" style="color:red; width:100%;">Erro: ${error.message}</div></div>`;
            }
        }
    }

    btn.innerText = `⏳ Finalizando Estratégias e Evidências...`;
    await atraso(3000); 
    
    const promptEstrategias = `Aja como um Coordenador Pedagógico. Crie a seção final de "Estratégias e evidências" baseada nas aulas geradas.
    RESUMO: ${resumoParaEstrategias}
    DIRETRIZ: Escreva 4 a 5 tópicos curtos. Inicie com um título em negrito.
    RETORNE APENAS O CÓDIGO HTML ABAIXO PREENCHIDO:
    <div class="sessao-estrategias">
        <div class="titulo-sessao">Estratégias e evidências de aprendizagem:</div>
        <div style="border:1px solid #000; border-top:none; padding:15px; margin-bottom: 20px; font-size:0.95em; line-height:1.5; background-color: #fff;">
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>[Título Curto]:</strong> [Descrição...]</li>
                <li style="margin-bottom: 8px;"><strong>[Título Curto]:</strong> [Descrição...]</li>
            </ul>
        </div>
    </div>`;

    try {
        const estrategiasGeradas = await chamarInteligenciaArtificial(promptEstrategias, null);
        containerEstrategias.innerHTML = estrategiasGeradas.replace(/```html/gi, '').replace(/```/gi, '').trim(); 
    } catch (error) {
        containerEstrategias.innerHTML = `<div style="color:red; padding:10px;">Erro: ${error.message}</div>`;
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
    const disciplina = inputBox.querySelector('.disciplina-aula').value;
    let abordagem = inputBox.querySelector('.abordagem-aula').value;
    if (abordagem === "Outra") abordagem = inputBox.querySelector('.abordagem-outra-aula').value;

    const cardElement = document.getElementById(`resultado-aula-${idAula}`);
    if(!cardElement) return;

    const btn = cardElement.querySelector('.btn-refazer');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Refazendo... Aguarde";
    btn.disabled = true;

    const prompt = `Aja como um Professor Especialista de ${disciplina}. Reescreva o planejamento APENAS desta aula de forma didática e objetiva.
    AULA: ID ${idAula} | Data: ${data} | Tema: ${tema} | Disciplina: ${disciplina} | Duração: ${tempo} min | Abordagem: ${abordagem}
    FORMATO OBRIGATÓRIO (RETORNE APENAS ISSO):
    <div class="aula-linha" id="resultado-aula-${idAula}">
        <div class="aula-coluna-esq">
            <strong>${data} - Aula ${idAula}:</strong><br>${tema} <br><em>(${disciplina})</em><br><br>
            <strong>Objetivos:</strong><br><p>[Objetivos...]</p>
            <button class="btn-refazer" onclick="refazerAula('${idAula}')">🔄 Refazer apenas esta aula</button>
        </div>
        <div class="aula-coluna-dir">
            <p><strong>Momento 1 - Acolhida/Provocação ([Tempo] min):</strong> [Descrição...]</p>
            <p><strong>Momento 2 - Desenvolvimento/Prática ([Tempo] min):</strong> [Descrição...]</p>
            <p><strong>Momento 3 - Evidência/Avaliação ([Tempo] min):</strong> [Descrição...]</p>
        </div>
    </div>`;

    try {
        const textoGerado = await chamarInteligenciaArtificial(prompt, null);
        cardElement.outerHTML = limparMarkdownHTML(textoGerado); 
    } catch(e) {
        alert("Erro ao refazer: " + e.message);
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

// OTIMIZADO PARA EXPORTAÇÃO A4 SEM CORTAR O LAYOUT E MOSTRANDO O RODAPÉ
function exportarParaPDF() {
    const btnExportar = document.getElementById('btn-exportar');
    btnExportar.innerText = "⏳ Preparando PDF...";
    
    const elementoParaImprimir = document.getElementById('container-impressao');
    const botoes = elementoParaImprimir.querySelectorAll('.btn-refazer');
    botoes.forEach(btn => btn.style.display = 'none');

    const rodape = elementoParaImprimir.querySelector('#rodape-pdf');
    if (rodape) rodape.style.display = 'flex'; // Exibe o rodapé lindão

    const configuracao = {
        margin:       [10, 10, 10, 10], 
        filename:     'Plano_de_Aula_SESI.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        // Força o "windowWidth" simulando uma tela grande para não desconfigurar o Flexbox
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 1000 }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] } // Respeita as regras do nosso CSS para não cortar
    };

    html2pdf().set(configuracao).from(elementoParaImprimir).save().then(() => {
        botoes.forEach(btn => btn.style.display = 'block');
        if (rodape) rodape.style.display = 'none'; // Esconde na tela de novo
        btnExportar.innerText = "📥 Exportar Plano para PDF";
    });
}
