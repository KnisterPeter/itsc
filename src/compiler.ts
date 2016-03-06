import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { TSDI, Factory, Component } from 'tsdi';
import { FSWatcher } from 'chokidar';

import { LanguageServiceProvider } from './language-service-provider';
import { FileWatchService } from './file-watch-service';
import { DependencyManager } from './dependency-manager';
import { Emitter } from './emitter';

@Component()
class ComponentFactory {

  @Factory({name: 'FSWatcher'})
  public createFileWatcher(): FSWatcher {
    return new FSWatcher();
  }
}

export class Compiler {

  private fileWatchService: FileWatchService;

  private languageServiceProvider: LanguageServiceProvider;

  private dependencyManager: DependencyManager;

  private emitter: Emitter;

  private static findTsConfig(file: string): string {
    const dir = path.dirname(file);
    const test = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(test)) {
      return test;
    }
    return Compiler.findTsConfig(dir);
  }

  private static getTsOptions(fileName: string): ts.CompilerOptions {
    const config = ts.readConfigFile(Compiler.findTsConfig(fileName),
      filePath => fs.readFileSync(filePath).toString()).config;
    return config.compilerOptions
      ? config.compilerOptions
      : ts.getDefaultCompilerOptions();
  }

  public static create(entryPoint: string, options: any): Compiler {
    return new Compiler(entryPoint, options, Compiler.getTsOptions(entryPoint));
  }

  constructor(entryPoint: string, options: any, tsOptions: ts.CompilerOptions) {
    const watch = tsOptions.watch || options.watch;
    tsOptions.watch = false;

    const tsdi = new TSDI();
    tsdi.enableComponentScanner();
    tsdi.addProperty('ts.CompilerOptions', tsOptions);
    tsdi.addProperty('FileWatchService.enabled', watch);
    tsdi.addProperty('LanguageServiceProvider.entryPoint', entryPoint);
    tsdi.addProperty('LanguageServiceProvider.options', tsOptions);
    tsdi.addProperty('LanguageServiceProvider.getScriptVersion',
      (fileName: string) => this.getScriptVersion(fileName));

    this.fileWatchService = tsdi.get(FileWatchService);
    this.languageServiceProvider = tsdi.get(LanguageServiceProvider);
    this.dependencyManager = tsdi.get(DependencyManager);
    this.emitter = tsdi.get(Emitter);

    const fileName = path.resolve(process.cwd(), entryPoint);
    this.dependencyManager.addEntryPoint(fileName);

    if (watch) {
      this.fileWatchService.watchFile(fileName);
    } else {
      this.languageServiceProvider.getLanguageService().getProgram().getSourceFiles().forEach(sourceFile => {
        this.emitter.emitFile(path.resolve(process.cwd(), sourceFile.fileName));
      });
    }
  }

  private getScriptVersion(fileName: string): string {
    const files = this.dependencyManager.files;
    return files[fileName] && files[fileName].version.toString();
  }

}
