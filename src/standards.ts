import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Representa un estándar de codificación cargado desde un archivo.
 */
export interface Standard {
    name: string;
    content: string;
    filePath: string;
}

/**
 * Configuración de estándares para el agente.
 */
export interface StandardsConfig {
    testingStandards: string;
    petsStandard: string;
    codingStandards?: string;
    reduxStandards?: string;
    repositoryStandards?: string;
}

/**
 * Gestor centralizado de estándares de codificación.
 * Permite cargar y gestionar estándares desde archivos markdown.
 */
export class StandardsManager {
    private standards: Map<string, Standard> = new Map();
    private resourcesPath: string;

    constructor(extensionContext: vscode.ExtensionContext) {
        this.resourcesPath = path.join(extensionContext.extensionPath, 'resources');
    }

    /**
     * Carga un estándar desde un archivo markdown.
     * @param fileName Nombre del archivo (ej: 'testing-standards.md')
     * @param standardName Nombre del estándar para referencia (ej: 'testing')
     */
    async loadStandard(fileName: string, standardName: string): Promise<Standard> {
        const filePath = path.join(this.resourcesPath, fileName);
        
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const standard: Standard = {
                name: standardName,
                content,
                filePath
            };
            
            this.standards.set(standardName, standard);
            return standard;
        } catch (error) {
            console.error(`Error loading standard ${standardName} from ${filePath}:`, error);
            throw new Error(`Failed to load standard: ${standardName}`);
        }
    }

    /**
     * Carga todos los estándares predeterminados del proyecto.
     */
    async loadDefaultStandards(): Promise<void> {
        const defaultStandards = [
            { fileName: 'testing-standards.md', name: 'testing' },
            { fileName: 'rlv_pets.md', name: 'pets' },
            { fileName: 'coding-standards.md', name: 'coding' },
            { fileName: 'redux-standards.md', name: 'redux' },
            { fileName: 'repository-standards.md', name: 'repository' }
        ];

        await Promise.all(
            defaultStandards.map(({ fileName, name }) =>
                this.loadStandard(fileName, name).catch(err => {
                    console.warn(`Optional standard ${name} not loaded:`, err.message);
                })
            )
        );
    }

    /**
     * Obtiene un estándar por su nombre.
     */
    getStandard(name: string): Standard | undefined {
        return this.standards.get(name);
    }

    /**
     * Obtiene el contenido de un estándar.
     */
    getStandardContent(name: string): string {
        return this.standards.get(name)?.content || '';
    }

    /**
     * Verifica si un estándar está cargado.
     */
    hasStandard(name: string): boolean {
        return this.standards.has(name);
    }

    /**
     * Lista todos los estándares cargados.
     */
    listStandards(): string[] {
        return Array.from(this.standards.keys());
    }

    /**
     * Construye un contexto de estándares para incluir en el prompt.
     * @param standardNames Lista de nombres de estándares a incluir
     * @param sectionTitle Título opcional para la sección
     */
    buildStandardsContext(standardNames: string[], sectionTitle = 'CODING STANDARDS'): string {
        const availableStandards = standardNames
            .map(name => this.getStandard(name))
            .filter((s): s is Standard => s !== undefined);

        if (availableStandards.length === 0) {
            return '';
        }

        let context = `\n### ${sectionTitle}\n\n`;
        context += 'The following standards must be strictly followed:\n\n';

        for (const standard of availableStandards) {
            context += `---\n`;
            context += `#### ${standard.name.toUpperCase()} STANDARD\n`;
            context += `${standard.content}\n`;
            context += `---\n\n`;
        }

        return context;
    }

    /**
     * Extrae secciones específicas de un estándar usando títulos markdown.
     * Útil para incluir solo partes relevantes del estándar.
     * @param standardName Nombre del estándar
     * @param sections Lista de títulos de sección a extraer
     */
    extractSections(standardName: string, sections: string[]): string {
        const content = this.getStandardContent(standardName);
        if (!content) {
            return '';
        }

        let extracted = '';
        const lines = content.split('\n');
        let capturing = false;
        let currentLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

            if (headerMatch) {
                const level = headerMatch[1].length;
                const title = headerMatch[2].trim();

                // Verificar si es una sección que queremos
                if (sections.some(s => title.toLowerCase().includes(s.toLowerCase()))) {
                    capturing = true;
                    currentLevel = level;
                    extracted += line + '\n';
                } else if (capturing && level <= currentLevel) {
                    // Dejamos de capturar si encontramos un header del mismo nivel o superior
                    capturing = false;
                }
            } else if (capturing) {
                extracted += line + '\n';
            }
        }

        return extracted;
    }

    /**
     * Carga un estándar personalizado desde el workspace del usuario.
     * Permite a los usuarios definir sus propios estándares en su proyecto.
     * @param fileName Nombre del archivo en el workspace (ej: '.unit-test-standards.md')
     * @param standardName Nombre para el estándar
     */
    async loadCustomStandard(fileName: string, standardName: string): Promise<Standard | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const filePath = path.join(workspacePath, fileName);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const standard: Standard = {
                name: standardName,
                content,
                filePath
            };

            this.standards.set(standardName, standard);
            console.log(`Custom standard loaded: ${standardName} from ${filePath}`);
            return standard;
        } catch (error) {
            console.log(`No custom standard found at ${filePath}`);
            return null;
        }
    }

    /**
     * Busca y carga automáticamente archivos de estándares en el workspace del usuario.
     * Soporta patrones como: .unit-test-standards.md, .pets-custom.md, etc.
     */
    async loadWorkspaceStandards(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        // Patrones de archivos a buscar
        const patterns = [
            '.unit-test-standards.md',
            '.testing-standards.md',
            'custom-testing-standards.md'
        ];

        for (const pattern of patterns) {
            await this.loadCustomStandard(pattern, `custom-${pattern.replace('.md', '')}`);
        }
    }
}

