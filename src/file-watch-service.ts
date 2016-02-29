import * as path from 'path';
import { Component, Initialize, Inject } from 'tsdi';
import { FSWatcher } from 'chokidar';

import { FileUpdateHandler } from './file-update-handler';

type FileMap = { [name: string]: boolean };
type WatcherMap = { [name: string]: number };

@Component()
export class FileWatchService {

  @Inject()
  private watcher: FSWatcher;

  @Inject('FileUpdateHandler')
  private fileUpdateHandler: FileUpdateHandler;

  @Inject({name: 'FileWatchService.enabled'})
  private enabled: boolean;

  private watchers: WatcherMap = {};

  private files: FileMap = {};

  @Initialize()
  public init(): void {
    if (this.enabled) {
      this.watcher = this.watcher
        .on('add', (fileName) => this.onChange(fileName))
        .on('change', (fileName) => this.onChange(fileName))
        .on('unlink', (fileName) => this.onUnlink(fileName));
    }
  }

  private onChange(fileName: string): void {
    if (this.files[fileName]) {
      this.fileUpdateHandler.onFileUpdate(fileName);
    }
  }

  private onUnlink(fileName: string): void {
    delete this.files[fileName];
    const dir = path.dirname(fileName);
    this.watchers[dir]--;
    this.unwatchDirectory(dir);
  }

  public watchFile(fileName: string): void {
    const dir = path.dirname(fileName);
    if (!this.watchers[dir]) {
      this.watchers[dir] = 0;
      if (this.enabled) {
        this.watcher.add(dir);
      }
    }
    if (!this.files[fileName]) {
      this.files[fileName] = true;
      this.watchers[dir]++;
    }
  }

  public unwatchFile(fileName: string): void {
    const dir = path.dirname(fileName);
    if (this.files[fileName]) {
      delete this.files[fileName];
      this.watchers[dir]--;
    }
    this.unwatchDirectory(dir);
  }

  private unwatchDirectory(dirName: string): void {
    if (!this.watchers[dirName]) {
      delete this.watchers[dirName];
      if (this.enabled) {
        this.watcher.unwatch(dirName);
      }
    }
  }

}
