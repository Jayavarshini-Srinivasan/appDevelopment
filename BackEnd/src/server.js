const app = require('./app');
require('dotenv').config();

const PORT = 5002; // process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`🚀 RapidAid Backend running on port ${PORT}`);
});

