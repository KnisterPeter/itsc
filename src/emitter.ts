import * as ts from 'typescript';
import * as path from 'path';
import { Component, Inject } from 'tsdi';

import { LanguageServiceProvider } from './language-service-provider';
import { DependencyManager } from './dependency-manager';

@Component()
export class Emitter {

  @Inject()
  private languageServiceProvider: LanguageServiceProvider;

  @Inject()
  private dependencyManager: DependencyManager;

  @Inject({name: 'ts.CompilerOptions'})
  private options: ts.CompilerOptions;

  private parse(fileName: string): { success: boolean, output: ts.EmitOutput } {
    const services = this.languageServiceProvider.getLanguageService();
    const relFileName = path.relative(process.cwd(), fileName);
    const output = services.getEmitOutput(relFileName);
    const allDiagnostics = services.getCompilerOptionsDiagnostics()
      .concat(services.getSyntacticDiagnostics(relFileName))
      .concat(services.getSemanticDiagnostics(relFileName));
    const success = !(allDiagnostics.length > 0 || output.emitSkipped);
    if (!success) {
      this.logErrors(allDiagnostics, services);
    }
    return { success, output };
  }

  public checkFile(fileName: string): void {
    console.log('Checking', fileName);
    this.parse(fileName);
  }

  public emitFile(fileName: string): void {
    const { success, output } = this.parse(fileName);
    if (success) {
      output.outputFiles.forEach(o => {
        if (this.options.listFiles) {
          console.log(`Emitting ${o.name}`);
        }
        // console.log(o.text);
      });
    }
    this.dependencyManager.updateDependencies(fileName);
  }

  private logErrors(allDiagnostics: ts.Diagnostic[], services: ts.LanguageService): void {
    allDiagnostics.forEach(diagnostic => {
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        console.log(`  Error ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.log(`  Error: ${message}`);
      }
    });
  }
}
