let allCommits = []; // Arreglo para guardar todos los datos de los commits
let commit_Messages = []; // Arreglo para guardar los mensajes de los commits
let processed_Messages = []; // Arreglo para guardar los mensajes procesados
let sentiment;
let charRNN;
let messageNumber = 20; // Número de mensajes a procesar
let dataReady = false; // Booleano para indicar si los datos están listos y darle paso al dibujo

const token = "";
const username = "microsoft";
const repo = "vscode";

async function setup() {
  createCanvas(800, 800);

  //Cargar el modelo de charRNN
  charRNN = ml5.charRNN(
    "https://raw.githubusercontent.com/ml5js/ml5-data-and-models/main/models/charRNN/shakespeare/",
    charRNNModelReady
  );
  //Cargar el modelo de sentiment
  sentiment = ml5.sentiment("movieReviews", sentimentModelReady);

  //Llamar a la funcion para cargar los commits
  await fetchCommits();
}

function charRNNModelReady() {
  console.log("Modelo charRNN cargado");
}

function sentimentModelReady() {
  console.log("Modelo de sentiment cargado");
}

//Funcion para cargar los commits de un repositorio de github
async function fetchCommits() {
  console.log("Obteniendo commits...");
  const url = `https://api.github.com/repos/${username}/${repo}/commits?per_page=100&page=`; //page= entrega el número de commits
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchCommitsPage = async (page) => {
    const response = await fetch(url + page, options);
    const commits = await response.json();
    allCommits.push(...commits);
  };

  //Ciclo para obtener más de 100 commits generando un arreglo más grande
  const fetchAllCommits = async () => {
    for (let i = 1; i <= 10; i++) {
      await fetchCommitsPage(i);
    }
    console.log(allCommits);

    // Llamado a la función que extrae solo los mensajes de los commits
    extractCommitMessages(allCommits, messageNumber);
  };

  await fetchAllCommits().catch((error) => {
    console.error(error);
  });
}

//Funcion para extraer los mensajes de los commits
//utiliza map para extraer los mensajes de los commits

async function extractCommitMessages(commits, numberOfCommits) {
  console.log("Extrayendo mensajes de los commits...");
  //numberOfCommits es el número de mensajes a procesar
  const commitMessages = commits.map((commit) => commit.commit.message);

  // Procesar cada mensaje individualmente hasta el número especificado de commits
  for (let i = 0; i < Math.min(numberOfCommits, commitMessages.length); i++) {
    const truncatedMessage = commitMessages[i].substring(0, 50); // Se puede modificar el valor para obtener más o menos caracteres
    commit_Messages.push({ mensaje: truncatedMessage, sentimiento: null }); // Inicializar sentimiento como null
  }

  // Obtener sentimientos para cada mensaje
  await getSentiment(commit_Messages);
  console.log("Mensajes:", commit_Messages);

  // Llamado a la función para procesar los mensajes una vez que la función de extracción haya terminado
  await processMessages(commit_Messages, messageNumber);

  // Aviso para que la función draw empiece a dibujar
  console.log("Datos preparados");
  dataReady = true;
}

//Función que genera mensajes procesados
//Utiliza un ciclo for en el que llama a un procesador individual para cada mensaje
async function processMessages(commit_Messages, numberOfMessages) {
  console.log("Procesando mensajes...");
  //numberOfMessages es el número de mensajes a procesar
  for (let i = 0; i < Math.min(numberOfMessages, commit_Messages.length); i++) {
    const message = commit_Messages[i];
    const extendedMessage = await processMessage(message);
    processed_Messages[i] = {
      mensaje: extendedMessage.substring(0, 50), // Cantidad máxima de caracteres por mensaje modificado
      sentimiento: null,
    };
  }

  // Obtener sentimientos para cada mensaje
  await getSentiment(processed_Messages);
  console.log("Mensajes procesados:", processed_Messages);
}

//Funcion para procesar cada mensaje individualmente usando la función generate de ml5 propia del modelo charRNN
async function processMessage(message) {
  return new Promise((resolve, reject) => {
    charRNN.generate({ seed: message, length: 100 }, (err, result) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(result.sample);
      }
    });
  });
}

