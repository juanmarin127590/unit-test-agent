import * as vscode from 'vscode';
import { PETS_REVIEW_PROMPT, PETS_SYSTEM_PROMPT } from './prompts';

export function activate(context: vscode.ExtensionContext) {

    // 1. Helper para seleccionar el mejor modelo disponible de tu lista Premium
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
        if (sonnet) {
            return sonnet;
        }

        // Prioridad 2: GPT-5 / Codex (Potencia en código)
        const gpt5 = allModels.find(m => 
            m.name.toLowerCase().includes('gpt-5') || 
            m.id.toLowerCase().includes('gpt-5')
        );
        if (gpt5) {
            return gpt5;
        }

        // Prioridad 3: GPT-4o (Balanceado)
        const gpt4o = allModels.find(m => 
            m.name.toLowerCase().includes('gpt-4o') || 
            m.family?.toLowerCase().includes('gpt-4o')
        );
        if (gpt4o) {
            return gpt4o;
        }

        // Prioridad 4: Gemini Estándar
        const gemini = allModels.find(m => 
            m.family?.toLowerCase().includes('gemini') || 
            m.name.toLowerCase().includes('gemini')
        );
        if (gemini) {
            return gemini;
        }

        // Prioridad 5: GPT-4 Estándar
        const gpt4 = allModels.find(m => 
            m.name.toLowerCase().includes('gpt-4') || 
            m.id.toLowerCase().includes('gpt-4')    
        );
        if (gpt4) {
            return gpt4;
        }

        // Fallback: Si no encuentra los específicos, usa el primero disponible (tu default)
        return allModels.length > 0 ? allModels[0] : undefined;
    }

    // 2. Helper para escanear el Workspace y dar contexto extra al Agente
    async function getProjectContext(): Promise<string> {
        let contextString = "### Workspace Context Info:\n";

        // A. Intentar leer pubspec.yaml para confirmar dependencias clave
        try {
            // Buscamos solo en la raíz o carpetas cercanas, ignorando node_modules
            const pubspecFiles = await vscode.workspace.findFiles('pubspec.yaml', '**/node_modules/**', 1);
            if (pubspecFiles.length > 0) {
                // Solo indicamos que existe, leerlo entero gasta muchos tokens
                contextString += `- Pubspec.yaml found. This is a Flutter/Dart project.\n`;
            }
        } catch (e) { 
            console.log('Error reading pubspec', e); 
        }

        // B. Listar los Builders existentes en test/builders (CRÍTICO para el estándar PETS)
        try {
            // Busca archivos .dart dentro de test/builders
            const builderFiles = await vscode.workspace.findFiles('test/builders/**/*.dart', '**/node_modules/**', 20);
            
            if (builderFiles.length > 0) {
                // Extraemos solo los nombres de archivo (ej: user_builder.dart)
                const builderNames = builderFiles.map(f => f.path.split('/').pop()).join(', ');
                contextString += `- Existing Builders found in project structure (test/builders/): [${builderNames}]\n`;
                contextString += `  (Instruction: Use these existing builders for object creation instead of mocks where appropriate).\n`;
            } else {
                contextString += `- No existing builders found in 'test/builders/'. You may need to create them inside the test file or suggest creating new ones.\n`;
            }
        } catch (e) { 
            console.log('Error searching builders', e); 
        }

        return contextString;
    }

    // 3. Manejador principal del chat
    const handler: vscode.ChatRequestHandler = async (request, context, stream, token) => {
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            stream.markdown('⚠️ Por favor, abre el archivo Dart que deseas probar.');
            return;
        }

        const document = editor.document;
        const codeContext = document.getText();
        const fileName = document.fileName.split('/').pop() || 'unknown file';

        try {
            // Paso A: Elegir Modelo
            const model = await pickModel();
            if (!model) {
                stream.markdown('❌ No se encontró un modelo compatible (Copilot).');
                return;
            }

            // --- LÓGICA DE SELECCIÓN DE COMANDO (MODIFICADA)
            let systemPrompt = PETS_SYSTEM_PROMPT;
            let userTask = `The code to unit test is (File: ${fileName}):\n\n\`\`\`dart\n${codeContext}\n\`\`\``;

            if (request.command === 'review') {
                // Caso REVISAR
                stream.markdown(`🧐 **Revisando** tests en **${fileName}** bajo estándar PETS (Modelo: **${model.name}**)...\n\n`);
                systemPrompt = PETS_REVIEW_PROMPT;
                userTask = `Please REVIEW the following existing test code against the PETS standard:\n\n\`\`\`dart\n${codeContext}\n\`\`\``;
            } else {
                // Caso GENERAR (Default)
                stream.markdown(`🤖 **Generando** tests para **${fileName}** (Modelo: **${model.name}**)...\n\n`);
            }

            // Paso B: Obtener Contexto del Proyecto
            const workspaceInfo = await getProjectContext();

            // Paso C: Construir Prompt
            const messages = [
                // 1. Instrucción Maestra (PETS)
                vscode.LanguageModelChatMessage.User(systemPrompt),
                
                // 2. Información del Proyecto (Builders, etc.)
                vscode.LanguageModelChatMessage.User(workspaceInfo),
                
                // 3. Código del Usuario
                vscode.LanguageModelChatMessage.User(userTask),
            ];

            // Paso D: Enviar y procesar respuesta
            const chatRequest = await model.sendRequest(messages, {}, token);

            for await (const fragment of chatRequest.text) {
                stream.markdown(fragment);
            }

        } catch (err) {
            // Es importante registrar el error para depuración, sin importar la causa.
            console.error(err);

            // Si el token fue cancelado (ej: el usuario cerró el chat), no intentes escribir en el stream.
            // Esto previene el error "write after end".
            if (token.isCancellationRequested) {
                console.log("Request was cancelled. Skipping final stream message.");
                return; // Salimos de forma segura.
            }

            if (err instanceof vscode.CancellationError) {
                // Este bloque ahora es redundante debido a la comprobación anterior, pero lo mantenemos por si acaso.
                // En la práctica, token.isCancellationRequested será true aquí.
                stream.markdown('\n\n*Solicitud cancelada.*');
            } else {
                // Solo escribimos un error si la cancelación no fue la causa.
                stream.markdown('\n\n❌ Ocurrió un error inesperado al procesar la solicitud.');
            }
        }
    };

    // 4. Registro del Agente
    const agent = vscode.chat.createChatParticipant('unit-test-agent', handler);
    agent.iconPath = new vscode.ThemeIcon('beaker');
    
    context.subscriptions.push(agent);
}

export function deactivate() {}