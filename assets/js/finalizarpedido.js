const LOJA = {
  lat: -21.7402847,
  lng: -43.3484057,
  numeroWhatsApp: "5532991994945", // Número atualizado do Hortifruti
  chavePix: "32991338251",
};

const RAIO_MAXIMO_KM = 10;
const TAXA_ENTREGA = 5.0;
const TAXA_CREDITO = 8.5;
let enderecoDentroDoRaio = false;

// Função para buscar os produtos salvos no navegador (localStorage)
function obterCarrinho() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

// Função para calcular o valor total dos produtos no carrinho
function calcularTotalCarrinho() {
  const cart = obterCarrinho();
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function formatarMoeda(valor) {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function obterFormaPagamentoSelecionada() {
  const selecionado = document.querySelector('input[name="forma-pagamento"]:checked');
  return selecionado ? selecionado.value : null;
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (graus) => (graus * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function buscarEnderecoPorCep(cep) {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const dados = await resposta.json();
    return dados.erro ? null : dados;
  } catch (erro) {
    console.error("Erro ao buscar CEP:", erro);
    return null;
  }
}

async function geocodificarEndereco(textoEndereco) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    textoEndereco
  )}`;
  try {
    const resposta = await fetch(url);
    const dados = await resposta.json();
    if (!dados.length) return null;
    return { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) };
  } catch (erro) {
    console.error("Erro ao geocodificar endereço:", erro);
    return null;
  }
}

async function verificarDistanciaEntrega() {
  const cepInput = document.querySelector("#cep");
  const ruaInput = document.querySelector("#rua");
  const numeroInput = document.querySelector("#numero");
  const avisoDiv = document.querySelector("#aviso-distancia");
  const cep = cepInput.value.trim();
  const rua = ruaInput.value.trim();
  const numero = numeroInput.value.trim();

  if (!cep || !rua || !numero) {
    enderecoDentroDoRaio = false;
    avisoDiv.className = "aviso-distancia";
    atualizarBotaoFinalizar();
    return;
  }

  avisoDiv.className = "aviso-distancia checando";
  avisoDiv.textContent = "Verificando o endereço de entrega...";

  const dadosCep = await buscarEnderecoPorCep(cep);
  const cidade = dadosCep ? `${dadosCep.localidade} - ${dadosCep.uf}` : "Juiz de Fora - MG";
  const enderecoCompleto = `${rua}, ${numero}, ${cidade}`;
  const coordenadas = await geocodificarEndereco(enderecoCompleto);

  if (!coordenadas) {
    enderecoDentroDoRaio = false;
    avisoDiv.className = "aviso-distancia erro";
    avisoDiv.textContent =
      "Não foi possível localizar esse endereço. Confira o CEP, a rua e o número e tente novamente.";
    atualizarBotaoFinalizar();
    return;
  }

  const distancia = calcularDistanciaKm(LOJA.lat, LOJA.lng, coordenadas.lat, coordenadas.lng);

  if (distancia > RAIO_MAXIMO_KM) {
    enderecoDentroDoRaio = false;
    avisoDiv.className = "aviso-distancia erro";
    avisoDiv.textContent = `Esse endereço está a cerca de ${distancia.toFixed(
      1
    )} km da loja. Só entregamos em até ${RAIO_MAXIMO_KM} km, então não é possível finalizar essa compra.`;
  } else {
    enderecoDentroDoRaio = true;
    avisoDiv.className = "aviso-distancia sucesso";
    avisoDiv.textContent = `Endereço a cerca de ${distancia.toFixed(
      1
    )} km da loja — dentro da área de entrega.`;
  }
  atualizarBotaoFinalizar();
}

function atualizarBotaoFinalizar() {
  const botao = document.querySelector("#btn-finalizar");
  if (botao) botao.disabled = !enderecoDentroDoRaio;
}

function atualizarDetalhePagamento() {
  document.querySelectorAll(".detalhe-pagamento").forEach((div) => (div.style.display = "none"));
  const formaSelecionada = obterFormaPagamentoSelecionada();
  if (formaSelecionada) {
    const alvo = document.querySelector(`#detalhe-${formaSelecionada}`);
    if (alvo) alvo.style.display = "block";
  }
  atualizarResumo();
}

function atualizarResumo() {
  const subtotal = calcularTotalCarrinho();
  const taxaCredito = obterFormaPagamentoSelecionada() === "credito" ? TAXA_CREDITO : 0;
  const total = subtotal + TAXA_ENTREGA + taxaCredito;

  document.querySelector("#resumo-subtotal").textContent = formatarMoeda(subtotal);
  document.querySelector("#resumo-entrega").textContent = formatarMoeda(TAXA_ENTREGA);
  document.querySelector("#resumo-total").textContent = formatarMoeda(total);
}

