import * as vscode from 'vscode';
import { 
    buildPetsSystemPrompt, 
    buildPetsReviewPrompt,
    buildUserTaskMessage,
    buildReviewTaskMessage
} from './prompts';
import { StandardsManager, buildPetsTestingContext, buildReviewContext } from './standards';
import { ConfigManager } from './config';

// Instancias globales
let standardsManager: StandardsManager;
let configManager: ConfigManager;

export function activate(context: vscode.ExtensionContext) {
    // Inicializar gestores
    standardsManager = new StandardsManager(context);
    configManager = new ConfigManager();

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
            // Paso A: Cargar configuración y estándares (solo una vez al inicio)
            if (standardsManager.listStandards().length === 0) {
                stream.markdown('📚 Cargando configuración y estándares...\n\n');
                
                // Cargar configuración del usuario
                await configManager.loadConfig();
                const config = configManager.getConfig();
                
                if (configManager.isVerboseLogging()) {
                    console.log('Agent configuration loaded:', config);
                }
                
                // Cargar solo los estándares habilitados
                const enabledStandards = configManager.getEnabledStandards();
                for (const standardName of enabledStandards) {
                    const fileName = `${standardName === 'pets' ? 'rlv_pets' : standardName}-standards.md`;
                    try {
                        await standardsManager.loadStandard(fileName, standardName);
                    } catch (error) {
                        console.warn(`Failed to load standard: ${standardName}`, error);
                    }
                }
                
                // Cargar estándares personalizados si están configurados
                const customFiles = configManager.getCustomStandardFiles();
                for (const { path, name } of customFiles) {
                    try {
                        await standardsManager.loadCustomStandard(path, name);
                    } catch (error) {
                        console.warn(`Failed to load custom standard: ${name} from ${path}`, error);
                    }
                }
                
                // Auto-cargar estándares del workspace si está habilitado
                if (configManager.shouldAutoLoadWorkspaceStandards()) {
                    await standardsManager.loadWorkspaceStandards();
                }
                
                const loadedStandards = standardsManager.listStandards();
                if (configManager.isVerboseLogging()) {
                    console.log('Standards loaded:', loadedStandards);
                }
            }

            // Paso B: Elegir Modelo

            // Paso B: Elegir Modelo con fallback automático
            // 1. Obtener todos los modelos disponibles y ordenarlos por prioridad
            const allModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
            const priorityOrder = [
                (m: any) => m.name?.toLowerCase().includes('sonnet') || m.family?.toLowerCase().includes('sonnet'),
                (m: any) => m.name?.toLowerCase().includes('gpt-5') || m.id?.toLowerCase().includes('gpt-5'),
                (m: any) => m.name?.toLowerCase().includes('gpt-4o') || m.family?.toLowerCase().includes('gpt-4o'),
                (m: any) => m.family?.toLowerCase().includes('gemini') || m.name?.toLowerCase().includes('gemini'),
                (m: any) => m.name?.toLowerCase().includes('gpt-4') || m.id?.toLowerCase().includes('gpt-4'),
            ];
            // Generar lista de modelos en orden de prioridad, sin duplicados
            let modelsOrdered: any[] = [];
            for (const filter of priorityOrder) {
                const found = allModels.find(filter);
                if (found && !modelsOrdered.includes(found)) {
                    modelsOrdered.push(found);
                }
            }
            // Agregar los que no entraron por prioridad
            for (const m of allModels) {
                if (!modelsOrdered.includes(m)) {
                    modelsOrdered.push(m);
                }
            }

            // Paso C: Construir contexto de estándares y prompts según el comando
            let systemPrompt: string = '';
            let userTask: string = '';
            // Obtener secciones configuradas para cada estándar
            const includeSections: Record<string, string[]> = {};
            for (const standardName of configManager.getEnabledStandards()) {
                const sections = configManager.getIncludeSections(standardName);
                if (sections) {
                    includeSections[standardName] = sections;
                }
            }

            // Paso D: Obtener Contexto del Proyecto (Builders, etc.)
            const workspaceInfo = await getProjectContext();

            // Paso E: Construir Prompt
            const messages = [
                vscode.LanguageModelChatMessage.User(systemPrompt ?? ''),
                vscode.LanguageModelChatMessage.User(workspaceInfo),
                vscode.LanguageModelChatMessage.User(userTask ?? ''),
            ];

            // Paso F: Intentar con cada modelo hasta que funcione
            let lastError: any = null;
            for (const model of modelsOrdered) {
                try {
                    // Actualizar prompts según modelo y comando
                    if (request.command === 'review') {
                        stream.markdown(`🧐 **Revisando** tests en **${fileName}** bajo estándar PETS (Modelo: **${model.name}**)...\n\n`);
                        const reviewContext = buildReviewContext(standardsManager, includeSections);
                        systemPrompt = buildPetsReviewPrompt(reviewContext);
                        userTask = buildReviewTaskMessage(codeContext);
                    } else {
                        stream.markdown(`🤖 **Generando** tests para **${fileName}** (Modelo: **${model.name}**)...\n\n`);
                        const testingContext = buildPetsTestingContext(standardsManager, includeSections);
                        systemPrompt = buildPetsSystemPrompt(testingContext);
                        userTask = buildUserTaskMessage(fileName, codeContext);
                    }
                    // Actualizar mensajes
                    messages[0] = vscode.LanguageModelChatMessage.User(systemPrompt);
                    messages[2] = vscode.LanguageModelChatMessage.User(userTask);

                    const chatRequest = await model.sendRequest(messages, {}, token);
                    for await (const fragment of chatRequest.text) {
                        stream.markdown(fragment);
                    }
                    // Si funcionó, salimos del ciclo
                    return;
                } catch (err: any) {
                    lastError = err;
                    // Si es ChatQuotaExceeded, probar siguiente modelo
                    if (err?.name === 'ChatQuotaExceeded' || err?.message?.includes('ChatQuotaExceeded')) {
                        stream.markdown(`⚠️ Cuota agotada para el modelo **${model.name}**. Probando siguiente modelo disponible...\n`);
                        continue;
                    } else {
                        // Otro error, no seguir intentando
                        throw err;
                    }
                }
            }
            // Si ninguno funcionó
            stream.markdown('❌ No se encontró un modelo Copilot disponible o todos agotaron su cuota.');
            if (lastError) {
                console.error('Último error de modelo:', lastError);
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