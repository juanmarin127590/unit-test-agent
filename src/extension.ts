import * as vscode from 'vscode';
import { PETS_SYSTEM_PROMPT } from './prompts';

export function activate(context: vscode.ExtensionContext) {

    // Helper para seleccionar el mejor modelo disponible según tu lista Premium
    async function pickModel(): Promise<vscode.LanguageModelChat | undefined> {
        // 1. Intentar buscar modelos específicos de "Coding" o "Reasoning" de alto nivel
        // Nota: Los IDs de familia pueden variar según el proveedor, probamos los keywords comunes.
        
        // Prioridad 1: Claude Sonnet (Excelente siguiendo instrucciones estrictas PETS)
        let models = await vscode.lm.selectChatModels({ family: 'claude-sonnet-4.5' });
        if (models.length > 0) return models[0];

        // Prioridad 2: GPT-5 Codex (Potencia pura de código)
        models = await vscode.lm.selectChatModels({ family: 'gpt-5-codex' });
        if (models.length > 0) return models[0];

        // Prioridad 3: GPT-4o (Velocidad y razonamiento balanceado)
        models = await vscode.lm.selectChatModels({ family: 'gpt-4o' });
        if (models.length > 0) return models[0];

        // Prioridad 4: GPT-4 Estándar
        models = await vscode.lm.selectChatModels({ family: 'gpt-4' });
        if (models.length > 0) return models[0];

        // Fallback: Cualquier modelo de Copilot (usará tu selección por defecto en la UI)
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        if (models.length > 0) return models[0];

        return undefined;
    }

    const handler: vscode.ChatRequestHandler = async (request, context, stream, token) => {
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            stream.markdown('⚠️ Por favor, abre un archivo Dart para generar sus pruebas.');
            return;
        }

        const document = editor.document;
        const codeContext = document.getText();
        const fileName = document.fileName.split('/').pop() || 'archivo desconocido';

        try {
            // Seleccionamos el modelo usando la nueva lógica
            const model = await pickModel();

            if (!model) {
                stream.markdown('❌ No se encontró un modelo compatible. Verifica tu conexión a Copilot.');
                return;
            }

            stream.markdown(`🤖 Generando tests para **${fileName}** usando **${model.name}**...\n\n`);

            const messages = [
                vscode.LanguageModelChatMessage.User(PETS_SYSTEM_PROMPT),
                vscode.LanguageModelChatMessage.User(`The code to test is:\n\n\`\`\`dart\n${codeContext}\n\`\`\``)
            ];

            const chatRequest = await model.sendRequest(messages, {}, token);

            for await (const fragment of chatRequest.text) {
                stream.markdown(fragment);
            }

        } catch (err) {
            console.error(err);
            if (err instanceof vscode.CancellationError) {
                stream.markdown('\n\n*Generación cancelada.*');
            } else {
                stream.markdown('\n\n❌ Error al comunicarse con el modelo de lenguaje.');
            }
        }
    };

    const agent = vscode.chat.createChatParticipant('pets-agent', handler);
    agent.iconPath = new vscode.ThemeIcon('beaker');
    
    context.subscriptions.push(agent);
}

export function deactivate() {}
