import * as vscode from 'vscode';
import { PETS_SYSTEM_PROMPT } from './prompts';

export function activate(context: vscode.ExtensionContext) {

    // Helper para seleccionar el mejor modelo disponible de tu lista Premium
    async function pickModel(): Promise<vscode.LanguageModelChat | undefined> {
        // Obtenemos TODOS los modelos disponibles de Copilot primero
        const allModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        
        // Estrategia de búsqueda flexible (por nombre o familia) para asegurar que los encuentre
        
        // Prioridad 1: Claude Sonnet (El mejor para seguir instrucciones estrictas PETS)
        // Busca "sonnet" en el nombre (ej: "Claude Sonnet 4.5")
        const sonnet = allModels.find(m => 
            m.name.toLowerCase().includes('sonnet') || 
            m.family?.toLowerCase().includes('sonnet')
        );
        if (sonnet) return sonnet;

        // Prioridad 2: GPT-5 / Codex (Potencia en código)
        const gpt5 = allModels.find(m => 
            m.name.toLowerCase().includes('gpt-5') || 
            m.id.toLowerCase().includes('gpt-5')
        );
        if (gpt5) return gpt5;

        // Prioridad 3: GPT-4o (Balanceado)
        const gpt4o = allModels.find(m => 
            m.name.toLowerCase().includes('gpt-4o') || 
            m.family?.toLowerCase().includes('gpt-4o')
        );
        if (gpt4o) return gpt4o;

        // Prioridad 4: GPT-4 Estándar
        const gpt4 = allModels.find(m => 
            m.family?.toLowerCase().includes('gpt-4')
        );
        if (gpt4) return gpt4;

        // Fallback: Si no encuentra los específicos, usa el primero disponible (tu default)
        return allModels.length > 0 ? allModels[0] : undefined;
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
            // Seleccionamos el modelo usando la nueva lógica robusta
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