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

  public emitFile(fileName: string): void {
    const services = this.languageServiceProvider.getLanguageService();
    const relFileName = path.relative(process.cwd(), fileName);
    const output = services.getEmitOutput(relFileName);
    const allDiagnostics = services.getCompilerOptionsDiagnostics()
      .concat(services.getSyntacticDiagnostics(relFileName))
      .concat(services.getSemanticDiagnostics(relFileName));
    if (allDiagnostics.length > 0 || output.emitSkipped) {
      this.logErrors(allDiagnostics, services);
    } else {
      output.outputFiles.forEach(o => {
        if (this.options.listFiles) {
          console.log(`Emitting ${o.name}`);
        }
        // console.log('------------------------------------------------');
        // console.log(o.text);
        // console.log('------------------------------------------------');
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
