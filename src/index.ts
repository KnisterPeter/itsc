import * as minimist from 'minimist';
import { Compiler } from './compiler';

const argv = (minimist as any)(process.argv.slice(2), {
  boolean: ['watch'],
  default: {
    watch: false
  }
});
Compiler.create(argv._[0], argv);
