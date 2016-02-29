import { Component, Inject } from 'tsdi';

import { DependencyManager } from './dependency-manager';
import { Emitter } from './emitter';

@Component()
export class FileUpdateHandler {

  @Inject()
  private dependencyManager: DependencyManager;

  @Inject()
  private emitter: Emitter;

  public onFileUpdate(fileName: string): void {
    if (!this.dependencyManager.files[fileName]) {
        this.dependencyManager.files[fileName] = { version: 0 };
    }
    this.dependencyManager.files[fileName].version++;
    this.emitter.emitFile(fileName);
    // TODO: Just check files (not emit)
    this.dependencyManager.getDependents(fileName)
      .forEach(dependent => this.emitter.emitFile(dependent));
  }

}