/**
 * Genera el contexto de estándares PETS optimizado para generación de tests.
 * @param manager Gestor de estándares
 * @param sections Opcional: mapa de estándar -> secciones específicas a extraer
 */
export function buildPetsTestingContext(
    manager: StandardsManager,
    sections?: Record<string, string[]>
): string {
    let context = '';

    // 1. Estándar PETS principal (arquitectura y estructura)
    if (manager.hasStandard('pets')) {
        const petsSections = sections?.['pets'] || [
            'Arquitectura',
            'Estructura del Módulo',
            'Capas de Arquitectura'
        ];
        const petsArchitecture = manager.extractSections('pets', petsSections);
        if (petsArchitecture) {
            context += `\n### PROJECT ARCHITECTURE (PETS MODULE)\n${petsArchitecture}\n`;
        }
    }

    // 2. Estándares de testing (crítico para generación)
    if (manager.hasStandard('testing')) {
        const testingSections = sections?.['testing'] || [
            'Configuración General',
            'Patrón AAA',
            'Gestión de Mocks',
            'Estándares por Tipo'
        ];
        const testingCore = manager.extractSections('testing', testingSections);
        if (testingCore) {
            context += `\n### TESTING STANDARDS\n${testingCore}\n`;
        }
    }

    // 3. Redux standards (para middlewares y state)
    if (manager.hasStandard('redux')) {
        const reduxSections = sections?.['redux'] || [
            'Testing',
            'Middlewares',
            'Estados'
        ];
        const reduxTesting = manager.extractSections('redux', reduxSections);
        if (reduxTesting) {
            context += `\n### REDUX PATTERNS\n${reduxTesting}\n`;
        }
    }

    return context;
}

/**
 * Genera el contexto para revisión de tests existentes.
 * @param manager Gestor de estándares
 * @param sections Opcional: mapa de estándar -> secciones específicas a extraer
 */
export function buildReviewContext(
    manager: StandardsManager,
    sections?: Record<string, string[]>
): string {
    let context = '';

    // Para revisión, queremos checklist y criterios de calidad
    if (manager.hasStandard('testing')) {
        const reviewSections = sections?.['testing'] || [
            'Checklist',
            'Mejores Prácticas',
            'Cobertura'
        ];
        const reviewCriteria = manager.extractSections('testing', reviewSections);
        if (reviewCriteria) {
            context += `\n### REVIEW CRITERIA\n${reviewCriteria}\n`;
        }
    }

    return context;
}
