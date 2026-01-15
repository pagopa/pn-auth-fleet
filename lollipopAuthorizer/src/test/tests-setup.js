// src/test/tests-setup.js
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const path = require('path');

// Questo risolve il percorso partendo dalla posizione di questo file
//dotenv.config({ path: '.env.test' });

console.log("Variabili caricate da:", path.resolve(__dirname, '.env.test'));
const envPath = path.resolve(__dirname, '.env.test');

const myEnv = dotenv.config({ path: envPath, override: true});
dotenvExpand.expand(myEnv);
if (myEnv.error) {
    console.error("Errore critico: Impossibile caricare .env.test da " + envPath);
    process.exit(1); // Ferma tutto se il file manca
} else {
    console.log("Variabili caricate correttamente da: " + envPath);
}