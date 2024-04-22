import express from "express";
import swaggerUi from "swagger-ui-express";

import swaggerDocument from './swagger.js';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ScoreThresholdRetriever } from "langchain/retrievers/score_threshold";
import dotenv from 'dotenv'; // Importa dotenv para carregar variáveis de ambiente
import { OpenAI } from "@langchain/openai";


//INIT APP(Inicializa o aplicativo Express)
const app = express();


app.use(express.json());

dotenv.config();


//const indexName = "certificates-index";
// Define o nome do índice no Pinecone e as chaves de API
const indexName = process.env.PINECODE_INDEX_NAME;

const PINECODE_API_KEY = process.env.PINECODE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;



// Função assíncrona para inicializar o índice no Pinecone
async function init() {
  console.log("Init...");

  let pineconeClient = new Pinecone({
    apiKey: PINECODE_API_KEY,
  });


  // Lista todos os índices existentes no Pinecone
  var pcListIndexes = await pineconeClient.listIndexes();

  // Verifica se o índice especificado já existe no Pinecone
  let pineconeIndex = pcListIndexes.indexes?.find(
    (index) => index.name === indexName
  );

  if (pineconeIndex) {
    console.log("Index found:", indexName);
  } else {
    console.log(`Index with name ${indexName} does not exist.`);


    // Se o índice não existe, cria um novo
    await pineconeClient.createIndex({
      name: indexName,
      dimension: 1536,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    console.log('Index with name "certificates-index" was created.');
  }
}

//ROUTING
// Setup Swagger(Configura a rota para a documentação Swagger)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Rota para processar e indexar certificados usando Pinecone e Langchain com OpenAI
app.post("/certificates-free", async (req, res) => {

  // Extrai os dados do certificado do body da requisição
  const {
    recipientName,
    courseName,
    courseDescription,
    issueDate,
  } = req.body;


  let pineconeClient = new Pinecone({
    apiKey:
      PINECODE_API_KEY,
  });

  const pineconeIndex = pineconeClient.Index(indexName);


  // TODO: indexar em portugues
  const docs = [
    new Document({
      metadata: { ...req.body },
      pageContent: `Certificate of achievement, this certificate is awarded to ${recipientName}, 
      has successfully completed the course ${courseName} - ${courseDescription} issued at ${issueDate}`,
    }),
  ];

  // inicia um modelo de text embeddings
  const embeddings = new OpenAIEmbeddings({
    apiKey: OPENAI_API_KEY,
    model: "text-embedding-ada-002",
  });


  // persiste o documento na bd
  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex,
    maxConcurrency: 5, // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
  });

  res.status(200).send({ message: "Certificate indexed successfully." });
});


// Rota para consultar certificados indexados
app.get("/query-certificates-free", async (req, res) => {


  const model = new OpenAI({
    model: "gpt-3.5-turbo",
    temperature: 1,
    apiKey: OPENAI_API_KEY
  });


  const query = req.query?.text;

  console.log("Query:", query);

  let pineconeClient = new Pinecone({
    apiKey:
      PINECODE_API_KEY,
  });

  const pineconeIndex = pineconeClient.Index(indexName);


  const embeddings = new OpenAIEmbeddings({
    apiKey: OPENAI_API_KEY, // In Node.js defaults to process.env.OPENAI_API_KEY
    batchSize: 512, // Default value if omitted is 512. Max is 2048
    model: "text-embedding-ada-002"
  });

  const vectorStore = await PineconeStore.fromExistingIndex(
    embeddings,
    { pineconeIndex }
  );

  //criar um retriever que vai buscar os resultados com base na similaridade
  const retriever = ScoreThresholdRetriever.fromVectorStore(vectorStore, {
    minSimilarityScore: 0.8, // Finds results with at least this similarity score
    maxK: 1
  });


  // TODO: criar um prompt para o LLM em portugues
  const prompt =
    ChatPromptTemplate.fromTemplate(`You are an helpful AI assistant that Answer
    the following question based only on the provided context,  if you dont know the answer, just say 'I dont know.':
  {context}
  Question: {input}
  Helpful Answer:
 `);


  const documentChain = await createStuffDocumentsChain({
    llm: model,
    prompt,

  });

  //criar um retrieval chain com o documento chain e o retriever
  const retrievalChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever,
  });

  //fazer um completion invocando o llm
  const results = await retrievalChain.invoke({
    input: query,
  });

  // Handle the results
  //console.log("results= ",results);


  // Send response
  res.status(200).send(results);
});

// Envia os resultados como resposta
app.listen(3000, async () => {
  await init();
  console.log("Server is running on http://localhost:3000");
});
