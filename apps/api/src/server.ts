import { app } from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Multi-Gym API server listening on port ${PORT}`);
});
