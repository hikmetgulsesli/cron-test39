#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('cron-test39')
  .description('Cron test utility for scheduling and testing cron jobs')
  .version('1.5.39');

program
  .option('-c, --config <path>', 'path to configuration file')
  .option('-v, --verbose', 'enable verbose output')
  .action((options) => {
    console.log('Running cron-test39...');
    if (options.verbose) {
      console.log('Verbose mode enabled');
    }
    if (options.config) {
      console.log(`Config file: ${options.config}`);
    }
  });

program.parse();
