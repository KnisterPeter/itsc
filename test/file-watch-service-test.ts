import { assert } from 'chai';

import { TSDI } from 'tsdi';
import { FileWatchService } from '../src/file-watch-service';

class FSWatcherMock {
  public onCalls: string[] = [];
  private onAdd: Function;
  private onChange: Function;
  private onUnlink: Function;
  public addCalls: string[] = [];
  public unwatchCalls: string[] = [];

  public on(name: string, fn: Function): FSWatcherMock {
    this.onCalls.push(name);
    if (name === 'add') {
      this.onAdd = fn;
    } else if (name === 'change') {
      this.onChange = fn;
    } else if (name === 'unlink') {
      this.onUnlink = fn;
    }
    return this;
  }

  public emit(event: string, fileName: string): void {
    if (event === 'add') {
      this.onAdd(fileName);
    } else if (event === 'change') {
      this.onChange(fileName);
    } else if (event === 'unlink') {
      this.onUnlink(fileName);
    }
  }

  public add(dir: string): void {
    this.addCalls.push(dir);
  }

  public unwatch(dir: string): void {
    this.unwatchCalls.push(dir);
  }
}

class FileUpdateHandlerMock {
  public name: string;
  public onFileUpdate(name: string): void {
    this.name = name;
  }
}

describe('FileWatchService', () => {
  let tsdi: TSDI;

  beforeEach(() => {
    tsdi = new TSDI();
    tsdi.register(FileWatchService);
    tsdi.register(FSWatcherMock, 'FSWatcher');
    tsdi.register(FileUpdateHandlerMock, 'FileUpdateHandler');
    tsdi.addProperty('FileWatchService.enabled', true);
  });

  it('should not register callbacks on the watcher if disabled', () => {
    tsdi.addProperty('FileWatchService.enabled', false);

    tsdi.get(FileWatchService);
    assert.deepEqual(tsdi.get(FSWatcherMock).onCalls, []);
  });

  it('should register callbacks on the watcher if enabled', () => {
    tsdi.get(FileWatchService);
    assert.deepEqual(tsdi.get(FSWatcherMock).onCalls, ['add', 'change', 'unlink']);
  });

  it('should ignore changes of new files not on the watch list', () => {
    tsdi.get(FileWatchService);
    tsdi.get(FSWatcherMock).emit('add', 'new-file');
    assert.equal(tsdi.get(FileUpdateHandlerMock).name, undefined);
  });

  it('should ignore changes of existing files not on the watch list', () => {
    tsdi.get(FileWatchService);
    tsdi.get(FSWatcherMock).emit('change', 'changed-file');
    assert.equal(tsdi.get(FileUpdateHandlerMock).name, undefined);
  });

  it('should ignore removals of existing files not on the watch list', () => {
    tsdi.get(FileWatchService);
    tsdi.get(FSWatcherMock).emit('unlink', 'removed-file');
    assert.equal(tsdi.get(FileUpdateHandlerMock).name, undefined);
  });

  it('should register folders with new files to the watcher', () => {
    const fileWatchService = tsdi.get(FileWatchService);
    fileWatchService.watchFile('dir/new-file');
    assert.deepEqual(tsdi.get(FSWatcherMock).addCalls, ['dir']);
  });

  it('should remove folders from the watcher if no watched files left', () => {
    const fileWatchService = tsdi.get(FileWatchService);
    fileWatchService.unwatchFile('dir/file');
    assert.deepEqual(tsdi.get(FSWatcherMock).unwatchCalls, ['dir']);
  });

  it('should keep watching folders if watched files left', () => {
    const fileWatchService = tsdi.get(FileWatchService);
    fileWatchService.watchFile('dir/file1');
    fileWatchService.watchFile('dir/file2');
    tsdi.get(FSWatcherMock).emit('unlink', 'dir/file1');
    assert.deepEqual(tsdi.get(FSWatcherMock).unwatchCalls, []);
  });

  it('should notify if watched file changes', () => {
    const fileWatchService = tsdi.get(FileWatchService);
    fileWatchService.watchFile('dir/file');
    tsdi.get(FSWatcherMock).emit('change', 'dir/file');
    assert.equal(tsdi.get(FileUpdateHandlerMock).name, 'dir/file');
  });
});
