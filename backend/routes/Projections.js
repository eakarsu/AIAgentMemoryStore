const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'projections', fields: ['name','schema_desc','status'] });
