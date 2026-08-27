// PRECISAMOS GERAR UM ARQUIVO ACCESS.LOG FAKE
import { createWriteStream, statSync } from "node:fs";
import { faker } from "@faker-js/faker";

const LOG_FILE = "access.log";
const LOG_INTERVAL = 1 * 1000; // 1 segundo
const maxRecords = Number(process.argv[2] || Infinity);

// Valida se o argumento fornecido é um número inteiro positivo
if (!Number.isInteger(maxRecords) && Number.isFinite(maxRecords) || Number.isNaN(maxRecords) || maxRecords <= 0) {
    console.error("Uso: npm run seed -- <quantidade>");
    console.error("A quantidade deve ser um número inteiro positivo.");
    process.exit(1);
}

// Verifica se o arquivo de log já existe e, em caso afirmativo, obtém o tamanho atual do arquivo
const stream = createWriteStream(LOG_FILE);

// Gera um usuário fake com dados aleatórios
function generateUser() {
    return {
        ip: faker.internet.ip(),
        username: faker.internet.username(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        location: faker.location.city(),
        job_area: faker.person.jobArea(),
        company: faker.company.name(),
        job_title: faker.person.jobTitle(),
        id: faker.string.uuid(),
    };
}

// Gera uma entrada de log com base no usuário gerado
function generateLogEntry(user) {
    return {
        ...user,
        timestamp: faker.date.recent().toISOString(),
    };
}

// Backpressure implementation - Escreve no arquivo de log e aguarda o evento "drain" caso o buffer esteja cheio
function writerRecord(line) {
    return new Promise((resolve) => {
        if (!stream.write(line)) {
            stream.once("drain", resolve);
        } else {
            resolve();
        }
    });
}

// Converte bytes para gigabytes com 4 casas decimais
function convertFromBytesToGB(bytes) {
    return (bytes / 1024 / 1024 / 1024).toFixed(4);
}

console.log(`Gerando logs de acesso falsos em ${LOG_FILE}... (Pressione Ctrl+C para interromper)`);
console.log(`Limite de registros: ${maxRecords.toLocaleString()}`);

// Gera um array de usuários fake
const users = Array.from({ length: 5 }, generateUser);

// Função para parar a execução do script quando o usuário pressionar Ctrl+C
process.on("SIGINT", () => {
    stream.end(() => {
        const { size } = statSync(LOG_FILE);
        console.log(`Geração de logs interrompida pelo usuário. Registros gerados: ${count.toLocaleString()}, Tamanho do arquivo: ${convertFromBytesToGB(size)} GB`);
    });
});

// Loop para gerar registros de log até atingir o limite especificado
let count = 0;
while (count < maxRecords) {
    const user = faker.helpers.arrayElement(users);
    const record = generateLogEntry(user);

    await writerRecord(JSON.stringify(record) + "\n");
    count++;

    if (count % LOG_INTERVAL === 0) {
        const { size } = statSync(LOG_FILE);
        console.log(`Registros: ${count.toLocaleString()}, Tamanho do arquivo: ${convertFromBytesToGB(size)} GB`);
    }
}

// Fecha o stream de escrita e exibe a mensagem final com o total de registros e tamanho do arquivo
stream.end(() => {
    const { size } = statSync(LOG_FILE);
    console.log(`Geração de logs concluída. Total de registros: ${count.toLocaleString()}, Tamanho do arquivo: ${convertFromBytesToGB(size)} GB`);
});