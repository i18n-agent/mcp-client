export interface InstallConfig {
  apiKey: string;
  serverUrl: string;
}

export interface InstallStatus {
  installed: boolean;
  configPath: string;
  details?: string;
}

export abstract class BaseInstaller {
  abstract install(config: InstallConfig): Promise<void>;
  abstract checkStatus(): Promise<InstallStatus>;
  abstract uninstall(): Promise<void>;
}