//Funcion para obtener el sentimiento de cada mensaje
async function getSentiment(messagesArray) {
  // Recorrer cada mensaje del arreglo y obtener su sentimiento usando la función predict de ml5 propia del modelo sentiment
  for (let i = 0; i < messagesArray.length; i++) {
    const message = messagesArray[i].mensaje;
    const prediction = await sentiment.predict(message);
    messagesArray[i].sentimiento = prediction;
  }
}

function draw() {
  if (dataReady) {
    // Crear una tabla HTML dentro del lienzo
    let table = createElement("table");
    table.position(20, 20); // Establecer la posición de la tabla
    table.style("border-collapse", "collapse"); // Colapso de bordes para una apariencia más limpia

    // Crear la primera fila de la tabla
    let headerRow = createElement("tr");
    table.child(headerRow); // Añadir la fila a la tabla

    // Crear las celdas de la primera fila con las palabras "normal" y "procesado"
    let normalHeader = createElement("th", "Normal");
    let processedHeader = createElement("th", "Procesado");
    headerRow.child(normalHeader); // Añadir la celda "normal" a la fila
    headerRow.child(processedHeader); // Añadir la celda "procesado" a la fila

    // Llenar la tabla con los mensajes y sus sentimientos
    for (let i = 0; i < messageNumber; i++) {
      // Crear una nueva fila para cada mensaje
      let row = createElement("tr");
      table.child(row); // Añadir la fila a la tabla

      // Crear celdas para el mensaje normal y el mensaje procesado
      let normalCell = createElement("td");
      let processedCell = createElement("td");

      // Calcular el color en función del sentimiento del mensaje normal
      let normalColor = calculateColor(commit_Messages[i].sentimiento.score);
      normalCell.style("background-color", normalColor); // Establecer el color de fondo de la celda

      // Crear elementos para el contenido del mensaje normal
      let normalText = createElement(
        "span",
        "Mensaje: " + commit_Messages[i].mensaje
      );
      let normalSentiment = createElement(
        "span",
        "Sentimiento: " + JSON.stringify(commit_Messages[i].sentimiento)
      );
      normalCell.child(normalText); // Añadir el texto del mensaje normal a la celda
      normalCell.child(createElement("br")); // Añadir un salto de línea
      normalCell.child(normalSentiment); // Añadir el sentimiento del mensaje normal a la celda

      // Calcular el color en función del sentimiento del mensaje procesado
      let processedColor = calculateColor(
        processed_Messages[i].sentimiento.score
      );
      processedCell.style("background-color", processedColor); // Establecer el color de fondo de la celda

      // Crear elementos para el contenido del mensaje procesado
      let processedText = createElement(
        "span",
        "Mensaje: " + processed_Messages[i].mensaje
      );
      let processedSentiment = createElement(
        "span",
        "Sentimiento: " + JSON.stringify(processed_Messages[i].sentimiento)
      );
      processedCell.child(processedText); // Añadir el texto del mensaje procesado a la celda
      processedCell.child(createElement("br")); // Añadir un salto de línea
      processedCell.child(processedSentiment); // Añadir el sentimiento del mensaje procesado a la celda

      row.child(normalCell); // Añadir la celda del mensaje normal a la fila
      row.child(processedCell); // Añadir la celda del mensaje procesado a la fila
    }

    // Establecer estilos de borde para las celdas
    let cells = selectAll("td, th");
    for (let cell of cells) {
      cell.style("border", "1px solid black");
      cell.style("padding", "8px"); // Añadir espacio alrededor del contenido de la celda
    }
  }
}

// Función para calcular el color en función del sentimiento
function calculateColor(sentimentScore) {
  // Interpolar entre verde (positivo) y rojo (negativo) en función del sentimiento
  let green = map(sentimentScore, 0, 1, 0, 255); // Valor alto de verde cuando el sentimiento es cercano a 1
  let red = map(sentimentScore, 0, 1, 255, 0); // Valor alto de rojo cuando el sentimiento es cercano a 0

  // Crear un color en función de la interpolación
  let colorString = "rgb(" + red + ", " + green + ", 0)";
  return colorString;
}
