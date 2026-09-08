var LOJA = {
  lat: -21.7402847,
  lng: -43.3484057,
  numeroWhatsApp: "5532991994945",
  chavePix: "32991338251"
};

var RAIO_MAXIMO_KM = 6;
var TAXA_ENTREGA = 5.0;
var TAXA_CREDITO = 8.5;
var enderecoDentroDoRaio = false;

function obterCarrinho() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function calcularTotalCarrinho() {
  var cart = obterCarrinho();
  return cart.reduce(function(total, item) {
    return total + item.price * item.quantity;
  }, 0);
}

function formatarMoeda(valor) {
  return "R$ " + valor.toFixed(2).replace(".", ",");
}

function obterFormaPagamentoSelecionada() {
  var selecionado = document.querySelector('input[name="forma-pagamento"]:checked');
  return selecionado ? selecionado.value : null;
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var toRad = function(graus) { return (graus * Math.PI) / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function buscarEnderecoPorCep(cep) {
  var cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;

  try {
    var resposta = await fetch("https://viacep.com.br/ws/" + cepLimpo + "/json/");
    var dados = await resposta.json();
    return dados.erro ? null : dados;
  } catch (erro) {
    console.error("Erro ao buscar CEP:", erro);
    return null;
  }
}

async function geocodificarEndereco(textoEndereco) {
  var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(textoEndereco);
  try {
    var resposta = await fetch(url);
    var dados = await resposta.json();
    if (!dados.length) return null;
    return { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) };
  } catch (erro) {
    console.error("Erro ao geocodificar endereço:", erro);
    return null;
  }
}

async function verificarDistanciaEntrega() {
  var cepInput = document.querySelector("#cep");
  var ruaInput = document.querySelector("#rua");
  var numeroInput = document.querySelector("#numero");
  var avisoDiv = document.querySelector("#aviso-distancia");
  
  if (!cepInput || !ruaInput || !numeroInput || !avisoDiv) return;

  var cep = cepInput.value.trim();
  var rua = ruaInput.value.trim();
  var numero = numeroInput.value.trim();

  if (!cep || !rua || !numero) {
    enderecoDentroDoRaio = false;
    avisoDiv.className = "aviso-distancia";
    avisoDiv.textContent = "";
    atualizarBotaoFinalizar();
    return;
  }

  avisoDiv.className = "aviso-distancia checando";
  avisoDiv.textContent = "Verificando o endereço de entrega...";

  var dadosCep = await buscarEnderecoPorCep(cep);
  var cidade = dadosCep ? (dadosCep.localidade + " - " + dadosCep.uf) : "Juiz de Fora - MG";
  var enderecoCompleto = rua + ", " + numero + ", " + cidade;
  var coordenadas = await geocodificarEndereco(enderecoCompleto);

  if (!coordenadas) {
    enderecoDentroDoRaio = false;
    avisoDiv.className = "aviso-distancia erro";
    avisoDiv.textContent = "Não foi possível localizar esse endereço. Confira o CEP, a rua e o número e tente novamente.";
    atualizarBotaoFinalizar();
    return;
  }

  var distancia = calcularDistanciaKm(LOJA.lat, LOJA.lng, coordenadas.lat, coordenadas.lng);

  if (distancia > RAIO_MAXIMO_KM) {
    enderecoDentroDoRaio = false;
    avisoDiv.className = "aviso-distancia erro";
    avisoDiv.textContent = "Endereço não pode ser entregue. Este local está a " + distancia.toFixed(1) + " km da loja e realizamos entregas apenas em até " + RAIO_MAXIMO_KM + " km.";
  } else {
    enderecoDentroDoRaio = true;
    avisoDiv.className = "aviso-distancia sucesso";
    avisoDiv.textContent = "Endereço a cerca de " + distancia.toFixed(1) + " km da loja — dentro da área de entrega.";
  }
  atualizarBotaoFinalizar();
}

function atualizarBotaoFinalizar() {
  var botao = document.querySelector("#btn-finalizar");
  if (botao) {
    botao.disabled = !enderecoDentroDoRaio;
  }
}

function atualizarDetalhePagamento() {
  document.querySelectorAll(".detalhe-pagamento").forEach(function(div) {
    div.style.display = "none";
  });
  var formaSelecionada = obterFormaPagamentoSelecionada();
  if (formaSelecionada) {
    var alvo = document.querySelector("#detalhe-" + formaSelecionada);
    if (alvo) alvo.style.display = "block";
  }
  atualizarResumo();
}

function atualizarResumo() {
  var subtotal = calcularTotalCarrinho();
  var taxaCredito = obterFormaPagamentoSelecionada() === "credito" ? TAXA_CREDITO : 0;
  var total = subtotal + TAXA_ENTREGA + taxaCredito;

  var elSubtotal = document.querySelector("#resumo-subtotal");
  var elEntrega = document.querySelector("#resumo-entrega");
  var elTotal = document.querySelector("#resumo-total");

  if (elSubtotal) elSubtotal.textContent = formatarMoeda(subtotal);
  if (elEntrega) elEntrega.textContent = formatarMoeda(TAXA_ENTREGA);
  if (elTotal) elTotal.textContent = formatarMoeda(total);
}

function montarMensagemPedido(dados) {
  var itens = obterCarrinho();
  var subtotal = calcularTotalCarrinho();
  var taxaCredito = dados.formaPagamento === "credito" ? TAXA_CREDITO : 0;
  var total = subtotal + TAXA_ENTREGA + taxaCredito;

  var itensTexto = "(carrinho vazio)";
  if (itens.length) {
    itensTexto = itens.map(function(item) {
      return "- " + item.quantity + "x " + item.name + " (" + formatarMoeda(item.price) + ")";
    }).join("\n");
  }

  var detalhePagamento = "";

  if (dados.formaPagamento === "dinheiro") {
    var precisaTroco = document.querySelector("#precisa-troco").value;
    detalhePagamento = precisaTroco === "sim"
      ? "Dinheiro - troco para R$ " + document.querySelector("#troco-para").value.trim()
      : "Dinheiro - sem necessidade de troco";
  } else if (dados.formaPagamento === "pix") {
    detalhePagamento = "Pix - chave " + LOJA.chavePix + " (comprovante será enviado aqui no WhatsApp)";
  } else if (dados.formaPagamento === "debito") {
    detalhePagamento = "Cartão de Débito - maquininha levada ao local";
  } else if (dados.formaPagamento === "credito") {
    var parcelas = document.querySelector("#parcelas-credito").value;
    detalhePagamento = "Cartão de Crédito - " + parcelas + "x (taxa de R$ 8,50 inclusa) - maquininha levada ao local";
  }

  var msg = "*NOVO PEDIDO - Hortifruti e Mercearia da LILI*\n\n" +
            "*Cliente:* " + dados.nome + "\n" +
            "*Endereço:* " + dados.rua + ", " + dados.numero + (dados.complemento ? " - " + dados.complemento : "") + " - CEP " + dados.cep + "\n\n" +
            "*Itens:*\n" + itensTexto + "\n\n" +
            "Subtotal: " + formatarMoeda(subtotal) + "\n" +
            "Entrega: " + formatarMoeda(TAXA_ENTREGA) + "\n" +
            (taxaCredito ? ("Taxa cartão de crédito: " + formatarMoeda(taxaCredito) + "\n") : "") +
            "*Total: " + formatarMoeda(total) + "*\n\n" +
            "*Forma de pagamento:* " + detalhePagamento;

  return msg;
}

function finalizarPedido(evento) {
  evento.preventDefault();

  if (!enderecoDentroDoRaio) {
    alert("Não é possível finalizar: o endereço informado está fora da nossa área de entrega (máximo de " + RAIO_MAXIMO_KM + " km).");
    return;
  }

  var nome = document.querySelector("#Nome").value.trim();
  var cep = document.querySelector("#cep").value.trim();
  var rua = document.querySelector("#rua").value.trim();
  var numero = document.querySelector("#numero").value.trim();
  var complemento = document.querySelector("#complemento").value.trim();
  var formaPagamento = obterFormaPagamentoSelecionada();

  if (!nome || !cep || !rua || !numero) {
    alert("Preencha nome, CEP, rua e número antes de finalizar.");
    return;
  }

  if (!formaPagamento) {
    alert("Escolha uma forma de pagamento.");
    return;
  }

  var mensagem = montarMensagemPedido({
    nome: nome,
    cep: cep,
    rua: rua,
    numero: numero,
    complemento: complemento,
    formaPagamento: formaPagamento
  });

  var link = "https://wa.me/" + LOJA.numeroWhatsApp + "?text=" + encodeURIComponent(mensagem);
  
  localStorage.removeItem("cart");
  window.open(link, "_blank");
}

document.addEventListener("DOMContentLoaded", function() {
  atualizarResumo();
  atualizarBotaoFinalizar();

  var elCep = document.querySelector("#cep");
  var elNumero = document.querySelector("#numero");
  var elRua = document.querySelector("#rua");
  var elTroco = document.querySelector("#precisa-troco");
  var elParcelas = document.querySelector("#parcelas-credito");
  var elForm = document.querySelector("#form-finalizar");

  if (elCep) {
    elCep.addEventListener("blur", async function() {
      var dados = await buscarEnderecoPorCep(elCep.value);
      if (dados && elRua && !elRua.value.trim()) {
        elRua.value = dados.logradouro || "";
      }
    });
  }

  if (elNumero) elNumero.addEventListener("blur", verificarDistanciaEntrega);
  if (elRua) elRua.addEventListener("blur", verificarDistanciaEntrega);

  document.querySelectorAll('input[name="forma-pagamento"]').forEach(function(radio) {
    radio.addEventListener("change", atualizarDetalhePagamento);
  });

  if (elTroco) {
    elTroco.addEventListener("change", function(evento) {
      var campoTroco = document.querySelector("#campo-troco-valor");
      if (campoTroco) {
        campoTroco.style.display = evento.target.value === "sim" ? "block" : "none";
      }
    });
  }

  if (elParcelas) elParcelas.addEventListener("change", atualizarResumo);
  if (elForm) elForm.addEventListener("submit", finalizarPedido);
});