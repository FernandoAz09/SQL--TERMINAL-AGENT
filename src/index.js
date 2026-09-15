import { createInterface } from "node:readline";
import { styleText } from "node:util";
import { generateSqlObject, generateTextAnswer } from "./ai.js";
import { createDb } from "./db.js";
import { DB_NAME } from "./constants.js";

const db = createDb(DB_NAME);
const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
});

// Função para exibir o prompt e aguardar a entrada do usuário
function prompt(text) {
    return new Promise((resolve) => rl.question(text, resolve));
}

// Função para processar a entrada do usuário
rl.on("close", () => {
    db.close();
    console.log(styleText("gray", "Encerrando o agente, até logo!"));
    process.exit(0);
});

// Início do loop principal
console.log(styleText(["bold", "green"], "Bem-vindo ao SQL Terminal Agent!! Pressione Ctrl+C para sair."));
while (true) {
    const question = await prompt(styleText(["bold", "magenta"], "Pergunta: "));
    // Verifica se a pergunta não está vazia
    if (!question.trim()) {
        continue;
    }

    try {
        const sqlObject = await generateSqlObject(question);
        const { sql, explanation } = sqlObject;

        console.log(styleText("cyan", "\nSQL sugerido: "));
        console.log(styleText("red", sql));
        console.log(styleText("cyan", "\nExplicação:"));
        console.log(styleText("yellow", explanation));

        const confirm = await prompt(styleText(["bold", "green"], "\nDeseja executar o SQL? (s/n): "));
        if (confirm.toLowerCase() === "s") {
            const result = await db.prepare(sql).all().map(row => ({ ...row }));
            const answer = await generateTextAnswer(
                { question, sql, rows: result }
            );

            console.log(styleText("cyan", "\nResposta:"));
            console.log(answer);
        } else {
            console.log(styleText("gray", "\nExecução do SQL cancelada."));
        }

    } catch (error) {
        console.error(styleText("red", "\nOcorreu um erro ao processar a solicitação."), error.message);
    }
}