const mongoose = require('mongoose');
require('dotenv').config();

const Visitor = require('./models/Visitor');
const Application = require('./models/Application');
const Transaction = require('./models/Transaction');
const AnalyticsEvent = require('./models/AnalyticsEvent');
const Counter = require('./models/Counter');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB');

  await Visitor.deleteMany({});
  console.log('Deleted all visitors');

  await Application.deleteMany({});
  console.log('Deleted all applications');

  await Transaction.deleteMany({});
  console.log('Deleted all transactions');

  await AnalyticsEvent.deleteMany({});
  console.log('Deleted all analytics events');

  // Reset counters
  await Counter.findOneAndUpdate({ name: 'visitorId' }, { value: 0 }, { upsert: true });
  console.log('Reset visitorId counter to 0 (next is VIS001)');

  await Counter.findOneAndUpdate({ name: 'applicationId' }, { value: 500900 }, { upsert: true });
  console.log('Reset applicationId counter to 500900 (next is 500901)');

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
