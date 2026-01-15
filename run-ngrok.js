// Simple helper: start ngrok tunnel to local port and print the https URL
const ngrok = require('ngrok');
const { spawn } = require('child_process');

const port = process.env.PORT || 5500;

(async () => {
  try{
    // ensure server is running - user should start `npm start` in a separate shell
    const url = await ngrok.connect({ addr: Number(port) });
    console.log('ngrok tunnel open at', url);
    console.log('Press Ctrl+C to stop');
  }catch(err){
    console.error('ngrok error:', err.message || err);
    process.exit(1);
  }
})();
