const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'retention_policies', fields: ['name','days','applies_to','status'] });
