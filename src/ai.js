import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";


const SCHEMA_DESCRIPTION = `
Tabela: access_logs
Colunas:
    - ip TEXT NOT NULL,
    - username TEXT NOT NULL,
    - firstName TEXT NOT NULL,
    - lastName TEXT NOT NULL,
    - email TEXT NOT NULL,
    - location TEXT NOT NULL,
    - job_area TEXT NOT NULL,
    - company TEXT NOT NULL,
    - job_title TEXT NOT NULL,
    - id TEXT PRIMARY KEY,
    - timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
`;

const BLOCKED_KEYWORDS = [
    "ALTER",
    "ATTACH",
    "CALL",
    "CREATE",
    "DELETE",
    "DETACH",
    "DROP",
    "EXECUTE",
    "GRANT",
    "INSERT",
    "MERGE",
    "PRAGMA",
    "REPLACE",
    "REVOKE",
    "TRUNCATE",
    "UPDATE",
    "VACUUM"
];


// Definindo o schema para a sugestão SQL
export function validateSql(sql) {
    const safeSql = sql.trim().replace(/;\s*$/, '').trim();

    for (const keyword of BLOCKED_KEYWORDS) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(safeSql)) {
            throw new Error(`Comando bloqueado: ${keyword}.`);
        }
    }

    return safeSql;
}

const model = google("gemini-3.5-flash-lite");


const sqlSuggestionSchema = z.object({
    sql: z.string(),
    explanation: z.string(),
});

export async function generateSqlObject(question) {
    const { experimental_output } = await generateText({
        model,
        maxRetries: 1,
        experimental_output: Output.object({ schema: sqlSuggestionSchema }),
        system: `
      Você é um assistente especialista em SQLite.

      Sua tarefa é gerar uma única query SQL para responder pergunta do(a) usuário(a).

      Regras obrigatórias:
      - Gere apenas SELECT.
      - Use apenas a tabela access_logs.
      - Não use ${BLOCKED_KEYWORDS.join(', ')}.
      - Não gere múltiplas queries.
      - Não use comentários SQL.
      - Se a pergunta não puder ser respondida com o schema disponível, gere uma query simples de inspeção ou explique a limitação.

      Schema disponível:
      ${SCHEMA_DESCRIPTION}`,
        prompt: `
      Pergunta do usuário:
      ${question}
    `,
    });

    if (!experimental_output?.sql) {
        throw new Error('O modelo nao retornou uma sugestão SQL valida.');
    }

    return {
        sql: validateSql(experimental_output.sql),
        explanation: experimental_output.explanation,
    };
}

export async function generateTextAnswer({ question, sql, rows }) {
    const { text } = await generateText({
        model,
        maxRetries: 1,
        prompt: `
            Responda em português, de forma objetiva, apenas com base nos dados retornados.
            Se o resultado estiver vazio, diga isso claramente.

      Pergunta original:
      ${question}

      SQL executada:
      ${sql}

      Linhas retornadas em JSON:
      ${JSON.stringify(rows, null, 2)}

      Resposta:
    `,
    });

    return text.trim();
}