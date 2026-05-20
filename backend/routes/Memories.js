const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'memories', fields: ['subject','event_text','tags','status','embedded_at'] });
