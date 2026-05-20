const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'extractors', fields: ['name','version','model','status','last_run'] });
