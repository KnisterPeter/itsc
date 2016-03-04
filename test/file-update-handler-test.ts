import { assert } from 'chai';

import { TSDI } from 'tsdi';
import { FileUpdateHandler } from '../src/file-update-handler';

describe('FileUpdateHandler', () => {

  let tsdi: TSDI;

  class DependencyManagerMock {
    public files: any = {};

    public getDependents(): string[] {
      return ['dependent-file'];
    }
  }

  class EmitterMock {
    public _checkFile: string;
    public _emitFile: string;

    public checkFile(file: string): void {
      this._checkFile = file;
    }

    public emitFile(file: string): void {
      this._emitFile = file;
    }
  }

  before(() => {
    tsdi = new TSDI();
    tsdi.register(DependencyManagerMock, 'DependencyManager');
    tsdi.register(EmitterMock, 'Emitter');
    tsdi.register(FileUpdateHandler);
  });

  it('should add new file to the dependency manager', () => {
    const fileUpdateHandler = tsdi.get(FileUpdateHandler);
    fileUpdateHandler.onFileUpdate('new-file');
    assert.deepEqual(tsdi.get(DependencyManagerMock).files['new-file'], {version: 1});
  });

  it('should call emitter for changed file', () => {
    const fileUpdateHandler = tsdi.get(FileUpdateHandler);
    fileUpdateHandler.onFileUpdate('file');
    assert.equal(tsdi.get(EmitterMock)._emitFile, 'file');
  });

  it('should check dependents on file change', () => {
    const fileUpdateHandler = tsdi.get(FileUpdateHandler);
    fileUpdateHandler.onFileUpdate('file');
    assert.equal(tsdi.get(EmitterMock)._checkFile, 'dependent-file');
  });
});
