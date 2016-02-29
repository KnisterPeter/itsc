import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { Component, Inject } from 'tsdi';

@Component()
export class LanguageServiceProvider {

  @Inject({name: 'LanguageServiceProvider.entryPoint'})
  private entryPoint: string;

  @Inject({name: 'LanguageServiceProvider.options'})
  private options: ts.CompilerOptions;

  @Inject({name: 'LanguageServiceProvider.getScriptVersion'})
  private getScriptVersion: (fileName: string) => string;

  private languageServiceHost: ts.LanguageServiceHost;

  private languageService: ts.LanguageService;

  private getLanguageServiceHost(): ts.LanguageServiceHost {
    if (!this.languageServiceHost) {
      this.languageServiceHost = {
        getScriptFileNames: (): string[] => [this.entryPoint],
        getScriptVersion: (fileName): string => {
          const fullPath = path.resolve(process.cwd(), fileName);
          return this.getScriptVersion(fullPath);
        },
        getScriptSnapshot: (fileName): ts.IScriptSnapshot => {
          if (!fs.existsSync(fileName)) {
            return undefined;
          }
          return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
        },
        getCurrentDirectory: (): string => process.cwd(),
        getCompilationSettings: (): ts.CompilerOptions => this.options,
        getDefaultLibFileName: (_options: ts.CompilerOptions): string => ts.getDefaultLibFilePath(_options),
      };
    }
    return this.languageServiceHost;
  }

  public getLanguageService(): ts.LanguageService {
    if (!this.languageService) {
      this.languageService = ts.createLanguageService(this.getLanguageServiceHost(), ts.createDocumentRegistry());
    }
    return this.languageService;
  }

}