function montarMensagemPedido({ nome, cep, rua, numero, complemento, formaPagamento }) {
  const itens = obterCarrinho();
  const subtotal = calcularTotalCarrinho();
  const taxaCredito = formaPagamento === "credito" ? TAXA_CREDITO : 0;
  const total = subtotal + TAXA_ENTREGA + taxaCredito;

  const itensTexto = itens.length
    ? itens
        .map((item) => `- ${item.quantity}x ${item.name} (${formatarMoeda(item.price)})`)
        .join("\n")
    : "(carrinho vazio)";

  let detalhePagamento = "";

  if (formaPagamento === "dinheiro") {
    const precisaTroco = document.querySelector("#precisa-troco").value;
    detalhePagamento =
      precisaTroco === "sim"
        ? `Dinheiro - troco para R$ ${document.querySelector("#troco-para").value.trim()}`
        : "Dinheiro - sem necessidade de troco";
  } else if (formaPagamento === "pix") {
    detalhePagamento = `Pix - chave ${LOJA.chavePix} (comprovante será enviado aqui no WhatsApp)`;
  } else if (formaPagamento === "debito") {
    detalhePagamento = "Cartão de Débito - maquininha levada ao local";
  } else if (formaPagamento === "credito") {
    const parcelas = document.querySelector("#parcelas-credito").value;
    detalhePagamento = `Cartão de Crédito - ${parcelas}x (taxa de R$ 8,50 inclusa) - maquininha levada ao local`;
  }

  return (
    `*NOVO PEDIDO - Hortifruti e Mercearia da LILI*\n\n` +
    `*Cliente:* ${nome}\n` +
    `*Endereço:* ${rua}, ${numero}${complemento ? " - " + complemento : ""} - CEP ${cep}\n\n` +
    `*Itens:*\n${itensTexto}\n\n` +
    `Subtotal: ${formatarMoeda(subtotal)}\n` +
    `Entrega: ${formatarMoeda(TAXA_ENTREGA)}\n` +
    (taxaCredito ? `Taxa cartão de crédito: ${formatarMoeda(taxaCredito)}\n` : "") +
    `*Total: ${formatarMoeda(total)}*\n\n` +
    `*Forma de pagamento:* ${detalhePagamento}`
  );
}

function finalizarPedido(evento) {
  evento.preventDefault();

  if (!enderecoDentroDoRaio) {
    alert(
      `Não é possível finalizar: o endereço informado está fora da nossa área de entrega (até ${RAIO_MAXIMO_KM} km da loja).`
    );
    return;
  }

  const nome = document.querySelector("#Nome").value.trim();
  const cep = document.querySelector("#cep").value.trim();
  const rua = document.querySelector("#rua").value.trim();
  const numero = document.querySelector("#numero").value.trim();
  const complemento = document.querySelector("#complemento").value.trim();
  const formaPagamento = obterFormaPagamentoSelecionada();

  if (!nome || !cep || !rua || !numero) {
    alert("Preencha nome, CEP, rua e número antes de finalizar.");
    return;
  }

  if (!formaPagamento) {
    alert("Escolha uma forma de pagamento.");
    return;
  }

  const mensagem = montarMensagemPedido({ nome, cep, rua, numero, complemento, formaPagamento });
  const link = `https://wa.me/${LOJA.numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
  
  // Limpa o carrinho no navegador após enviar o pedido
  localStorage.removeItem("cart");

  window.open(link, "_blank");
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarResumo();
  atualizarBotaoFinalizar();

  document.querySelector("#cep").addEventListener("blur", async () => {
    const ruaInput = document.querySelector("#rua");
    const dados = await buscarEnderecoPorCep(document.querySelector("#cep").value);
    if (dados && !ruaInput.value.trim()) {
      ruaInput.value = dados.logradouro || "";
    }
  });

  document.querySelector("#numero").addEventListener("blur", verificarDistanciaEntrega);
  document.querySelector("#rua").addEventListener("blur", verificarDistanciaEntrega);

  document
    .querySelectorAll('input[name="forma-pagamento"]')
    .forEach((radio) => radio.addEventListener("change", atualizarDetalhePagamento));

  document.querySelector("#precisa-troco").addEventListener("change", (evento) => {
    document.querySelector("#campo-troco-valor").style.display =
      evento.target.value === "sim" ? "block" : "none";
  });

  document.querySelector("#parcelas-credito").addEventListener("change", atualizarResumo);
  document.querySelector("#form-finalizar").addEventListener("submit", finalizarPedido);
});