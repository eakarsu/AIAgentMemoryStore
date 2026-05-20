const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'subjects', fields: ['name','type','fact_count','status'] });
