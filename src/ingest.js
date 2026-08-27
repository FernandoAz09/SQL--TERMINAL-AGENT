import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { LOG_FILE, LOG_INTERVAL } from "./constants.js";
import { createDb } from "./db.js";

const db = createDb();
// 
const fileStream = createReadStream(LOG_FILE);
// Cria uma interface de leitura para processar o arquivo de log linha por linha
const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
});

console.log(`Lendo ${LOG_FILE} e ingestando dados no banco de dados...`);

let count = 0;

for await (const line of rl) {
    if (line.trim() === "") continue; // Ignora linhas vazias

    let record;
    try {
        record = JSON.parse(line);
    } catch (_) {
        continue; // Pula para a próxima linha
    }

    db.prepare(`
            INSERT INTO access_logs (
                ip,
                username,
                firstName,
                lastName,
                email,
                location,
                job_area,
                company,
                job_title,
                id,
                timestamp
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         )`
    ).run(
        record.ip,
        record.username,
        record.firstName,
        record.lastName,
        record.email,
        record.location,
        record.job_area,
        record.company,
        record.job_title,
        record.id,
        record.timestamp
    );
    count++;

    if (count % LOG_INTERVAL === 0) {
        console.log(`Ingestados ${count} registros...`);
    }
}

console.log(`Ingestão concluída. Total de registros ingeridos: ${count}`);
db.close();