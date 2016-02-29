import * as ts from 'typescript';
import * as path from 'path';
import { Component, Inject } from 'tsdi';

import { LanguageServiceProvider } from './language-service-provider';
import { FileWatchService } from './file-watch-service';

export type VersionedFileMap = ts.Map<{ version: number }>;

@Component()
export class DependencyManager {

  @Inject()
  private languageServiceProvider: LanguageServiceProvider;

  @Inject('FileWatchService')
  private fileWatchService: FileWatchService;

  private allFiles: FileDependencyMap = {};

  public files: VersionedFileMap = {};

  public addEntryPoint(fileName: string): void {
    this.allFiles[fileName] = new FileDependency(fileName);
    this.files[fileName] = { version: 0 };
  }

  private isNodeImportDeclaration(node: ts.Node): node is ts.ImportDeclaration {
    return node.kind === ts.SyntaxKind.ImportDeclaration;
  }

  private getDependenciesFromAST(fileName: string): string[] {
    const dependencies: string[] = [];
    const traverse = (node: ts.Node): void => {
      if (this.isNodeImportDeclaration(node)) {
        let filepath = node.moduleSpecifier.getText();
        filepath = filepath.substring(1, filepath.length - 1);
        if (filepath.charAt(0) === '.') {
          filepath = path.resolve(path.dirname(node.getSourceFile().fileName), `${filepath}.ts`);
        }
        dependencies.push(filepath);
      }
    };
    ts.forEachChild(this.languageServiceProvider.getLanguageService()
      .getSourceFile(path.relative(process.cwd(), fileName)), traverse);
    return dependencies;
  }

  private addNewDependencies(file: FileDependency, dependencies: string[]): void {
    dependencies.forEach(dependency => {
      const fullPath = path.resolve(process.cwd(), dependency);
      let dependencyFile = this.allFiles[fullPath];
      if (!dependencyFile) {
        dependencyFile = new FileDependency(fullPath);
        this.allFiles[fullPath] = dependencyFile;
      }
      file.addDependency(dependencyFile);

      if (!this.files[fullPath]) {
          this.files[fullPath] = { version: 0 };
      }
      this.fileWatchService.watchFile(fullPath);
    });
  }

  private removeObsolteDependencies(file: FileDependency, dependencies: string[]): void {
    file.dependencies.forEach(dependency => {
      if (dependencies.indexOf(dependency) == -1) {
        let dependentFile = this.allFiles[dependency];
        file.removeDependency(dependentFile);
        if (dependentFile.dependends.length == 0) {
          delete this.allFiles[dependency];
          if (this.files[dependency]) {
              delete this.files[dependency];
          }
          this.fileWatchService.unwatchFile(dependency);
        }
      }
    });
  }

  public updateDependencies(fileName: string): void {
    const file = this.allFiles[fileName];
    if (file) {
      const dependencies: string[] = this.getDependenciesFromAST(fileName);
      this.addNewDependencies(file, dependencies);
      this.removeObsolteDependencies(file, dependencies);
    }
  }

  public getDependents(fileName: string): string[] {
    return this.allFiles[fileName] ? this.allFiles[fileName].dependends : [];
  }

}

type FileDependencyMap = { [name: string]: FileDependency };

class FileDependency {

  private name: string;

  private _dependends: FileDependencyMap;

  private _dependencies: FileDependencyMap;

  constructor(name: string) {
    this.name = name;
    this._dependends = {};
    this._dependencies = {};
  }

  public get dependends(): string[] {
    return Object.keys(this._dependends);
  }

  public get dependencies(): string[] {
    return Object.keys(this._dependencies);
  }

  public addDependency(file: FileDependency): void {
    if (!this._dependencies[file.name]) {
      file._dependends[this.name] = this;
      this._dependencies[file.name] = file;
    }
  }

  public removeDependency(file: FileDependency): void {
    if (this._dependencies[file.name]) {
      delete file._dependends[this.name];
      delete this._dependencies[file.name];
    }
  }

}
