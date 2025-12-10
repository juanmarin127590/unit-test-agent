import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Configuración del agente de pruebas unitarias.
 */
export interface AgentConfig {
    standards: {
        enabled: string[];
        customFiles: Array<{ path: string; name: string }>;
        includeSections?: Record<string, string[]>;
    };
    modelPreference: {
        priority: string[];
    };
    behavior: {
        autoLoadWorkspaceStandards: boolean;
        language: 'es' | 'en';
        verboseLogging: boolean;
    };
}

/**
 * Configuración por defecto del agente.
 */
const DEFAULT_CONFIG: AgentConfig = {
    standards: {
        enabled: ['testing', 'pets', 'redux', 'coding', 'repository'],
        customFiles: [],
        includeSections: {
            testing: ['Configuración General', 'Patrón AAA', 'Gestión de Mocks', 'Estándares por Tipo'],
            pets: ['Arquitectura', 'Estructura del Módulo', 'Capas de Arquitectura']
        }
    },
    modelPreference: {
        priority: ['sonnet', 'gpt-5', 'gpt-4o', 'gemini', 'gpt-4']
    },
    behavior: {
        autoLoadWorkspaceStandards: true,
        language: 'es',
        verboseLogging: false
    }
};

/**
 * Gestor de configuración del agente.
 */
export class ConfigManager {
    private config: AgentConfig;
    private configPath?: string;

    constructor() {
        this.config = { ...DEFAULT_CONFIG };
    }

    /**
     * Carga la configuración desde el workspace del usuario.
     * Busca archivos: .unit-test-agent.config.json o .unit-test-agent.json
     */
    async loadConfig(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.log('No workspace folder found. Using default configuration.');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const configFileNames = [
            '.unit-test-agent.config.json',
            '.unit-test-agent.json'
        ];

        for (const fileName of configFileNames) {
            const configPath = path.join(workspacePath, fileName);
            try {
                const configContent = await fs.readFile(configPath, 'utf-8');
                const userConfig = JSON.parse(configContent);
                
                // Merge user config with defaults (deep merge)
                this.config = this.mergeConfig(DEFAULT_CONFIG, userConfig);
                this.configPath = configPath;
                
                console.log(`Configuration loaded from: ${configPath}`);
                return;
            } catch (error) {
                // File doesn't exist or is invalid, continue to next
                continue;
            }
        }

        console.log('No custom configuration found. Using defaults.');
    }

    /**
     * Realiza un merge profundo de configuraciones.
     */
    private mergeConfig(base: any, override: any): any {
        const result = { ...base };
        
        for (const key in override) {
            if (override.hasOwnProperty(key)) {
                if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
                    result[key] = this.mergeConfig(base[key] || {}, override[key]);
                } else {
                    result[key] = override[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Obtiene la configuración actual.
     */
    getConfig(): AgentConfig {
        return this.config;
    }

    /**
     * Obtiene los estándares habilitados.
     */
    getEnabledStandards(): string[] {
        return this.config.standards.enabled;
    }

    /**
     * Obtiene archivos de estándares personalizados.
     */
    getCustomStandardFiles(): Array<{ path: string; name: string }> {
        return this.config.standards.customFiles;
    }

    /**
     * Obtiene las secciones a incluir de un estándar específico.
     */
    getIncludeSections(standardName: string): string[] | undefined {
        return this.config.standards.includeSections?.[standardName];
    }

    /**
     * Obtiene la prioridad de modelos.
     */
    getModelPriority(): string[] {
        return this.config.modelPreference.priority;
    }

    /**
     * Verifica si debe cargar automáticamente estándares del workspace.
     */
    shouldAutoLoadWorkspaceStandards(): boolean {
        return this.config.behavior.autoLoadWorkspaceStandards;
    }

    /**
     * Obtiene el idioma preferido.
     */
    getLanguage(): 'es' | 'en' {
        return this.config.behavior.language;
    }

    /**
     * Verifica si el logging verbose está habilitado.
     */
    isVerboseLogging(): boolean {
        return this.config.behavior.verboseLogging;
    }

    /**
     * Guarda la configuración actual en el archivo.
     */
    async saveConfig(): Promise<void> {
        if (!this.configPath) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder to save configuration');
            }
            this.configPath = path.join(
                workspaceFolders[0].uri.fsPath,
                '.unit-test-agent.config.json'
            );
        }

        await fs.writeFile(
            this.configPath,
            JSON.stringify(this.config, null, 2),
            'utf-8'
        );
        
        console.log(`Configuration saved to: ${this.configPath}`);
    }

    /**
     * Actualiza un valor de configuración.
     */
    updateConfig(path: string[], value: any): void {
        let current: any = this.config;
        
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        
        current[path[path.length - 1]] = value;
    }
}
